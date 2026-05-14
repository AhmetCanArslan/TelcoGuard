package services

import (
	"case1/models"
	"case1/testutil"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDashboardService(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)
	service := NewDashboardService()
	stationID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	t.Run("GetSummary empty", func(t *testing.T) {
		summary, err := service.GetSummary()
		require.NoError(t, err)
		assert.Equal(t, int64(0), summary.TotalStations)
		assert.Equal(t, int64(0), summary.TotalAlarms)
	})

	t.Run("GetSummary with data", func(t *testing.T) {
		// Create stations
		db := testutil.SetupTestDB()
		db.Create(&models.BaseStation{ID: stationID, Code: "DSH-1", Name: "A", Latitude: 41, Longitude: 29, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 100, Status: models.StationStatusActive})
		db.Create(&models.BaseStation{Code: "DSH-2", Name: "B", Latitude: 41, Longitude: 29, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 100, Status: models.StationStatusWarning})
		db.Create(&models.BaseStation{Code: "DSH-3", Name: "C", Latitude: 38, Longitude: 27, Region: "Ege", Type: models.StationTypeNR5G, Capacity: 100, Status: models.StationStatusCritical})

		// Create alarms
		db.Create(&models.Alarm{StationID: stationID, MetricName: "cpu", Severity: models.AlarmSeverityCritical, Status: models.AlarmStatusOpen, Message: "m"})
		db.Create(&models.Alarm{StationID: stationID, MetricName: "mem", Severity: models.AlarmSeverityWarning, Status: models.AlarmStatusOpen, Message: "m"})

		// Create online engineer
		db.Create(&models.User{Name: "Eng", Email: "eng@test.com", Password: "h", Role: models.RoleFieldEngineer, Active: true, IsOnline: true})

		summary, err := service.GetSummary()
		require.NoError(t, err)
		assert.Equal(t, int64(3), summary.TotalStations)
		assert.Equal(t, int64(1), summary.ActiveStations)
		assert.Equal(t, int64(1), summary.WarningStations)
		assert.Equal(t, int64(1), summary.CriticalStations)
		assert.Equal(t, int64(2), summary.TotalAlarms)
		assert.Equal(t, int64(2), summary.OpenAlarms)
		assert.Equal(t, int64(1), summary.CriticalAlarms)
		assert.Equal(t, int64(1), summary.OnlineEngineers)
		assert.Equal(t, int64(2), summary.StationsByRegion["Marmara"])
		assert.Equal(t, int64(1), summary.StationsByRegion["Ege"])
	})
}
