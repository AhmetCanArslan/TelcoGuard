package handler

import (
	"bufio"
	"case1/simulator/config"
	"case1/simulator/engine"
	"time"

	"github.com/gofiber/fiber/v2"
)

type InjectRequest struct {
	StationCode string             `json:"station_code"`
	AnomalyType engine.AnomalyType `json:"anomaly_type"`
	DurationSec int                `json:"duration_seconds"`
}

type IntervalRequest struct {
	TickIntervalMs int `json:"tick_interval_ms"`
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
		runner.Start()
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

		if !engine.IsValidAnomalyType(req.AnomalyType) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid anomaly_type. Valid types: CPU_SPIKE, USER_DROP, LATENCY_BURST, PACKET_STORM, STATION_DOWN",
			})
		}

		if req.DurationSec <= 0 {
			req.DurationSec = 60
		}
		if req.DurationSec > 3600 {
			req.DurationSec = 3600
		}

		runner.InjectAnomaly(req.StationCode, req.AnomalyType, req.DurationSec)

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Anomaly injected",
			"data": fiber.Map{
				"station_code": req.StationCode,
				"anomaly_type": req.AnomalyType,
				"duration_sec": req.DurationSec,
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

func ListStations(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		stations := runner.GetStations()
		return c.JSON(fiber.Map{
			"success": true,
			"data":    stations,
		})
	}
}

func SetInterval(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req IntervalRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid request body",
			})
		}

		if req.TickIntervalMs < 500 || req.TickIntervalMs > 30000 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "tick_interval_ms must be between 500 and 30000",
			})
		}

		runner.SetTickInterval(req.TickIntervalMs)

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Tick interval updated",
			"data": fiber.Map{
				"tick_interval_ms": req.TickIntervalMs,
			},
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

func SSEStream(runner *engine.Runner) fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")
		c.Set("Access-Control-Allow-Origin", "*")

		c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
			// Send initial status event
			initial := engine.SimulatorEvent{
				Type:      "simulator_status",
				Timestamp: time.Now(),
				Payload:   runner.GetStatus(),
			}
			if data, err := engine.FormatSSE(initial); err == nil {
				w.WriteString(data)
				w.Flush()
			}

			ch, unsub := engine.SubscribeEvents()
			defer unsub()

			// Also send periodic status updates every 2 seconds
			ticker := time.NewTicker(2 * time.Second)
			defer ticker.Stop()

			for {
				select {
				case event, ok := <-ch:
					if !ok {
						return
					}
					data, err := engine.FormatSSE(event)
					if err != nil {
						continue
					}
					if _, err := w.WriteString(data); err != nil {
						return
					}
					w.Flush()
				case <-ticker.C:
					status := engine.SimulatorEvent{
						Type:      "simulator_status",
						Timestamp: time.Now(),
						Payload:   runner.GetStatus(),
					}
					data, err := engine.FormatSSE(status)
					if err != nil {
						continue
					}
					if _, err := w.WriteString(data); err != nil {
						return
					}
					w.Flush()
				case <-time.After(30 * time.Second):
					// Keep-alive comment to prevent timeout
					w.WriteString(": keep-alive\n\n")
					w.Flush()
				}
			}
		})

		return nil
	}
}

func GetConfig(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"tick_interval_ms": config.AppConfig.TickIntervalMs,
			"backend_url":      config.AppConfig.BackendURL,
			"server_host":      config.AppConfig.ServerHost,
			"server_port":      config.AppConfig.ServerPort,
		},
	})
}
