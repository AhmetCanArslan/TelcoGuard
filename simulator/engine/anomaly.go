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

type ActiveAnomaly struct {
	Type      AnomalyType
	ExpiresAt time.Time
}

type AnomalyManager struct {
	mu        sync.RWMutex
	anomalies map[string]*ActiveAnomaly // station_code -> anomaly
}

func NewAnomalyManager() *AnomalyManager {
	return &AnomalyManager{
		anomalies: make(map[string]*ActiveAnomaly),
	}
}

func (am *AnomalyManager) Inject(stationCode string, anomalyType AnomalyType, durationSec int) {
	am.mu.Lock()
	defer am.mu.Unlock()

	am.anomalies[stationCode] = &ActiveAnomaly{
		Type:      anomalyType,
		ExpiresAt: time.Now().Add(time.Duration(durationSec) * time.Second),
	}
}

func (am *AnomalyManager) Get(stationCode string) *ActiveAnomaly {
	am.mu.RLock()
	defer am.mu.RUnlock()

	anomaly, ok := am.anomalies[stationCode]
	if !ok {
		return nil
	}

	if time.Now().After(anomaly.ExpiresAt) {
		return nil
	}

	return anomaly
}

func (am *AnomalyManager) Cleanup() {
	am.mu.Lock()
	defer am.mu.Unlock()

	now := time.Now()
	for code, anomaly := range am.anomalies {
		if now.After(anomaly.ExpiresAt) {
			delete(am.anomalies, code)
		}
	}
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

func (am *AnomalyManager) ListActive() map[string]AnomalyType {
	am.mu.RLock()
	defer am.mu.RUnlock()

	result := make(map[string]AnomalyType)
	now := time.Now()
	for code, anomaly := range am.anomalies {
		if now.Before(anomaly.ExpiresAt) {
			result[code] = anomaly.Type
		}
	}
	return result
}
