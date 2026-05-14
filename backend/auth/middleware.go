package auth

import (
	"strings"

	"case1/config"
	"case1/models"
	"github.com/gofiber/fiber/v2"
)

func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Missing authorization header",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid authorization header format",
			})
		}

		claims, err := ValidateAccessToken(tokenString)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid or expired token",
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("role", claims.Role)
		c.Locals("email", claims.Email)
		return c.Next()
	}
}

func SimulatorAuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Missing authorization header",
			})
		}

		secret := strings.TrimPrefix(authHeader, "Bearer ")
		if secret == authHeader {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid authorization header format",
			})
		}

		if secret != config.AppConfig.SimulatorSecret {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid simulator secret",
			})
		}

		return c.Next()
	}
}

func RequireRole(roles ...models.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		roleStr, ok := c.Locals("role").(string)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "Role not found in context",
			})
		}

		for _, r := range roles {
			if string(r) == roleStr {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Insufficient permissions",
		})
	}
}

func GetUserID(c *fiber.Ctx) uint {
	return c.Locals("user_id").(uint)
}

func GetRole(c *fiber.Ctx) models.Role {
	return models.Role(c.Locals("role").(string))
}

func GetEmail(c *fiber.Ctx) string {
	return c.Locals("email").(string)
}
