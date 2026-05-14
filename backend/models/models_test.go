package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTableNames(t *testing.T) {
	assert.Equal(t, "users", User{}.TableName())
	assert.Equal(t, "base_stations", BaseStation{}.TableName())
	assert.Equal(t, "metrics", Metric{}.TableName())
	assert.Equal(t, "alarms", Alarm{}.TableName())
	assert.Equal(t, "threshold_configs", ThresholdConfig{}.TableName())
	assert.Equal(t, "otp_codes", OtpCode{}.TableName())
}

func TestRoleConstants(t *testing.T) {
	assert.Equal(t, Role("ADMIN"), RoleAdmin)
	assert.Equal(t, Role("NOC_OPERATOR"), RoleNOCOperator)
	assert.Equal(t, Role("FIELD_ENGINEER"), RoleFieldEngineer)
	assert.Equal(t, Role("NETWORK_MANAGER"), RoleNetworkManager)
}

func TestStationTypeConstants(t *testing.T) {
	assert.Equal(t, StationType("LTE"), StationTypeLTE)
	assert.Equal(t, StationType("NR_5G"), StationTypeNR5G)
}

func TestStationStatusConstants(t *testing.T) {
	assert.Equal(t, StationStatus("ACTIVE"), StationStatusActive)
	assert.Equal(t, StationStatus("WARNING"), StationStatusWarning)
	assert.Equal(t, StationStatus("CRITICAL"), StationStatusCritical)
	assert.Equal(t, StationStatus("OFFLINE"), StationStatusOffline)
}

func TestAlarmSeverityConstants(t *testing.T) {
	assert.Equal(t, AlarmSeverity("WARNING"), AlarmSeverityWarning)
	assert.Equal(t, AlarmSeverity("CRITICAL"), AlarmSeverityCritical)
}

func TestAlarmStatusConstants(t *testing.T) {
	assert.Equal(t, AlarmStatus("OPEN"), AlarmStatusOpen)
	assert.Equal(t, AlarmStatus("ACKNOWLEDGED"), AlarmStatusAcknowledged)
	assert.Equal(t, AlarmStatus("IN_PROGRESS"), AlarmStatusInProgress)
	assert.Equal(t, AlarmStatus("RESOLVED"), AlarmStatusResolved)
}

func TestThresholdDirectionConstants(t *testing.T) {
	assert.Equal(t, ThresholdDirection("ABOVE"), ThresholdDirectionAbove)
	assert.Equal(t, ThresholdDirection("BELOW"), ThresholdDirectionBelow)
}
