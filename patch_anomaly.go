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

	oldCode := `	// If there's an existing active anomaly for this station, mark it as expired in history
	if existing, ok := am.anomalies[stationCode]; ok && time.Now().Before(existing.ExpiresAt) {
		now := time.Now()
		am.addHistoryEntryLocked(AnomalyHistoryEntry{
			StationCode: existing.StationCode,
			AnomalyType: existing.Type,
			DurationSec: existing.DurationSec,
			InjectedAt:  existing.InjectedAt,
			ExpiredAt:   &now,
		})
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
	})`

	newCode := `	// If there's an existing active anomaly for this station, handle it
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
	})`

	newContent := strings.Replace(string(content), oldCode, newCode, 1)
	ioutil.WriteFile(path, []byte(newContent), 0644)
	fmt.Println("Patched anomaly.go successfully.")
}
