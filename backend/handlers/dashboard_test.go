package handlers

import (
	"bytes"
	"case1/auth"
	"case1/testutil"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDashboardHandler(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	app := fiber.New()
	app.Use(auth.AuthRequired())
	app.Get("/api/v1/dashboard/summary", DashboardSummary)

	user := testutil.CreateTestUser(t, "dash@test.com", "NOC_OPERATOR")
	token := testutil.GenerateTestToken(user.ID, "NOC_OPERATOR", user.Email)

	t.Run("DashboardSummary empty", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/summary", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("DashboardSummary with data", func(t *testing.T) {
		testutil.CleanTestDB(t)
		_ = testutil.CreateTestStation(t, "ST-DASH")
		_ = testutil.CreateTestUser(t, "fe@test.com", "FIELD_ENGINEER")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/summary", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})
}

func TestUserHandlers(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	app := fiber.New()
	app.Use(auth.AuthRequired())
	app.Get("/api/v1/users", ListUsers)
	app.Get("/api/v1/users/:id", GetUser)
	app.Put("/api/v1/users/:id", UpdateUser)
	app.Delete("/api/v1/users/:id", DeleteUser)
	app.Patch("/api/v1/users/password", UpdatePassword)

	user := testutil.CreateTestUser(t, "user@test.com", "NOC_OPERATOR")
	token := testutil.GenerateTestToken(user.ID, "NOC_OPERATOR", user.Email)

	t.Run("ListUsers", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("GetUser not found", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users/99999", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("GetUser success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+fmt.Sprintf("%d", user.ID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("UpdateUser", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{"name": "Updated Name"})
		req := httptest.NewRequest(http.MethodPut, "/api/v1/users/"+fmt.Sprintf("%d", user.ID), bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("UpdateUser invalid body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/v1/users/"+fmt.Sprintf("%d", user.ID), bytes.NewReader([]byte("not json")))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("UpdatePassword invalid old password", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"old_password": "wrong",
			"new_password": "newpassword123",
		})
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/users/password", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("DeleteUser", func(t *testing.T) {
		testutil.CleanTestDB(t)
		u := testutil.CreateTestUser(t, "delete@test.com", "NOC_OPERATOR")
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/"+fmt.Sprintf("%d", u.ID), nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})
}
