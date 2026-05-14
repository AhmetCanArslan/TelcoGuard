package main

import (
	"fmt"
	"io/ioutil"
	"strings"
)

func main() {
	path := "simulator/engine/runner.go"
	content, err := ioutil.ReadFile(path)
	if err != nil {
		panic(err)
	}
	s := string(content)

	// Update ApplyAnomaly loop
	oldApply := `			if anomaly := r.anomalyManager.Get(st.Code); anomaly != nil {
				payload = r.anomalyManager.ApplyAnomaly(st, payload, anomaly)
			}`
	newApply := `			if anomalies := r.anomalyManager.Get(st.Code); len(anomalies) > 0 {
				for _, anomaly := range anomalies {
					payload = r.anomalyManager.ApplyAnomaly(st, payload, anomaly)
				}
			}`
	s = strings.Replace(s, oldApply, newApply, 1)

	// Update GetStatus logic
	oldStatus := `	activeAnomalies := r.anomalyManager.ListActive()
	activeMap := make(map[string]interface{})
	for code, anomaly := range activeAnomalies {
		activeMap[code] = map[string]interface{}{
			"type":             anomaly.Type,
			"remaining_seconds": anomaly.RemainingSeconds(),
			"duration_sec":     anomaly.DurationSec,
			"injected_at":      anomaly.InjectedAt.Format(time.RFC3339),
			"expires_at":       anomaly.ExpiresAt.Format(time.RFC3339),
		}
	}`
	newStatus := `	activeAnomalies := r.anomalyManager.ListActive()
	activeMap := make(map[string][]map[string]interface{})
	for _, anomaly := range activeAnomalies {
		activeMap[anomaly.StationCode] = append(activeMap[anomaly.StationCode], map[string]interface{}{
			"type":             anomaly.Type,
			"remaining_seconds": anomaly.RemainingSeconds(),
			"duration_sec":     anomaly.DurationSec,
			"injected_at":      anomaly.InjectedAt.Format(time.RFC3339),
			"expires_at":       anomaly.ExpiresAt.Format(time.RFC3339),
		})
	}`
	s = strings.Replace(s, oldStatus, newStatus, 1)

	err = ioutil.WriteFile(path, []byte(s), 0644)
	if err != nil {
		panic(err)
	}
	fmt.Println("Runner patched!")
}
