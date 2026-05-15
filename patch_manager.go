package main

import (
	"fmt"
	"io/ioutil"
	"strings"
)

func main() {
	path := "simulator/engine/anomaly.go"
	content, err := ioutil.ReadFile(path)
	if err != nil {
		panic(err)
	}
	s := string(content)

	// Update struct
	s = strings.Replace(s, "anomalies  map[string]*ActiveAnomaly // station_code -> anomaly", "anomalies  map[string]map[AnomalyType]*ActiveAnomaly // station_code -> anomaly_type -> anomaly", 1)

	// Update NewAnomalyManager
	s = strings.Replace(s, "anomalies:  make(map[string]*ActiveAnomaly),", "anomalies:  make(map[string]map[AnomalyType]*ActiveAnomaly),", 1)

	// Update Inject
	oldInject := `func (am *AnomalyManager) Inject(stationCode string, anomalyType AnomalyType, durationSec int) {
	am.mu.Lock()
	defer am.mu.Unlock()

	// If there's an existing active anomaly for this station, handle it
	if existing, ok := am.anomalies[stationCode]; ok && time.Now().Before(existing.ExpiresAt) {
		if existing.Type == anomalyType {
			// Extend existing anomaly time
			existing.DurationSec += durationSec
			existing.ExpiresAt = existing.ExpiresAt.Add(time.Duration(durationSec) * time.Second)
			
			// Record the injection as an extension in history
			am.addHistoryEntryLocked(AnomalyHistoryEntry{
				StationCode: stationCode,
				AnomalyType: anomalyType,
				DurationSec: durationSec,
				InjectedAt:  time.Now(),
			})
			return
		} else {
			// Mark old different anomaly as expired
			now := time.Now()
			am.addHistoryEntryLocked(AnomalyHistoryEntry{
				StationCode: existing.StationCode,
				AnomalyType: existing.Type,
				DurationSec: existing.DurationSec,
				InjectedAt:  existing.InjectedAt,
				ExpiredAt:   &now,
			})
		}
	}

	am.anomalies[stationCode] = &ActiveAnomaly{
		Type:        anomalyType,
		StationCode: stationCode,
		DurationSec: durationSec,
		InjectedAt:  time.Now(),
		ExpiresAt:   time.Now().Add(time.Duration(durationSec) * time.Second),
	}

	am.addHistoryEntryLocked(AnomalyHistoryEntry{
		StationCode: stationCode,
		AnomalyType: anomalyType,
		DurationSec: durationSec,
		InjectedAt:  time.Now(),
	})
}`

	newInject := `func (am *AnomalyManager) Inject(stationCode string, anomalyType AnomalyType, durationSec int) {
	am.mu.Lock()
	defer am.mu.Unlock()

	if am.anomalies[stationCode] == nil {
		am.anomalies[stationCode] = make(map[AnomalyType]*ActiveAnomaly)
	}

	if existing, ok := am.anomalies[stationCode][anomalyType]; ok && time.Now().Before(existing.ExpiresAt) {
		existing.DurationSec += durationSec
		existing.ExpiresAt = existing.ExpiresAt.Add(time.Duration(durationSec) * time.Second)
		am.addHistoryEntryLocked(AnomalyHistoryEntry{
			StationCode: stationCode,
			AnomalyType: anomalyType,
			DurationSec: durationSec,
			InjectedAt:  time.Now(),
		})
		return
	}

	am.anomalies[stationCode][anomalyType] = &ActiveAnomaly{
		Type:        anomalyType,
		StationCode: stationCode,
		DurationSec: durationSec,
		InjectedAt:  time.Now(),
		ExpiresAt:   time.Now().Add(time.Duration(durationSec) * time.Second),
	}

	am.addHistoryEntryLocked(AnomalyHistoryEntry{
		StationCode: stationCode,
		AnomalyType: anomalyType,
		DurationSec: durationSec,
		InjectedAt:  time.Now(),
	})
}`
	s = strings.Replace(s, oldInject, newInject, 1)

	// Update Get
	oldGet := `func (am *AnomalyManager) Get(stationCode string) *ActiveAnomaly {
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
}`
	newGet := `func (am *AnomalyManager) Get(stationCode string) []*ActiveAnomaly {
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
}`
	s = strings.Replace(s, oldGet, newGet, 1)

	// Update Cleanup
	oldCleanup := `func (am *AnomalyManager) Cleanup() []AnomalyHistoryEntry {
	am.mu.Lock()
	defer am.mu.Unlock()

	now := time.Now()
	var expired []AnomalyHistoryEntry

	for code, anomaly := range am.anomalies {
		if now.After(anomaly.ExpiresAt) {
			expiredAt := now
			expired = append(expired, AnomalyHistoryEntry{
				StationCode: anomaly.StationCode,
				AnomalyType: anomaly.Type,
				DurationSec: anomaly.DurationSec,
				InjectedAt:  anomaly.InjectedAt,
				ExpiredAt:   &expiredAt,
			})
			delete(am.anomalies, code)
		}
	}
	return expired
}`
	newCleanup := `func (am *AnomalyManager) Cleanup() []AnomalyHistoryEntry {
	am.mu.Lock()
	defer am.mu.Unlock()

	now := time.Now()
	var expired []AnomalyHistoryEntry

	for code, typeMap := range am.anomalies {
		for aType, anomaly := range typeMap {
			if now.After(anomaly.ExpiresAt) {
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
}`
	s = strings.Replace(s, oldCleanup, newCleanup, 1)

	// Update ListActive
	oldListActive := `func (am *AnomalyManager) ListActive() map[string]*ActiveAnomaly {
	am.mu.RLock()
	defer am.mu.RUnlock()

	result := make(map[string]*ActiveAnomaly)
	now := time.Now()
	for code, anomaly := range am.anomalies {
		if now.Before(anomaly.ExpiresAt) {
			// Return a copy without the mutex
			result[code] = &ActiveAnomaly{
				Type:        anomaly.Type,
				StationCode: anomaly.StationCode,
				DurationSec: anomaly.DurationSec,
				InjectedAt:  anomaly.InjectedAt,
				ExpiresAt:   anomaly.ExpiresAt,
			}
		}
	}
	return result
}`
	newListActive := `func (am *AnomalyManager) ListActive() []*ActiveAnomaly {
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
}`
	s = strings.Replace(s, oldListActive, newListActive, 1)

	err = ioutil.WriteFile(path, []byte(s), 0644)
	if err != nil {
		panic(err)
	}
	fmt.Println("Patched successfully!")
}
