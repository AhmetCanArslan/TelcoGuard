package engine

import (
	"case1/simulator/client"
	"case1/simulator/seed"
	"math/rand"
	"sync"
	"time"
)

type AnomalyType string

const (
	AnomalyCPU_SPIKE     AnomalyType = "CPU_SPIKE"
	AnomalyUSER_DROP     AnomalyType = "USER_DROP"
	AnomalyLATENCY_BURST AnomalyType = "LATENCY_BURST"
	AnomalyPACKET_STORM  AnomalyType = "PACKET_STORM"
	AnomalySTATION_DOWN  AnomalyType = "STATION_DOWN"
)

var ValidAnomalyTypes = []AnomalyType{
	AnomalyCPU_SPIKE,
	AnomalyUSER_DROP,
	AnomalyLATENCY_BURST,
	AnomalyPACKET_STORM,
	AnomalySTATION_DOWN,
}

func IsValidAnomalyType(t AnomalyType) bool {
	for _, v := range ValidAnomalyTypes {
		if v == t {
			return true
		}
	}
	return false
}

type ActiveAnomaly struct {
	Type        AnomalyType `json:"type"`
	StationCode string      `json:"station_code"`
	DurationSec int         `json:"duration_sec"`
	InjectedAt  time.Time   `json:"injected_at"`
	ExpiresAt   time.Time   `json:"expires_at"`
}

func (a *ActiveAnomaly) RemainingSeconds() int {
	remaining := time.Until(a.ExpiresAt)
	if remaining <= 0 {
		return 0
	}
	return int(remaining.Seconds())
}

type AnomalyHistoryEntry struct {
	StationCode string      `json:"station_code"`
	AnomalyType AnomalyType `json:"anomaly_type"`
	DurationSec int         `json:"duration_sec"`
	InjectedAt  time.Time   `json:"injected_at"`
	ExpiredAt   *time.Time  `json:"expired_at,omitempty"`
}

type AnomalyManager struct {
	mu         sync.RWMutex
	anomalies  map[string]map[AnomalyType]*ActiveAnomaly // station_code -> anomaly_type -> anomaly
	history    []AnomalyHistoryEntry
	maxHistory int
}

func NewAnomalyManager() *AnomalyManager {
	return &AnomalyManager{
		anomalies:  make(map[string]map[AnomalyType]*ActiveAnomaly),
		history:    make([]AnomalyHistoryEntry, 0),
		maxHistory: 50,
	}
}

func (am *AnomalyManager) Inject(stationCode string, anomalyType AnomalyType, durationSec int) {
	am.mu.Lock()
	defer am.mu.Unlock()

	if am.anomalies[stationCode] == nil {
		am.anomalies[stationCode] = make(map[AnomalyType]*ActiveAnomaly)
	}

	now := time.Now()
	if existing, ok := am.anomalies[stationCode][anomalyType]; ok && now.Before(existing.ExpiresAt) {
		existing.DurationSec += durationSec
		existing.ExpiresAt = existing.ExpiresAt.Add(time.Duration(durationSec) * time.Second)
		am.addHistoryEntryLocked(AnomalyHistoryEntry{
			StationCode: stationCode,
			AnomalyType: anomalyType,
			DurationSec: durationSec,
			InjectedAt:  now,
		})
		return
	}

	am.anomalies[stationCode][anomalyType] = &ActiveAnomaly{
		Type:        anomalyType,
		StationCode: stationCode,
		DurationSec: durationSec,
		InjectedAt:  now,
		ExpiresAt:   now.Add(time.Duration(durationSec) * time.Second),
	}

	am.addHistoryEntryLocked(AnomalyHistoryEntry{
		StationCode: stationCode,
		AnomalyType: anomalyType,
		DurationSec: durationSec,
		InjectedAt:  now,
	})
}

func (am *AnomalyManager) addHistoryEntryLocked(entry AnomalyHistoryEntry) {
	am.history = append([]AnomalyHistoryEntry{entry}, am.history...)
	if len(am.history) > am.maxHistory {
		am.history = am.history[:am.maxHistory]
	}
}

