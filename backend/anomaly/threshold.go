package anomaly

import (
	"case1/models"
	"case1/repositories"
	"fmt"
)

type ThresholdDetector struct {
	repo *repositories.ThresholdRepository
}

func NewThresholdDetector() *ThresholdDetector {
	return &ThresholdDetector{
		repo: repositories.NewThresholdRepository(),
	}
}

func (d *ThresholdDetector) Detect(metric *models.Metric) ([]AnomalyResult, error) {
	configs, err := d.repo.FindAllActive()
	if err != nil {
		return nil, err
	}

	var results []AnomalyResult
	metricMap := map[string]float64{
		"cpu_usage":       metric.CpuUsage,
		"memory_usage":    metric.MemoryUsage,
		"packet_loss":     metric.PacketLoss,
		"latency":         metric.Latency,
		"rssi":            metric.Rssi,
	}

	for _, config := range configs {
		value, ok := metricMap[config.MetricName]
		if !ok {
			continue
		}

		var severity models.AlarmSeverity
		var triggered bool

		if config.Direction == models.ThresholdDirectionAbove {
			if value >= config.CriticalThreshold {
				severity = models.AlarmSeverityCritical
				triggered = true
			} else if value >= config.WarningThreshold {
				severity = models.AlarmSeverityWarning
				triggered = true
			}
		} else {
			if value <= config.CriticalThreshold {
				severity = models.AlarmSeverityCritical
				triggered = true
			} else if value <= config.WarningThreshold {
				severity = models.AlarmSeverityWarning
				triggered = true
			}
		}

		if triggered {
			results = append(results, AnomalyResult{
				StationID:  metric.StationID,
				MetricName: config.MetricName,
				Severity:   severity,
				Value:      value,
				Message:    fmt.Sprintf("Threshold breach: %s = %.2f (%s)", config.MetricName, value, severity),
			})
		}
	}

	// Handle connected_users separately (has both high and low thresholds)
	results = append(results, d.checkConnectedUsers(metric)...)
	return results, nil
}

func (d *ThresholdDetector) checkConnectedUsers(metric *models.Metric) []AnomalyResult {
	var results []AnomalyResult

	// High threshold
	if metric.ConnectedUsers >= 950 {
		results = append(results, AnomalyResult{
			StationID:  metric.StationID,
			MetricName: "connected_users",
			Severity:   models.AlarmSeverityCritical,
			Value:      float64(metric.ConnectedUsers),
			Message:    fmt.Sprintf("Too many users: %d (CRITICAL)", metric.ConnectedUsers),
		})
	} else if metric.ConnectedUsers >= 800 {
		results = append(results, AnomalyResult{
			StationID:  metric.StationID,
			MetricName: "connected_users",
			Severity:   models.AlarmSeverityWarning,
			Value:      float64(metric.ConnectedUsers),
			Message:    fmt.Sprintf("High user count: %d (WARNING)", metric.ConnectedUsers),
		})
	}

	// Low threshold
	if metric.ConnectedUsers == 0 {
		results = append(results, AnomalyResult{
			StationID:  metric.StationID,
			MetricName: "connected_users",
			Severity:   models.AlarmSeverityCritical,
			Value:      float64(metric.ConnectedUsers),
			Message:    fmt.Sprintf("No users connected: %d (CRITICAL)", metric.ConnectedUsers),
		})
	} else if metric.ConnectedUsers < 10 {
		results = append(results, AnomalyResult{
			StationID:  metric.StationID,
			MetricName: "connected_users",
			Severity:   models.AlarmSeverityWarning,
			Value:      float64(metric.ConnectedUsers),
			Message:    fmt.Sprintf("Low user count: %d (WARNING)", metric.ConnectedUsers),
		})
	}

	return results
}
