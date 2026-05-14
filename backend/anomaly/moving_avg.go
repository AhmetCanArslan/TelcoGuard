package anomaly

import (
	"case1/models"
	"case1/repositories"
	"fmt"
	"math"
)

type MovingAvgDetector struct {
	repo *repositories.MetricRepository
	n    int // window size
}

func NewMovingAvgDetector() *MovingAvgDetector {
	return &MovingAvgDetector{
		repo: repositories.NewMetricRepository(),
		n:    10,
	}
}

func (d *MovingAvgDetector) Detect(metric *models.Metric) ([]AnomalyResult, error) {
	recent, err := d.repo.FindRecentByStation(metric.StationID, d.n)
	if err != nil {
		return nil, err
	}
	if len(recent) < d.n {
		return nil, nil // Not enough data
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
		deviation := math.Abs(current-mean) / std

		if deviation > 3 {
			results = append(results, AnomalyResult{
				StationID:  metric.StationID,
				MetricName: name,
				Severity:   models.AlarmSeverityCritical,
				Value:      current,
				Message:    fmt.Sprintf("Moving avg anomaly: %s = %.2f (deviation: %.2fσ)", name, current, deviation),
			})
		} else if deviation > 2 {
			results = append(results, AnomalyResult{
				StationID:  metric.StationID,
				MetricName: name,
				Severity:   models.AlarmSeverityWarning,
				Value:      current,
				Message:    fmt.Sprintf("Moving avg anomaly: %s = %.2f (deviation: %.2fσ)", name, current, deviation),
			})
		}
	}

	return results, nil
}

func calculateStats(metrics []models.Metric, getter func(models.Metric) float64) (mean, std float64) {
	sum := 0.0
	for _, m := range metrics {
		sum += getter(m)
	}
	mean = sum / float64(len(metrics))

	variance := 0.0
	for _, m := range metrics {
		diff := getter(m) - mean
		variance += diff * diff
	}
	std = math.Sqrt(variance / float64(len(metrics)))
	return
}
