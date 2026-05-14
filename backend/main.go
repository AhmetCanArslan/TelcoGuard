// @title TelcoGuard API
// @version 1.0
// @description TelcoGuard — Gerçek Zamanlı Şebeke İzleme ve Anomali Tespit Platformu
// @termsOfService http://swagger.io/terms/

// @contact.name Turkcell CodeNight 2026
// @contact.url https://turkcell.com.tr

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:3000
// @BasePath /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

package main

import (
	"case1/auth"
	"case1/config"
	"case1/database"
	"case1/middleware"
	"case1/routes"
	"log"

	"github.com/gofiber/fiber/v2"
)

func init() {
	// Initialize configuration
	config.Init()

	// Initialize database
	if err := database.Init(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Seed data
	if err := database.Seed(); err != nil {
		log.Printf("Warning: failed to seed database: %v", err)
	}

	// Initialize Firebase (optional)
	auth.InitFirebase()
}

func main() {
	defer func() {
		if err := database.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "TelcoGuard Backend",
		ErrorHandler: middleware.ErrorHandler(),
	})

	// Setup routes
	routes.Setup(app)

	// Start server
	addr := config.AppConfig.ServerHost + ":" + config.AppConfig.ServerPort
	log.Printf("🚀 Server starting on http://%s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}
