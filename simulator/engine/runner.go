package engine

import (
	"case1/simulator/client"
	"case1/simulator/config"
	"case1/simulator/seed"
	"log"
	"sync"
	"sync/atomic"
	"time"
)

type Runner struct {
	mu             sync.RWMutex
	running        bool
	generators     map[string]*Generator
	anomalyManager *AnomalyManager
	backendClient  *client.BackendClient
	ticker         *time.Ticker
	stopChan       chan struct{}
	startedAt      time.Time
	lastTickAt     time.Time

	// Metrics counters (atomic)
	tickCount     int64
	metricsSent   int64
	metricsFailed int64
	lastTickDurMs int64
	avgTickDurMs  int64 // exponential moving average
	lastBackendMs int64
}

func NewRunner() *Runner {
	generators := make(map[string]*Generator)
	for _, s := range seed.Stations {
		generators[s.Code] = NewGenerator(s)
	}

	return &Runner{
		generators:     generators,
		anomalyManager: NewAnomalyManager(),
		backendClient:  client.NewBackendClient(),
		stopChan:       make(chan struct{}),
	}
}

func (r *Runner) Start() {
	r.mu.Lock()
	if r.running {
		r.mu.Unlock()
		return
	}
	r.running = true
	select {
	case <-r.stopChan:
		r.stopChan = make(chan struct{})
	default:
	}
	r.startedAt = time.Now()
	atomic.StoreInt64(&r.tickCount, 0)
	atomic.StoreInt64(&r.metricsSent, 0)
	atomic.StoreInt64(&r.metricsFailed, 0)
	r.mu.Unlock()

	tickMs := config.AppConfig.TickIntervalMs
	if tickMs < 500 {
		tickMs = 3000
	}
	r.ticker = time.NewTicker(time.Duration(tickMs) * time.Millisecond)

	log.Printf("▶️  Simulator started with %d stations (tick: %dms)", len(r.generators), tickMs)

	go r.loop()
}

func (r *Runner) loop() {
	for {
		select {
		case <-r.ticker.C:
			r.tick()
		case <-r.stopChan:
			r.ticker.Stop()
			return
		}
	}
}

func (r *Runner) Stop() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if !r.running {
		return
	}
	r.running = false
	select {
	case <-r.stopChan:
	default:
		close(r.stopChan)
	}
	log.Println("⏹️  Simulator stopped")
}

func (r *Runner) IsRunning() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.running
}

func (r *Runner) SetTickInterval(ms int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if ms < 500 {
		ms = 500
	}
	if ms > 30000 {
		ms = 30000
	}
	config.AppConfig.TickIntervalMs = ms
	if r.running && r.ticker != nil {
		r.ticker.Reset(time.Duration(ms) * time.Millisecond)
		log.Printf("🔄 Tick interval changed to %dms", ms)
	}
}

