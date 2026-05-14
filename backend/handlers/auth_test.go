package handlers

import (
	"bytes"
	"case1/testutil"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthHandlers(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	app := fiber.New()
	app.Post("/api/v1/auth/register", Register)
	app.Post("/api/v1/auth/login", Login)
	app.Post("/api/v1/auth/otp/send", SendOTP)
	app.Post("/api/v1/auth/otp/verify", VerifyOTP)

	t.Run("Register new user", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"name":     "Test User",
			"email":    "reg@test.com",
			"password": "password123",
			"role":     "NOC_OPERATOR",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Register duplicate email fails", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"name":     "Test User",
			"email":    "reg@test.com",
			"password": "password123",
			"role":     "NOC_OPERATOR",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("Login with correct credentials", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":    "reg@test.com",
			"password": "password123",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		assert.True(t, result["success"].(bool))
		data := result["data"].(map[string]interface{})
		assert.NotEmpty(t, data["access_token"])
	})

	t.Run("Login with wrong password fails", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"email":    "reg@test.com",
			"password": "wrongpassword",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("Send OTP dev mode", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"contact": "otp@test.com",
			"method":  "email",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/otp/send", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		assert.True(t, result["success"].(bool))
	})

	t.Run("Verify OTP", func(t *testing.T) {
		// First send to get code
		body, _ := json.Marshal(map[string]string{
			"contact": "verify@test.com",
			"method":  "email",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/otp/send", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, _ := app.Test(req)
		var sendResult map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&sendResult)
		code := sendResult["data"].(map[string]interface{})["code"].(string)

		// Now verify
		body, _ = json.Marshal(map[string]string{
			"contact": "verify@test.com",
			"code":    code,
		})
		req = httptest.NewRequest(http.MethodPost, "/api/v1/auth/otp/verify", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req)
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var verifyResult map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&verifyResult)
		assert.True(t, verifyResult["success"].(bool))
		data := verifyResult["data"].(map[string]interface{})
		assert.NotEmpty(t, data["access_token"])
	})
}
