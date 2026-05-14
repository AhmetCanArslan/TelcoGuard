package handlers

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
)

var (
	simulatorClient = &http.Client{Timeout: 10 * time.Second}
	simulatorURL    = getSimulatorURLFromEnv()
)

func getSimulatorURLFromEnv() string {
	if url := os.Getenv("SIMULATOR_URL"); url != "" {
		return url
	}
	return "http://localhost:3001"
}

func ProxySimulator(c *fiber.Ctx) error {
	path := c.Params("*")

	target := simulatorURL + "/api/v1/simulator/" + path

	var bodyBytes []byte
	if len(c.Body()) > 0 {
		bodyBytes = c.Body()
	}

	req, err := http.NewRequest(c.Method(), target, bytes.NewReader(bodyBytes))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create proxy request",
			"error":   "Failed to create proxy request",
		})
	}

	contentType := c.Get("Content-Type")
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := simulatorClient.Do(req)
	if err != nil {
		log.Printf("Simulator proxy error: %v", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"success": false,
			"message": "Simulator unreachable - is it running?",
			"error":   "Simulator unreachable",
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"success": false,
			"message": "Failed to read simulator response",
			"error":   "Failed to read simulator response",
		})
	}

	c.Set("Content-Type", "application/json")
	c.Status(resp.StatusCode)
	return c.Send(body)
}