func (r *Runner) tick() {
	start := time.Now()
	r.mu.Lock()
	r.lastTickAt = start
	r.mu.Unlock()

	// Cleanup expired anomalies and broadcast if any expired
	expired := r.anomalyManager.Cleanup()
	if len(expired) > 0 {
		for _, e := range expired {
			BroadcastEvent(SimulatorEvent{
				Type:      "anomaly_expired",
				Timestamp: time.Now(),
				Payload:   e,
			})
		}
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	var failures int64
	var successes int64
	var totalLatency int64

	for _, station := range seed.Stations {
		wg.Add(1)
		go func(st seed.SimStation) {
			defer wg.Done()

			gen := r.generators[st.Code]
			payload := gen.Generate()

			if anomaly := r.anomalyManager.Get(st.Code); anomaly != nil {
				payload = r.anomalyManager.ApplyAnomaly(st, payload, anomaly)
			}

			postStart := time.Now()
			err := r.backendClient.PostMetric(st.ID.String(), payload)
			latency := time.Since(postStart).Milliseconds()

			mu.Lock()
			if err != nil {
				failures++
				log.Printf("Failed to post metric for %s: %v", st.Code, err)
			} else {
				successes++
				totalLatency += latency
			}
			mu.Unlock()
		}(station)
	}

	wg.Wait()

	atomic.AddInt64(&r.tickCount, 1)
	atomic.AddInt64(&r.metricsSent, successes)
	atomic.AddInt64(&r.metricsFailed, failures)

	tickDur := time.Since(start).Milliseconds()
	atomic.StoreInt64(&r.lastTickDurMs, tickDur)

	// Update exponential moving average of tick duration (alpha = 0.1)
	oldAvg := atomic.LoadInt64(&r.avgTickDurMs)
	if oldAvg == 0 {
		atomic.StoreInt64(&r.avgTickDurMs, tickDur)
	} else {
		newAvg := (oldAvg*9 + tickDur) / 10
		atomic.StoreInt64(&r.avgTickDurMs, newAvg)
	}

	if successes > 0 {
		avgLat := totalLatency / successes
		atomic.StoreInt64(&r.lastBackendMs, avgLat)
	}

	// Broadcast tick complete event
	BroadcastEvent(SimulatorEvent{
		Type:      "tick_complete",
		Timestamp: time.Now(),
		Payload: TickSummary{
			TickNumber:       atomic.LoadInt64(&r.tickCount),
			StationsSent:     int(successes),
			StationsFailed:   int(failures),
			TickDurationMs:   tickDur,
			BackendLatencyMs: atomic.LoadInt64(&r.lastBackendMs),
		},
	})
}

func (r *Runner) InjectAnomaly(stationCode string, anomalyType AnomalyType, durationSec int) {
	r.anomalyManager.Inject(stationCode, anomalyType, durationSec)
	log.Printf("💉 Injected %s into %s for %d seconds", anomalyType, stationCode, durationSec)

	BroadcastEvent(SimulatorEvent{
		Type:      "anomaly_injected",
		Timestamp: time.Now(),
		Payload: AnomalyHistoryEntry{
			StationCode: stationCode,
			AnomalyType: anomalyType,
			DurationSec: durationSec,
			InjectedAt:  time.Now(),
		},
	})
}

func (r *Runner) GetStatus() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	activeAnomalies := r.anomalyManager.ListActive()
	activeMap := make(map[string]interface{})
	for code, anomaly := range activeAnomalies {
		activeMap[code] = map[string]interface{}{
			"type":              anomaly.Type,
			"remaining_seconds": anomaly.RemainingSeconds(),
			"duration_sec":      anomaly.DurationSec,
			"injected_at":       anomaly.InjectedAt.Format(time.RFC3339),
			"expires_at":        anomaly.ExpiresAt.Format(time.RFC3339),
		}
	}

	var uptimeSec int64
	if !r.startedAt.IsZero() {
		uptimeSec = int64(time.Since(r.startedAt).Seconds())
	}

	var lastTickStr string
	if !r.lastTickAt.IsZero() {
		lastTickStr = r.lastTickAt.Format(time.RFC3339)
	}

	return map[string]interface{}{
		"running":                 r.running,
		"tick_interval_ms":        config.AppConfig.TickIntervalMs,
		"station_count":           len(r.generators),
		"tick_count":              atomic.LoadInt64(&r.tickCount),
		"metrics_sent":            atomic.LoadInt64(&r.metricsSent),
		"metrics_failed":          atomic.LoadInt64(&r.metricsFailed),
		"uptime_seconds":          uptimeSec,
		"last_tick_at":            lastTickStr,
		"last_tick_duration_ms":   atomic.LoadInt64(&r.lastTickDurMs),
		"avg_tick_duration_ms":    atomic.LoadInt64(&r.avgTickDurMs),
		"last_backend_latency_ms": atomic.LoadInt64(&r.lastBackendMs),
		"active_anomalies":        activeMap,
		"anomaly_history":         r.anomalyManager.GetHistory(),
		"backend_url":             config.AppConfig.BackendURL,
	}
}

func (r *Runner) GetStations() []seed.SimStation {
	return seed.Stations
}

// TickSummary is broadcast on each tick completion
type TickSummary struct {
	TickNumber       int64 `json:"tick_number"`
	StationsSent     int   `json:"stations_sent"`
	StationsFailed   int   `json:"stations_failed"`
	TickDurationMs   int64 `json:"tick_duration_ms"`
	BackendLatencyMs int64 `json:"backend_latency_ms"`
}
