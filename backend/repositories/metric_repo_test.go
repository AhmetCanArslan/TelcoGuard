package repositories

import (
	"case1/models"
	"case1/testutil"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupMetricRepoTest(t *testing.T) (*MetricRepository, uuid.UUID) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	repo := NewMetricRepository()
	stationID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	station := models.BaseStation{
		ID:        stationID,
		Code:      "TST-MET",
		Name:      "Metric Test Station",
		Latitude:  41.0,
		Longitude: 29.0,
		Region:    "Marmara",
		Type:      models.StationTypeLTE,
		Capacity:  1000,
		Status:    models.StationStatusActive,
	}
	testutil.SetupTestDB().Create(&station)
	return repo, stationID
}

func TestMetricRepositoryCreateAndFindLatest(t *testing.T) {
	repo, stationID := setupMetricRepoTest(t)

	metric := models.Metric{
		StationID:      stationID,
		Timestamp:      time.Now(),
		CpuUsage:       45.5,
		MemoryUsage:    60.2,
		PacketLoss:     1.2,
		Latency:        20.0,
		Rssi:           -55.0,
		ConnectedUsers: 300,
	}
	err := repo.Create(&metric)
	require.NoError(t, err)

	latest, err := repo.FindLatestByStation(stationID)
	require.NoError(t, err)
	assert.InDelta(t, 45.5, latest.CpuUsage, 0.01)
}

func TestMetricRepositoryFindByTimeRange(t *testing.T) {
	repo, stationID := setupMetricRepoTest(t)

	now := time.Now()
	for i := 0; i < 5; i++ {
		repo.Create(&models.Metric{
			StationID:      stationID,
			Timestamp:      now.Add(time.Duration(i) * time.Hour),
			CpuUsage:       float64(30 + i),
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        15.0,
			Rssi:           -50.0,
			ConnectedUsers: 200,
		})
	}

	metrics, err := repo.FindByStationAndTimeRange(stationID, now, now.Add(6*time.Hour))
	require.NoError(t, err)
	assert.Len(t, metrics, 5)
}

func TestMetricRepositoryFindRecent(t *testing.T) {
	repo, stationID := setupMetricRepoTest(t)

	now := time.Now()
	for i := 0; i < 10; i++ {
		repo.Create(&models.Metric{
			StationID:      stationID,
			Timestamp:      now.Add(time.Duration(i) * time.Minute),
			CpuUsage:       float64(i),
			MemoryUsage:    50.0,
			PacketLoss:     1.0,
			Latency:        15.0,
			Rssi:           -50.0,
			ConnectedUsers: 200,
		})
	}

	recent, err := repo.FindRecentByStation(stationID, 3)
	require.NoError(t, err)
	assert.Len(t, recent, 3)
	assert.InDelta(t, 9.0, recent[0].CpuUsage, 0.01)
}
