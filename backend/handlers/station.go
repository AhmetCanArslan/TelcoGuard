package handlers

import (
	"case1/models"
	"case1/utils"
	ws "case1/websocket"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ListStations godoc
// @Summary List all stations
// @Description Get all base stations with their current status
// @Tags stations
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.APIResponse{data=[]models.BaseStation}
// @Failure 401 {object} utils.APIResponse
// @Router /api/v1/stations [get]
func ListStations(c *fiber.Ctx) error {
	stations, err := stationService.GetAll()
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, stations, "Stations retrieved")
}

// GetStation godoc
// @Summary Get station by ID
// @Description Get detailed information about a specific station
// @Tags stations
// @Produce json
// @Security BearerAuth
// @Param id path string true "Station ID (UUID)"
// @Success 200 {object} utils.APIResponse{data=models.BaseStation}
// @Failure 400 {object} utils.APIResponse
// @Failure 404 {object} utils.APIResponse
// @Router /api/v1/stations/{id} [get]
func GetStation(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid station ID")
	}
	station, err := stationService.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Station not found")
	}
	return utils.Success(c, station, "Station retrieved")
}

// UpdateStationStatus godoc
// @Summary Update station status
// @Description Update a station's status (ACTIVE, WARNING, CRITICAL, OFFLINE)
// @Tags stations
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Station ID (UUID)"
// @Param request body UpdateStatusRequest true "Status update"
// @Success 200 {object} utils.APIResponse{data=models.BaseStation}
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/stations/{id}/status [patch]
type UpdateStatusRequest struct {
	Status models.StationStatus `json:"status"`
}

func UpdateStationStatus(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid station ID")
	}

	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Status != models.StationStatusActive &&
		req.Status != models.StationStatusWarning &&
		req.Status != models.StationStatusCritical &&
		req.Status != models.StationStatusOffline {
		return utils.BadRequest(c, "Invalid status value")
	}

	station, err := stationService.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Station not found")
	}

	oldStatus := string(station.Status)
	if err := stationService.UpdateStatus(id, req.Status); err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	station, _ = stationService.GetByID(id)

	Hub.BroadcastTyped(ws.MessageTypeStationStatus, ws.StationStatusPayload{
		StationID: id.String(),
		OldStatus: oldStatus,
		NewStatus: string(req.Status),
	})

	return utils.Success(c, station, "Station status updated")
}
