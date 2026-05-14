package auth

import (
	"case1/config"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAndValidateAccessToken(t *testing.T) {
	config.AppConfig.JWTSecret = "test-secret-key"
	config.AppConfig.JWTRefreshSecret = "test-refresh-secret"

	t.Run("valid token", func(t *testing.T) {
		token, err := GenerateAccessToken(1, "NOC_OPERATOR", "test@test.com")
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := ValidateAccessToken(token)
		require.NoError(t, err)
		assert.Equal(t, uint(1), claims.UserID)
		assert.Equal(t, "NOC_OPERATOR", claims.Role)
		assert.Equal(t, "test@test.com", claims.Email)
	})

	t.Run("invalid token", func(t *testing.T) {
		_, err := ValidateAccessToken("invalid.token.here")
		assert.Error(t, err)
	})

	t.Run("tampered token", func(t *testing.T) {
		token, _ := GenerateAccessToken(1, "NOC_OPERATOR", "test@test.com")
		tampered := token[:len(token)-5] + "XXXXX"
		_, err := ValidateAccessToken(tampered)
		assert.Error(t, err)
	})

	t.Run("expired token", func(t *testing.T) {
		claims := TokenClaims{
			UserID: 1,
			Role:   "ADMIN",
			Email:  "admin@test.com",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-25 * time.Hour)),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(config.AppConfig.JWTSecret))
		_, err := ValidateAccessToken(tokenString)
		assert.Error(t, err)
	})
}

func TestGenerateAndValidateRefreshToken(t *testing.T) {
	config.AppConfig.JWTRefreshSecret = "test-refresh-secret"

	t.Run("valid refresh token", func(t *testing.T) {
		token, err := GenerateRefreshToken(42)
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		userID, err := ValidateRefreshToken(token)
		require.NoError(t, err)
		assert.Equal(t, uint(42), userID)
	})

	t.Run("invalid refresh token", func(t *testing.T) {
		_, err := ValidateRefreshToken("bad.token")
		assert.Error(t, err)
	})

	t.Run("expired refresh token", func(t *testing.T) {
		claims := jwt.RegisteredClaims{
			Subject:   "99",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-24 * time.Hour)),
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, _ := token.SignedString([]byte(config.AppConfig.JWTRefreshSecret))
		_, err := ValidateRefreshToken(tokenString)
		assert.Error(t, err)
	})
}
