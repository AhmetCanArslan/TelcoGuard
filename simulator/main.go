package main

import (
	"case1/simulator/config"
	"case1/simulator/engine"
	"case1/simulator/routes"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	config.Init()

	// Initialize the runner with seed stations
	runner := engine.NewRunner()
	// Runner starts manually via POST /api/v1/simulator/start

	app := fiber.New(fiber.Config{
		AppName: "TelcoGuard Simulator",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if fe, ok := err.(*fiber.Error); ok {
				code = fe.Code
			}
			log.Printf("❌ Simulator error: %v", err)
			return c.Status(code).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: false,
	}))

	routes.Setup(app, runner)

	addr := config.AppConfig.ServerHost + ":" + config.AppConfig.ServerPort
	log.Printf("🚀 Simulator starting on http://%s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}
