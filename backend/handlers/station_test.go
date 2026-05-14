package handlers

import (
	"case1/testutil"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStationHandlers(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	app := fiber.New()
	app.Get("/api/v1/stations", ListStations)
	app.Get("/api/v1/stations/:id", GetStation)

	user := testutil.CreateTestUser(t, "station@test.com", "NOC_OPERATOR")
	token := testutil.GenerateTestToken(user.ID, "NOC_OPERATOR", user.Email)

	t.Run("ListStations empty", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stations", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("GetStation not found", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stations/11111111-1111-1111-1111-111111111111", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
}
