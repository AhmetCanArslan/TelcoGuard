package handlers

import (
	"case1/services"
	"case1/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var stationService = services.NewStationService()

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
