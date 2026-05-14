package anomaly

import (
	"case1/models"
	"case1/testutil"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestThresholdDetectorIntegration(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	testutil.SeedThresholdConfigs(t)

	detector := NewThresholdDetector()

	t.Run("cpu_usage critical above threshold", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-TH-1")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       95.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		require.Len(t, results, 1)
		assert.Equal(t, "cpu_usage", results[0].MetricName)
		assert.Equal(t, models.AlarmSeverityCritical, results[0].Severity)
	})

	t.Run("cpu_usage warning above threshold", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-TH-2")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       80.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		require.Len(t, results, 1)
		assert.Equal(t, "cpu_usage", results[0].MetricName)
		assert.Equal(t, models.AlarmSeverityWarning, results[0].Severity)
	})

	t.Run("rssi critical below threshold", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-TH-3")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -95.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		require.Len(t, results, 1)
		assert.Equal(t, "rssi", results[0].MetricName)
		assert.Equal(t, models.AlarmSeverityCritical, results[0].Severity)
	})

	t.Run("no threshold breach", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-TH-4")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		assert.Empty(t, results)
	})

	t.Run("connected_users high critical", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-TH-5")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 1000,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		require.Len(t, results, 1)
		assert.Equal(t, "connected_users", results[0].MetricName)
		assert.Equal(t, models.AlarmSeverityCritical, results[0].Severity)
	})

	t.Run("connected_users low warning", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-TH-6")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 5,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		require.Len(t, results, 1)
		assert.Equal(t, "connected_users", results[0].MetricName)
		assert.Equal(t, models.AlarmSeverityWarning, results[0].Severity)
	})
}

func TestMovingAvgDetectorIntegration(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	detector := NewMovingAvgDetector()
	detector.n = 5 // smaller window for test

	t.Run("not enough data returns empty", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-MA-1")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		assert.Empty(t, results)
	})

	t.Run("detects anomaly with enough history", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-MA-2")
		// Seed 5 metrics with varying low cpu usage so std != 0
		cpuValues := []float64{10.0, 12.0, 9.0, 11.0, 10.0}
		for i, cpu := range cpuValues {
			m := &models.Metric{
				StationID:      station.ID,
				CpuUsage:       cpu,
				MemoryUsage:    50.0,
				PacketLoss:     1.0,
				Latency:        20.0,
				Rssi:           -70.0,
				ConnectedUsers: 100,
				Timestamp:      time.Now().Add(-time.Duration(5-i) * time.Minute),
			}
			err := testutil.SetupTestDB().Create(m).Error
			require.NoError(t, err)
		}

		// Current metric with very high cpu
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       99.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		require.NotEmpty(t, results)
		found := false
		for _, r := range results {
			if r.MetricName == "cpu_usage" {
				found = true
				assert.Equal(t, models.AlarmSeverityCritical, r.Severity)
			}
		}
		assert.True(t, found, "expected cpu_usage anomaly")
	})
}

func TestZScoreDetectorIntegration(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	detector := NewZScoreDetector()
	detector.n = 5 // smaller window for test

	t.Run("not enough data returns empty", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-ZS-1")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		assert.Empty(t, results)
	})

	t.Run("detects z-score anomaly with enough history", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-ZS-2")
		// Seed 5 metrics with varying latency so std != 0
		latencyValues := []float64{20.0, 22.0, 18.0, 21.0, 19.0}
		for i, lat := range latencyValues {
			m := &models.Metric{
				StationID:      station.ID,
				CpuUsage:       50.0,
				MemoryUsage:    50.0,
				PacketLoss:     1.0,
				Latency:        lat,
				Rssi:           -70.0,
				ConnectedUsers: 100,
				Timestamp:      time.Now().Add(-time.Duration(5-i) * time.Minute),
			}
			err := testutil.SetupTestDB().Create(m).Error
			require.NoError(t, err)
		}

		// Current metric with very high latency
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        500.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		results, err := detector.Detect(metric)
		require.NoError(t, err)
		require.NotEmpty(t, results)
		found := false
		for _, r := range results {
			if r.MetricName == "latency" {
				found = true
				assert.Equal(t, models.AlarmSeverityCritical, r.Severity)
			}
		}
		assert.True(t, found, "expected latency anomaly")
	})
}

func TestEngineProcessIntegration(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	testutil.SeedThresholdConfigs(t)

	engine := NewEngine()

	t.Run("creates alarm on threshold breach", func(t *testing.T) {
		testutil.CleanTestDB(t)
		testutil.SeedThresholdConfigs(t)
		station := testutil.CreateTestStation(t, "ST-ENG-1")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       95.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		alarms, err := engine.Process(metric)
		require.NoError(t, err)
		require.NotEmpty(t, alarms)
		assert.Equal(t, models.AlarmSeverityCritical, alarms[0].Severity)
		assert.Equal(t, models.AlarmStatusOpen, alarms[0].Status)
	})

	t.Run("no alarms when metrics normal", func(t *testing.T) {
		testutil.CleanTestDB(t)
		testutil.SeedThresholdConfigs(t)
		station := testutil.CreateTestStation(t, "ST-ENG-2")
		metric := &models.Metric{
			StationID:      station.ID,
			CpuUsage:       50.0,
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		}
		alarms, err := engine.Process(metric)
		require.NoError(t, err)
		assert.Empty(t, alarms)
	})
}
