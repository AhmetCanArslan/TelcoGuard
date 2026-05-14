package routes

import (
	"case1/handlers"
	"case1/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func Setup(app *fiber.App) {
	// Middleware
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())
	app.Use(middleware.ErrorHandler())

	// Health check
	app.Get("/health", handlers.Health)

	// User routes
	api := app.Group("/api")
	users := api.Group("/users")
	users.Post("", handlers.CreateUser)
	users.Get("", handlers.ListUsers)
	users.Get("/:id", handlers.GetUser)
	users.Put("/:id", handlers.UpdateUser)
	users.Delete("/:id", handlers.DeleteUser)

	// Message routes
	messages := api.Group("/messages")
	messages.Post("", handlers.CreateMessage)
	messages.Get("/user/:user_id", handlers.ListMessages)
	messages.Delete("/:id", handlers.DeleteMessage)

	// WebSocket route
	app.Get("/ws", websocket.New(handlers.WebSocketHandler))

	// 404 handler
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Route not found",
		})
	})
}
