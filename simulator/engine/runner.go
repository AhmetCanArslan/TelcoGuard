package engine

import (
	"case1/simulator/client"
	"case1/simulator/config"
	"case1/simulator/seed"
	"log"
	"sync"
	"time"
)

type Runner struct {
	mu              sync.RWMutex
	running         bool
	generators      map[string]*Generator
	anomalyManager  *AnomalyManager
	backendClient   *client.BackendClient
	ticker          *time.Ticker
	stopChan        chan bool
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
		stopChan:       make(chan bool),
	}
}

func (r *Runner) Start() {
	r.mu.Lock()
	if r.running {
		r.mu.Unlock()
		return
	}
	r.running = true
	r.mu.Unlock()

	tickMs := config.AppConfig.TickIntervalMs
	if tickMs < 1000 {
		tickMs = 3000
	}
	r.ticker = time.NewTicker(time.Duration(tickMs) * time.Millisecond)

	log.Printf("▶️  Simulator started with %d stations (tick: %dms)", len(r.generators), tickMs)

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
	close(r.stopChan)
	log.Println("⏹️  Simulator stopped")
}

func (r *Runner) IsRunning() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.running
}

func (r *Runner) tick() {
	r.anomalyManager.Cleanup()

	for _, station := range seed.Stations {
		gen := r.generators[station.Code]
		payload := gen.Generate()

		// Apply active anomaly if any
		if anomaly := r.anomalyManager.Get(station.Code); anomaly != nil {
			payload = r.anomalyManager.ApplyAnomaly(station, payload, anomaly)
		}

		// Send to backend
		if err := r.backendClient.PostMetric(station.ID.String(), payload); err != nil {
			log.Printf("Failed to post metric for %s: %v", station.Code, err)
		}
	}
}

func (r *Runner) InjectAnomaly(stationCode string, anomalyType AnomalyType, durationSec int) {
	r.anomalyManager.Inject(stationCode, anomalyType, durationSec)
	log.Printf("💉 Injected %s into %s for %d seconds", anomalyType, stationCode, durationSec)
}

func (r *Runner) GetStatus() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return map[string]interface{}{
		"running":           r.running,
		"station_count":     len(r.generators),
		"active_anomalies":  r.anomalyManager.ListActive(),
		"backend_url":       config.AppConfig.BackendURL,
	}
}
