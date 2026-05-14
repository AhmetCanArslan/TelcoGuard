package routes

import (
	"case1/auth"
	"case1/handlers"
	"case1/middleware"
	"case1/models"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func Setup(app *fiber.App) {
	// Global middleware
	app.Use(middleware.Logger())
	app.Use(middleware.CORS())

	// Swagger documentation
	app.Get("/swagger", handlers.SwaggerUI)
	app.Get("/swagger.json", handlers.SwaggerJSON)

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
	authGroup.Post("/reset-password", handlers.ResetPassword)
	authGroup.Post("/send-reset-email", handlers.SendPasswordResetEmail)

	// Simulator metric ingest (public - uses simulator secret)
	api.Post("/stations/:id/metrics", auth.SimulatorAuthRequired(), handlers.IngestMetric)

	// Protected routes
	protected := api.Group("/")
	protected.Use(auth.AuthRequired())

	// Me
	protected.Get("/me", handlers.GetMe)
	protected.Post("/me/password", handlers.UpdatePassword)
	protected.Post("/auth/logout", handlers.Logout)

	// Users (Read: Admin, NOC | Write: Admin)
	users := protected.Group("/users")
	users.Get("", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator), handlers.ListUsers)
	users.Get("/:id", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator), handlers.GetUser)
	users.Post("", auth.RequireRole(models.RoleAdmin), handlers.CreateUser)
	users.Put("/:id", auth.RequireRole(models.RoleAdmin), handlers.UpdateUser)
	users.Delete("/:id", auth.RequireRole(models.RoleAdmin), handlers.DeleteUser)

	// Stations
	stations := protected.Group("/stations")
	stations.Get("", handlers.ListStations)
	stations.Get("/:id", handlers.GetStation)
	stations.Get("/:id/metrics", handlers.GetMetrics)
	stations.Get("/:id/metrics/latest", handlers.GetLatestMetric)

	// Alarms (Management: Admin, NOC | Field Operations: Engineer)
	alarms := protected.Group("/alarms")
	alarms.Get("", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator), handlers.ListAlarms)
	alarms.Get("/assigned", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator, models.RoleFieldEngineer), handlers.GetMyAlarms)
	alarms.Get("/:id", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator, models.RoleFieldEngineer), handlers.GetAlarm)
	alarms.Patch("/:id/acknowledge", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator), handlers.AcknowledgeAlarm)
	alarms.Patch("/:id/assign", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator), handlers.AssignAlarm)
	alarms.Patch("/:id/resolve", auth.RequireRole(models.RoleAdmin, models.RoleNOCOperator, models.RoleFieldEngineer), handlers.ResolveAlarm)

	// Dashboard
	protected.Get("/dashboard/summary", handlers.DashboardSummary)

	// Summary & Analytics (Admin + Network Manager)
	summary := protected.Group("/summary")
	summary.Use(auth.RequireRole(models.RoleAdmin, models.RoleNetworkManager))
	summary.Get("/overview", handlers.SummaryOverview)
	summary.Get("/trends", handlers.SummaryTrends)
	summary.Get("/engineers", handlers.SummaryEngineers)
	summary.Get("/fixed-issues", handlers.SummaryFixedIssues)
	summary.Get("/locations", handlers.SummaryLocations)

	// Simulator proxy - all requests to /api/simulator/* go to simulator service
	app.All("/api/simulator/*", handlers.ProxySimulator)

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
