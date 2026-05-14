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

func setupAlarmRepoTest(t *testing.T) (*AlarmRepository, uuid.UUID) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	repo := NewAlarmRepository()
	stationID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	// Create station for FK constraint
	station := models.BaseStation{
		ID:        stationID,
		Code:      "TST-ALM",
		Name:      "Alarm Test Station",
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

func TestAlarmRepositoryCreateAndFindByID(t *testing.T) {
	repo, stationID := setupAlarmRepoTest(t)

	alarm := models.Alarm{
		StationID:  stationID,
		MetricName: "cpu_usage",
		Severity:   models.AlarmSeverityCritical,
		Status:     models.AlarmStatusOpen,
		Message:    "CPU spike",
		CreatedAt:  time.Now(),
	}
	err := repo.Create(&alarm)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, alarm.ID)

	found, err := repo.FindByID(alarm.ID)
	require.NoError(t, err)
	assert.Equal(t, "cpu_usage", found.MetricName)
}

func TestAlarmRepositoryFindByFilter(t *testing.T) {
	repo, stationID := setupAlarmRepoTest(t)

	for i := 0; i < 5; i++ {
		repo.Create(&models.Alarm{
			StationID:  stationID,
			MetricName: "cpu_usage",
			Severity:   models.AlarmSeverityCritical,
			Status:     models.AlarmStatusOpen,
			Message:    "Alarm",
			CreatedAt:  time.Now(),
		})
	}

	alarms, total, err := repo.FindByFilter("CRITICAL", "OPEN", "", 1, 10)
	require.NoError(t, err)
	assert.Len(t, alarms, 5)
	assert.Equal(t, int64(5), total)
}

func TestAlarmRepositoryFindOpenByStationAndMetric(t *testing.T) {
	repo, stationID := setupAlarmRepoTest(t)

	repo.Create(&models.Alarm{
		StationID:  stationID,
		MetricName: "memory_usage",
		Severity:   models.AlarmSeverityWarning,
		Status:     models.AlarmStatusOpen,
		Message:    "Memory high",
		CreatedAt:  time.Now(),
	})

	found, err := repo.FindOpenByStationAndMetric(stationID, "memory_usage")
	require.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "Memory high", found.Message)

	// Should not find resolved or different metric
	notFound, err := repo.FindOpenByStationAndMetric(stationID, "cpu_usage")
	assert.NoError(t, err)
	assert.Nil(t, notFound)
}

func TestAlarmRepositoryUpdateStatus(t *testing.T) {
	repo, stationID := setupAlarmRepoTest(t)

	alarm := models.Alarm{
		StationID:  stationID, MetricName: "latency",
		Severity: models.AlarmSeverityWarning, Status: models.AlarmStatusOpen,
		Message: "Latency high", CreatedAt: time.Now(),
	}
	repo.Create(&alarm)

	err := repo.UpdateStatus(alarm.ID, models.AlarmStatusResolved)
	require.NoError(t, err)

	found, _ := repo.FindByID(alarm.ID)
	assert.Equal(t, models.AlarmStatusResolved, found.Status)
}
