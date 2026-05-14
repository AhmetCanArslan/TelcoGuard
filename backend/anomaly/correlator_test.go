package anomaly

import (
	"case1/models"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestCorrelatorSingleStation(t *testing.T) {
	stationID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	c := NewCorrelator()

	// Single result - no escalation
	results := []AnomalyResult{
		{StationID: stationID, MetricName: "cpu_usage", Severity: models.AlarmSeverityWarning},
	}
	out := c.Correlate(results)
	assert.Len(t, out, 1)
	assert.Equal(t, models.AlarmSeverityWarning, out[0].Severity)
	assert.NotContains(t, out[0].Message, "CORRELATED")
}

func TestCorrelatorMultiMetricEscalation(t *testing.T) {
	stationID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	c := NewCorrelator()

	// Two metrics on same station - escalate WARNING to CRITICAL
	results := []AnomalyResult{
		{StationID: stationID, MetricName: "cpu_usage", Severity: models.AlarmSeverityWarning},
		{StationID: stationID, MetricName: "latency", Severity: models.AlarmSeverityWarning},
	}
	out := c.Correlate(results)
	assert.Len(t, out, 2)
	for _, r := range out {
		assert.Equal(t, models.AlarmSeverityCritical, r.Severity)
		assert.Contains(t, r.Message, "CORRELATED")
	}
}

func TestCorrelatorAlreadyCritical(t *testing.T) {
	stationID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	c := NewCorrelator()

	results := []AnomalyResult{
		{StationID: stationID, MetricName: "cpu_usage", Severity: models.AlarmSeverityCritical},
		{StationID: stationID, MetricName: "latency", Severity: models.AlarmSeverityCritical},
	}
	out := c.Correlate(results)
	assert.Len(t, out, 2)
	for _, r := range out {
		assert.Equal(t, models.AlarmSeverityCritical, r.Severity)
	}
}

func TestCorrelatorMultiStation(t *testing.T) {
	station1 := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	station2 := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	c := NewCorrelator()

	results := []AnomalyResult{
		{StationID: station1, MetricName: "cpu_usage", Severity: models.AlarmSeverityWarning},
		{StationID: station1, MetricName: "latency", Severity: models.AlarmSeverityWarning},
		{StationID: station2, MetricName: "cpu_usage", Severity: models.AlarmSeverityWarning},
	}
	out := c.Correlate(results)
	assert.Len(t, out, 3)

	// station1 results escalated
	for _, r := range out {
		if r.StationID == station1 {
			assert.Equal(t, models.AlarmSeverityCritical, r.Severity)
		} else {
			assert.Equal(t, models.AlarmSeverityWarning, r.Severity)
		}
	}
}
