package handlers

import (
	"bytes"
	"case1/auth"
	"case1/testutil"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAlarmHandlers(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	app := fiber.New()
	app.Use(auth.AuthRequired())
	app.Get("/api/v1/alarms", ListAlarms)
	app.Get("/api/v1/alarms/:id", GetAlarm)
	app.Get("/api/v1/alarms/assigned", GetMyAlarms)
	app.Patch("/api/v1/alarms/:id/acknowledge", AcknowledgeAlarm)
	app.Patch("/api/v1/alarms/:id/assign", AssignAlarm)
	app.Patch("/api/v1/alarms/:id/resolve", ResolveAlarm)

	// Create test users and station
	nocUser := testutil.CreateTestUser(t, "noc@test.com", "NOC_OPERATOR")
	engineer := testutil.CreateTestUser(t, "engineer@test.com", "FIELD_ENGINEER")
	station := testutil.CreateTestStation(t, "ST-001")
	token := testutil.GenerateTestToken(nocUser.ID, "NOC_OPERATOR", nocUser.Email)

	t.Run("ListAlarms empty", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/alarms", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("GetAlarm not found", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/alarms/11111111-1111-1111-1111-111111111111", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("GetAlarm invalid ID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/alarms/invalid-uuid", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("AcknowledgeAlarm", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-ACK")
		alarm := testutil.CreateTestAlarm(t, station.ID.String(), "cpu_usage", "WARNING", "OPEN")

		req := httptest.NewRequest(http.MethodPatch, "/api/v1/alarms/"+alarm.ID.String()+"/acknowledge", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("AcknowledgeAlarm invalid ID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/alarms/invalid-uuid/acknowledge", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("AssignAlarm", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-ASSIGN")
		alarm := testutil.CreateTestAlarm(t, station.ID.String(), "memory_usage", "WARNING", "OPEN")
		engineer := testutil.CreateTestUser(t, "engineer2@test.com", "FIELD_ENGINEER")

		body, _ := json.Marshal(map[string]interface{}{"user_id": engineer.ID})
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/alarms/"+alarm.ID.String()+"/assign", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("AssignAlarm auto nearest", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-AUTO")
		alarm := testutil.CreateTestAlarm(t, station.ID.String(), "latency", "WARNING", "OPEN")
		// Create a field engineer near the station (same lat/lng)
		_ = testutil.CreateTestUserWithLocation(t, "nearby@test.com", "FIELD_ENGINEER", station.Latitude, station.Longitude)

		body, _ := json.Marshal(map[string]interface{}{})
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/alarms/"+alarm.ID.String()+"/assign", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("ResolveAlarm", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-RES")
		alarm := testutil.CreateTestAlarm(t, station.ID.String(), "packet_loss", "WARNING", "OPEN")

		body, _ := json.Marshal(map[string]interface{}{"resolution_note": "Fixed the issue"})
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/alarms/"+alarm.ID.String()+"/resolve", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("ResolveAlarm already resolved fails", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-RES2")
		alarm := testutil.CreateTestAlarm(t, station.ID.String(), "rssi", "WARNING", "RESOLVED")

		body, _ := json.Marshal(map[string]interface{}{"resolution_note": "Fixed again"})
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/alarms/"+alarm.ID.String()+"/resolve", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("ListAlarms with data", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-LIST")
		_ = testutil.CreateTestAlarm(t, station.ID.String(), "cpu_usage", "WARNING", "OPEN")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/alarms", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	_ = engineer // suppress unused warning if any
	_ = station
}
