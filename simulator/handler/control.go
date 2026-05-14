package handler

import (
	"case1/simulator/engine"

	"github.com/gofiber/fiber/v2"
)

type InjectRequest struct {
	StationCode   string              `json:"station_code"`
	AnomalyType   engine.AnomalyType  `json:"anomaly_type"`
	DurationSec   int                 `json:"duration_seconds"`
}

func Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok", "service": "simulator"})
}

func StartSimulator(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if runner.IsRunning() {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Simulator already running",
			})
		}
		go runner.Start()
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Simulator started",
			"data":    runner.GetStatus(),
		})
	}
}

func StopSimulator(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		runner.Stop()
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Simulator stopped",
			"data":    runner.GetStatus(),
		})
	}
}

func InjectAnomaly(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req InjectRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid request body",
			})
		}

		if req.StationCode == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "station_code is required",
			})
		}

		if req.AnomalyType == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "anomaly_type is required",
			})
		}

		if req.DurationSec <= 0 {
			req.DurationSec = 60
		}

		runner.InjectAnomaly(req.StationCode, req.AnomalyType, req.DurationSec)

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Anomaly injected",
			"data": fiber.Map{
				"station_code":   req.StationCode,
				"anomaly_type":   req.AnomalyType,
				"duration_sec":   req.DurationSec,
			},
		})
	}
}

func Status(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"data":    runner.GetStatus(),
		})
	}
}

func ResetSimulator(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		runner.ResetAll()
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Simulator reset — all stations back to normal",
		})
	}
}
