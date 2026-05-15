package routes

import (
	"case1/simulator/engine"
	"case1/simulator/handler"

	"github.com/gofiber/fiber/v2"
)

func Setup(app *fiber.App, runner *engine.Runner) {
	app.Get("/health", handler.Health)

	api := app.Group("/api/v1")
	sim := api.Group("/simulator")
	sim.Post("/start", handler.StartSimulator(runner))
	sim.Post("/stop", handler.StopSimulator(runner))
	sim.Post("/reset", handler.ResetSimulator(runner))
	sim.Post("/inject-anomaly", handler.InjectAnomaly(runner))
	sim.Get("/status", handler.Status(runner))

	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Route not found",
		})
	})
}
