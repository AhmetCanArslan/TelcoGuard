package handlers

import (
	"case1/anomaly"
	"case1/models"
	"case1/services"
	"case1/utils"
	ws "case1/websocket"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var (
	metricService  = services.NewMetricService()
	anomalyEngine  = anomaly.NewEngine()
	stationService = services.NewStationService()
)

func init() {
	// Wire Hub into anomaly engine for WS broadcasts
	anomalyEngine.SetHub(Hub)
}

type MetricPayload struct {
	CpuUsage       float64 `json:"cpu_usage"`
	MemoryUsage    float64 `json:"memory_usage"`
	PacketLoss     float64 `json:"packet_loss"`
	Latency        float64 `json:"latency"`
	Rssi           float64 `json:"rssi"`
	ConnectedUsers int     `json:"connected_users"`
}

// IngestMetric godoc
// @Summary Ingest metric data
// @Description Submit telemetry metrics for a station (simulator endpoint)
// @Tags metrics
// @Accept json
// @Produce json
// @Param id path string true "Station ID (UUID)"
// @Param request body MetricPayload true "Metric data"
// @Success 200 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/stations/{id}/metrics [post]
func IngestMetric(c *fiber.Ctx) error {
	stationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid station ID")
	}

	// Check if station is offline - skip metric processing for offline stations
	station, err := stationService.GetByID(stationID)
	if err == nil && station.Status == models.StationStatusOffline {
		return utils.Success(c, nil, "Station is offline, metric ignored")
	}

	var payload MetricPayload
	if err := c.BodyParser(&payload); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	metric := &models.Metric{
		StationID:      stationID,
		CpuUsage:       payload.CpuUsage,
		MemoryUsage:    payload.MemoryUsage,
		PacketLoss:     payload.PacketLoss,
		Latency:        payload.Latency,
		Rssi:           payload.Rssi,
		ConnectedUsers: payload.ConnectedUsers,
	}

	if err := metricService.Ingest(metric); err != nil {
		return utils.InternalServerError(c, "Failed to store metric")
	}

	go anomalyEngine.Process(metric)

	// Broadcast metric update via WebSocket
	go Hub.BroadcastTyped(ws.MessageTypeMetricUpdate, ws.MetricUpdatePayload{
		StationID:      stationID.String(),
		Timestamp:      metric.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
		CpuUsage:       metric.CpuUsage,
		MemoryUsage:    metric.MemoryUsage,
		PacketLoss:     metric.PacketLoss,
		Latency:        metric.Latency,
		Rssi:           metric.Rssi,
		ConnectedUsers: metric.ConnectedUsers,
	})

	return utils.Success(c, nil, "Metric ingested")
}

// GetMetrics godoc
// @Summary Get metrics for a station
// @Description Query time-series metrics for a station within a date range
// @Tags metrics
// @Produce json
// @Security BearerAuth
// @Param id path string true "Station ID (UUID)"
// @Param from query string false "Start time (RFC3339)"
// @Param to query string false "End time (RFC3339)"
// @Success 200 {object} utils.APIResponse{data=[]models.Metric}
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/stations/{id}/metrics [get]
func GetMetrics(c *fiber.Ctx) error {
	stationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid station ID")
	}

	fromStr := c.Query("from")
	toStr := c.Query("to")

	var from, to time.Time
	if fromStr != "" {
		from, _ = time.Parse(time.RFC3339, fromStr)
	} else {
		from = time.Now().Add(-24 * time.Hour)
	}
	if toStr != "" {
		to, _ = time.Parse(time.RFC3339, toStr)
	} else {
		to = time.Now()
	}

	metrics, err := metricService.GetByStationAndTimeRange(stationID, from, to)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, metrics, "Metrics retrieved")
}

// GetLatestMetric godoc
// @Summary Get latest metric
// @Description Get the most recent metric reading for a station
// @Tags metrics
// @Produce json
// @Security BearerAuth
// @Param id path string true "Station ID (UUID)"
// @Success 200 {object} utils.APIResponse{data=models.Metric}
// @Failure 404 {object} utils.APIResponse
// @Router /api/v1/stations/{id}/metrics/latest [get]
func GetLatestMetric(c *fiber.Ctx) error {
	stationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid station ID")
	}

	metric, err := metricService.GetLatestByStation(stationID)
	if err != nil {
		return utils.NotFound(c, "No metrics found")
	}
	return utils.Success(c, metric, "Latest metric retrieved")
}
