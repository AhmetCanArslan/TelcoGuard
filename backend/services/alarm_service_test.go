package services

import (
	"case1/models"
	"case1/testutil"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupAlarmTest(t *testing.T) (*AlarmService, uuid.UUID) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	stationID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
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
	return NewAlarmService(), stationID
}

func TestAlarmServiceCreateOrUpdate(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	alarm, err := service.CreateOrUpdate(stationID, "cpu_usage", models.AlarmSeverityCritical, "CPU high")
	require.NoError(t, err)
	assert.Equal(t, models.AlarmStatusOpen, alarm.Status)
	assert.Equal(t, "cpu_usage", alarm.MetricName)
}

func TestAlarmServiceDedup(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	alarm1, err := service.CreateOrUpdate(stationID, "memory_usage", models.AlarmSeverityWarning, "Memory warning")
	require.NoError(t, err)
	id1 := alarm1.ID

	// Same station + metric within 5 minutes should update, not create new
	alarm2, err := service.CreateOrUpdate(stationID, "memory_usage", models.AlarmSeverityCritical, "Memory critical")
	require.NoError(t, err)
	assert.Equal(t, id1, alarm2.ID)
	assert.Equal(t, models.AlarmSeverityCritical, alarm2.Severity)
}

func TestAlarmServiceAcknowledge(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	alarm, _ := service.CreateOrUpdate(stationID, "latency", models.AlarmSeverityWarning, "Latency high")

	updated, err := service.Acknowledge(alarm.ID)
	require.NoError(t, err)
	assert.Equal(t, models.AlarmStatusAcknowledged, updated.Status)
	assert.NotNil(t, updated.AcknowledgedAt)
}

func TestAlarmServiceAcknowledgeNonOpenFails(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	alarm, _ := service.CreateOrUpdate(stationID, "packet_loss", models.AlarmSeverityWarning, "Packet loss")
	service.Acknowledge(alarm.ID)

	_, err := service.Acknowledge(alarm.ID)
	assert.Error(t, err)
}

func TestAlarmServiceAssign(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	// Create a user to assign to
	user := testutil.CreateTestUser(t, "assign@test.com", models.RoleFieldEngineer)

	alarm, _ := service.CreateOrUpdate(stationID, "rssi", models.AlarmSeverityWarning, "RSSI low")

	updated, err := service.Assign(alarm.ID, user.ID)
	require.NoError(t, err)
	assert.Equal(t, models.AlarmStatusInProgress, updated.Status)
	assert.Equal(t, user.ID, *updated.AssignedTo)
}

func TestAlarmServiceResolve(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	alarm, _ := service.CreateOrUpdate(stationID, "connected_users", models.AlarmSeverityCritical, "No users")
	service.Assign(alarm.ID, 99)

	updated, err := service.Resolve(alarm.ID, "Fixed by reboot")
	require.NoError(t, err)
	assert.Equal(t, models.AlarmStatusResolved, updated.Status)
	assert.Equal(t, "Fixed by reboot", updated.ResolutionNote)
	assert.NotNil(t, updated.ResolvedAt)
}

func TestAlarmServiceResolveAlreadyResolvedFails(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	alarm, _ := service.CreateOrUpdate(stationID, "cpu_usage", models.AlarmSeverityCritical, "CPU")
	service.Resolve(alarm.ID, "done")

	_, err := service.Resolve(alarm.ID, "again")
	assert.Error(t, err)
}

func TestAlarmServiceGetByFilter(t *testing.T) {
	service, stationID := setupAlarmTest(t)

	// Use different metrics to avoid dedup
	for i := 0; i < 3; i++ {
		service.CreateOrUpdate(stationID, "cpu_usage_"+string(rune('a'+i)), models.AlarmSeverityCritical, "Alarm")
	}
	service.CreateOrUpdate(stationID, "memory_usage", models.AlarmSeverityWarning, "Alarm")

	alarms, total, err := service.GetByFilter("CRITICAL", "", "", 1, 10)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, int64(3))
	assert.GreaterOrEqual(t, len(alarms), 3)
}
