package routes

import (
	"case1/auth"
	"case1/handlers"
	"case1/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/swagger"
	"github.com/gofiber/websocket/v2"

	_ "case1/docs"
)

func Setup(app *fiber.App) {
	// Global middleware
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	// Swagger documentation
	app.Get("/swagger/*", swagger.HandlerDefault)

	// Health check
	app.Get("/health", handlers.Health)

	// API v1 group
	api := app.Group("/api/v1")

	// Auth routes (public)
	authGroup := api.Group("/auth")
	authGroup.Post("/register", handlers.Register)
	authGroup.Post("/login", handlers.Login)
	authGroup.Post("/otp/send", handlers.SendOTP)
	authGroup.Post("/otp/verify", handlers.VerifyOTP)
	authGroup.Post("/refresh", handlers.RefreshToken)

	// Simulator metric ingest (public - uses simulator secret)
	api.Post("/stations/:id/metrics", auth.SimulatorAuthRequired(), handlers.IngestMetric)

	// Protected routes
	protected := api.Group("/")
	protected.Use(auth.AuthRequired())

	// Me
	protected.Get("/me", handlers.GetMe)
	protected.Post("/me/password", handlers.UpdatePassword)

	// Users
	users := protected.Group("/users")
	users.Get("", handlers.ListUsers)
	users.Get("/:id", handlers.GetUser)
	users.Put("/:id", handlers.UpdateUser)
	users.Delete("/:id", handlers.DeleteUser)

	// Stations
	stations := protected.Group("/stations")
	stations.Get("", handlers.ListStations)
	stations.Get("/:id", handlers.GetStation)
	stations.Get("/:id/metrics", handlers.GetMetrics)
	stations.Get("/:id/metrics/latest", handlers.GetLatestMetric)

	// Alarms
	alarms := protected.Group("/alarms")
	alarms.Get("", handlers.ListAlarms)
	alarms.Get("/assigned", handlers.GetMyAlarms)
	alarms.Get("/:id", handlers.GetAlarm)
	alarms.Patch("/:id/acknowledge", handlers.AcknowledgeAlarm)
	alarms.Patch("/:id/assign", handlers.AssignAlarm)
	alarms.Patch("/:id/resolve", handlers.ResolveAlarm)

	// Dashboard
	protected.Get("/dashboard/summary", handlers.DashboardSummary)

	// WebSocket
	app.Get("/ws", websocket.New(handlers.WebSocketHandler))

	// 404
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Route not found",
		})
	})
}
