package handlers

import "github.com/gofiber/fiber/v2"

// Health godoc
// @Summary Health check
// @Description Get server health status
// @Tags health
// @Produce json
// @Success 200 {object} utils.APIResponse
// @Router /health [get]
func Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"message": "Server is running",
	})
}
