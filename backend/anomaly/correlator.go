package anomaly

import (
	"case1/models"
)

type Correlator struct{}

func NewCorrelator() *Correlator {
	return &Correlator{}
}

func (c *Correlator) Correlate(results []AnomalyResult) []AnomalyResult {
	// Group anomalies by station
	stationMap := make(map[string][]AnomalyResult)
	for _, r := range results {
		key := r.StationID.String()
		stationMap[key] = append(stationMap[key], r)
	}

	var correlated []AnomalyResult
	for _, stationResults := range stationMap {
		if len(stationResults) >= 2 {
			// Escalate all WARNING to CRITICAL if multiple metrics triggered
			for i := range stationResults {
				if stationResults[i].Severity == models.AlarmSeverityWarning {
					stationResults[i].Severity = models.AlarmSeverityCritical
					stationResults[i].Message = "[CORRELATED] " + stationResults[i].Message
				}
			}
		}
		correlated = append(correlated, stationResults...)
	}

	return correlated
}