func (am *AnomalyManager) Get(stationCode string) []*ActiveAnomaly {
	am.mu.RLock()
	defer am.mu.RUnlock()

	typeMap, ok := am.anomalies[stationCode]
	if !ok {
		return nil
	}

	var active []*ActiveAnomaly
	now := time.Now()
	for _, anomaly := range typeMap {
		if now.Before(anomaly.ExpiresAt) {
			active = append(active, anomaly)
		}
	}
	return active
}

func (am *AnomalyManager) Cleanup() []AnomalyHistoryEntry {
	am.mu.Lock()
	defer am.mu.Unlock()

	now := time.Now()
	var expired []AnomalyHistoryEntry

	for code, typeMap := range am.anomalies {
		for aType, anomaly := range typeMap {
			// Add a 2-second grace period to prevent premature cleanup
			// caused by clock skew between backend and frontend
			if now.After(anomaly.ExpiresAt.Add(2 * time.Second)) {
				expiredAt := now
				expired = append(expired, AnomalyHistoryEntry{
					StationCode: anomaly.StationCode,
					AnomalyType: anomaly.Type,
					DurationSec: anomaly.DurationSec,
					InjectedAt:  anomaly.InjectedAt,
					ExpiredAt:   &expiredAt,
				})
				delete(typeMap, aType)
			}
		}
		if len(typeMap) == 0 {
			delete(am.anomalies, code)
		}
	}
	return expired
}

func (am *AnomalyManager) ApplyAnomaly(station seed.SimStation, payload client.MetricPayload, anomaly *ActiveAnomaly) client.MetricPayload {
	switch anomaly.Type {
	case AnomalyCPU_SPIKE:
		payload.CpuUsage = 95 + rand.Float64()*5
		payload.MemoryUsage = 90 + rand.Float64()*8
	case AnomalyUSER_DROP:
		payload.ConnectedUsers = int(float64(payload.ConnectedUsers) * 0.2)
		if payload.ConnectedUsers < 5 {
			payload.ConnectedUsers = 5
		}
	case AnomalyLATENCY_BURST:
		payload.Latency = 200 + rand.Float64()*300
	case AnomalyPACKET_STORM:
		payload.PacketLoss = 15 + rand.Float64()*25
	case AnomalySTATION_DOWN:
		payload.CpuUsage = 0
		payload.MemoryUsage = 0
		payload.PacketLoss = 0
		payload.Latency = 0
		payload.Rssi = -120
		payload.ConnectedUsers = 0
	}

	// Clamp after anomaly
	if payload.CpuUsage > 100 {
		payload.CpuUsage = 100
	}
	if payload.MemoryUsage > 100 {
		payload.MemoryUsage = 100
	}
	if payload.PacketLoss > 100 {
		payload.PacketLoss = 100
	}
	if payload.ConnectedUsers > station.Capacity {
		payload.ConnectedUsers = station.Capacity
	}

	return payload
}

func (am *AnomalyManager) GetHistory() []AnomalyHistoryEntry {
	am.mu.RLock()
	defer am.mu.RUnlock()

	result := make([]AnomalyHistoryEntry, len(am.history))
	copy(result, am.history)
	return result
}

func (am *AnomalyManager) ListActive() []*ActiveAnomaly {
	am.mu.RLock()
	defer am.mu.RUnlock()

	var result []*ActiveAnomaly
	now := time.Now()
	for _, typeMap := range am.anomalies {
		for _, anomaly := range typeMap {
			if now.Before(anomaly.ExpiresAt) {
				result = append(result, &ActiveAnomaly{
					Type:        anomaly.Type,
					StationCode: anomaly.StationCode,
					DurationSec: anomaly.DurationSec,
					InjectedAt:  anomaly.InjectedAt,
					ExpiresAt:   anomaly.ExpiresAt,
				})
			}
		}
	}
	return result
}

func (am *AnomalyManager) ClearAll() {
	am.mu.Lock()
	defer am.mu.Unlock()
	am.anomalies = make(map[string]map[AnomalyType]*ActiveAnomaly)
}
