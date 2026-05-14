package handlers

import (
	"bytes"
	"case1/auth"
	"case1/testutil"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMetricHandlers(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	app := fiber.New()
	app.Use(auth.AuthRequired())
	app.Post("/api/v1/stations/:id/metrics", IngestMetric)
	app.Get("/api/v1/stations/:id/metrics", GetMetrics)
	app.Get("/api/v1/stations/:id/metrics/latest", GetLatestMetric)

	user := testutil.CreateTestUser(t, "metric@test.com", "NOC_OPERATOR")
	token := testutil.GenerateTestToken(user.ID, "NOC_OPERATOR", user.Email)

	t.Run("IngestMetric invalid station ID", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{"cpu_usage": 50.0})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/stations/invalid-uuid/metrics", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("IngestMetric invalid body", func(t *testing.T) {
		station := testutil.CreateTestStation(t, "ST-MET-1")
		req := httptest.NewRequest(http.MethodPost, "/api/v1/stations/"+station.ID.String()+"/metrics", bytes.NewReader([]byte("not json")))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("IngestMetric success", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-MET-2")
		body, _ := json.Marshal(MetricPayload{
			CpuUsage:       45.0,
			MemoryUsage:    60.0,
			PacketLoss:     1.0,
			Latency:        20.0,
			Rssi:           -70.0,
			ConnectedUsers: 100,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/stations/"+station.ID.String()+"/metrics", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("GetMetrics invalid station ID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stations/invalid-uuid/metrics", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("GetMetrics empty range", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-MET-3")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stations/"+station.ID.String()+"/metrics", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("GetMetrics with time range", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-MET-4")
		_ = testutil.CreateTestMetric(t, station.ID.String(), 50, 60, 1, 20, -70, 100)

		from := time.Now().Add(-24 * time.Hour).Format(time.RFC3339)
		to := time.Now().Add(time.Hour).Format(time.RFC3339)
		url := "/api/v1/stations/" + station.ID.String() + "/metrics?from=" + from + "&to=" + to
		req := httptest.NewRequest(http.MethodGet, url, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("GetLatestMetric not found", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-MET-5")
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stations/"+station.ID.String()+"/metrics/latest", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("GetLatestMetric success", func(t *testing.T) {
		testutil.CleanTestDB(t)
		station := testutil.CreateTestStation(t, "ST-MET-6")
		_ = testutil.CreateTestMetric(t, station.ID.String(), 50, 60, 1, 20, -70, 100)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/stations/"+station.ID.String()+"/metrics/latest", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})
}
