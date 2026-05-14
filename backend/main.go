package main

import (
	"case1/config"
	"case1/database"
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
}

func main() {
	defer func() {
		if err := database.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Case1 Backend",
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
