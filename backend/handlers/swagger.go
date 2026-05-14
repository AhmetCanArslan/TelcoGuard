package handlers

import (
	_ "embed"

	"github.com/gofiber/fiber/v2"
)

//go:embed swagger-ui.html
var swaggerUI []byte

//go:embed swagger.json
var swaggerJSON []byte

// SwaggerUI serves the Swagger UI HTML page
func SwaggerUI(c *fiber.Ctx) error {
	c.Set("Content-Type", "text/html")
	return c.Send(swaggerUI)
}

// SwaggerJSON serves the OpenAPI JSON specification
func SwaggerJSON(c *fiber.Ctx) error {
	c.Set("Content-Type", "application/json")
	return c.Send(swaggerJSON)
}
