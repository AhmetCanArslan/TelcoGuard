package main

import (
	"case1/simulator/config"
	"case1/simulator/engine"
	"case1/simulator/routes"
	"log"

	"github.com/gofiber/fiber/v2"
)

func main() {
	config.Init()

	// Initialize the runner with seed stations
	runner := engine.NewRunner()
	// Runner starts manually via POST /api/v1/simulator/start

	app := fiber.New(fiber.Config{
		AppName: "TelcoGuard Simulator",
	})

	routes.Setup(app, runner)

	addr := config.AppConfig.ServerHost + ":" + config.AppConfig.ServerPort
	log.Printf("🚀 Simulator starting on http://%s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}
