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

	oldStatus := `	activeAnomalies := r.anomalyManager.ListActive()
	activeMap := make(map[string]interface{})
	for code, anomaly := range activeAnomalies {
		activeMap[code] = map[string]interface{}{
			"type":              anomaly.Type,
			"remaining_seconds": anomaly.RemainingSeconds(),
			"duration_sec":      anomaly.DurationSec,
			"injected_at":       anomaly.InjectedAt.Format(time.RFC3339),
			"expires_at":        anomaly.ExpiresAt.Format(time.RFC3339),
		}
	}`
	newStatus := `	activeAnomalies := r.anomalyManager.ListActive()
	activeMap := make(map[string][]map[string]interface{})
	for _, anomaly := range activeAnomalies {
		activeMap[anomaly.StationCode] = append(activeMap[anomaly.StationCode], map[string]interface{}{
			"type":              anomaly.Type,
			"remaining_seconds": anomaly.RemainingSeconds(),
			"duration_sec":      anomaly.DurationSec,
			"injected_at":       anomaly.InjectedAt.Format(time.RFC3339),
			"expires_at":        anomaly.ExpiresAt.Format(time.RFC3339),
		})
	}`
	
	if strings.Contains(s, oldStatus) {
		s = strings.Replace(s, oldStatus, newStatus, 1)
		err = ioutil.WriteFile(path, []byte(s), 0644)
		if err != nil {
			panic(err)
		}
		fmt.Println("Fixed runner.go")
	} else {
		fmt.Println("Could not find the old block in runner.go")
	}
}
