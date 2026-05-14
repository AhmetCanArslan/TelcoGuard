package anomaly

import (
	"case1/models"
	"case1/repositories"
	"fmt"
	"math"
)

type ZScoreDetector struct {
	repo *repositories.MetricRepository
	n    int
}

func NewZScoreDetector() *ZScoreDetector {
	return &ZScoreDetector{
		repo: repositories.NewMetricRepository(),
		n:    20,
	}
}

func (d *ZScoreDetector) Detect(metric *models.Metric) ([]AnomalyResult, error) {
	recent, err := d.repo.FindRecentByStation(metric.StationID, d.n)
	if err != nil {
		return nil, err
	}
	if len(recent) < d.n {
		return nil, nil
	}

	metricMap := map[string]func(m models.Metric) float64{
		"cpu_usage":    func(m models.Metric) float64 { return m.CpuUsage },
		"memory_usage": func(m models.Metric) float64 { return m.MemoryUsage },
		"packet_loss":  func(m models.Metric) float64 { return m.PacketLoss },
		"latency":      func(m models.Metric) float64 { return m.Latency },
		"rssi":         func(m models.Metric) float64 { return m.Rssi },
	}

	var results []AnomalyResult
	for name, getter := range metricMap {
		mean, std := calculateStats(recent, getter)
		if std == 0 {
			continue
		}

		current := getter(*metric)
		zScore := (current - mean) / std
		absZ := math.Abs(zScore)

		if absZ > 3 {
			results = append(results, AnomalyResult{
				StationID:  metric.StationID,
				MetricName: name,
				Severity:   models.AlarmSeverityCritical,
				Value:      current,
				Message:    fmt.Sprintf("Z-Score anomaly: %s = %.2f (z=%.2f)", name, current, zScore),
			})
		} else if absZ > 2 {
			results = append(results, AnomalyResult{
				StationID:  metric.StationID,
				MetricName: name,
				Severity:   models.AlarmSeverityWarning,
				Value:      current,
				Message:    fmt.Sprintf("Z-Score anomaly: %s = %.2f (z=%.2f)", name, current, zScore),
			})
		}
	}

	return results, nil
}
