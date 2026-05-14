package handlers

import (
	"case1/auth"
	"case1/services"
	"case1/utils"
	ws "case1/websocket"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var (
	alarmService      = services.NewAlarmService()
	assignmentService = services.NewAssignmentService()
)

// ListAlarms godoc
// @Summary List alarms
// @Description Get alarms with optional filtering by severity, status, and station
// @Tags alarms
// @Produce json
// @Security BearerAuth
// @Param severity query string false "Filter by severity (WARNING, CRITICAL)"
// @Param status query string false "Filter by status (OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED)"
// @Param station query string false "Filter by station ID"
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(20)
// @Success 200 {object} utils.APIResponse{data=[]models.Alarm}
// @Failure 401 {object} utils.APIResponse
// @Router /api/v1/alarms [get]
func ListAlarms(c *fiber.Ctx) error {
	severity := c.Query("severity")
	status := c.Query("status")
	stationID := c.Query("station")
	page := utils.DefaultInt(c.Query("page"), 1)
	perPage := utils.DefaultInt(c.Query("per_page"), 20)

	alarms, total, err := alarmService.GetByFilter(severity, status, stationID, page, perPage)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}

	meta := utils.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}
	return utils.SuccessWithMeta(c, alarms, "Alarms retrieved", meta)
}

// GetAlarm godoc
// @Summary Get alarm by ID
// @Description Get detailed information about a specific alarm
// @Tags alarms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Alarm ID (UUID)"
// @Success 200 {object} utils.APIResponse{data=models.Alarm}
// @Failure 404 {object} utils.APIResponse
// @Router /api/v1/alarms/{id} [get]
func GetAlarm(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid alarm ID")
	}
	alarm, err := alarmService.GetByID(id)
	if err != nil {
		return utils.NotFound(c, "Alarm not found")
	}
	return utils.Success(c, alarm, "Alarm retrieved")
}

// GetMyAlarms godoc
// @Summary Get assigned alarms
// @Description Get alarms assigned to the current field engineer
// @Tags alarms
// @Produce json
// @Security BearerAuth
// @Param status query string false "Filter by status"
// @Success 200 {object} utils.APIResponse{data=[]models.Alarm}
// @Router /api/v1/alarms/assigned [get]
func GetMyAlarms(c *fiber.Ctx) error {
	userID := auth.GetUserID(c)
	status := c.Query("status")
	alarms, err := alarmService.GetByAssignee(userID, status)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, alarms, "My alarms retrieved")
}

// AcknowledgeAlarm godoc
// @Summary Acknowledge alarm
// @Description Mark an alarm as acknowledged (NOC Operator)
// @Tags alarms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Alarm ID (UUID)"
// @Success 200 {object} utils.APIResponse{data=models.Alarm}
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/alarms/{id}/acknowledge [patch]
func AcknowledgeAlarm(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid alarm ID")
	}

	alarm, err := alarmService.Acknowledge(id)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	go Hub.BroadcastTyped(ws.MessageTypeAlarmUpdate, ws.AlarmPayload{Alarm: alarm})
	return utils.Success(c, alarm, "Alarm acknowledged")
}

type AssignRequest struct {
	UserID uint `json:"user_id"`
}

// AssignAlarm godoc
// @Summary Assign alarm
// @Description Assign an alarm to a field engineer (auto-finds nearest if no user_id)
// @Tags alarms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Alarm ID (UUID)"
// @Param request body AssignRequest false "Assignment details"
// @Success 200 {object} utils.APIResponse{data=models.Alarm}
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/alarms/{id}/assign [patch]
func AssignAlarm(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid alarm ID")
	}

	var req AssignRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.UserID == 0 {
		alarm, err := alarmService.GetByID(id)
		if err != nil {
			return utils.NotFound(c, "Alarm not found")
		}
		stationService := services.NewStationService()
		station, err := stationService.GetByID(alarm.StationID)
		if err != nil {
			return utils.NotFound(c, "Station not found")
		}

		engineer, err := assignmentService.FindNearestEngineer(station.Latitude, station.Longitude)
		if err != nil {
			return utils.InternalServerError(c, err.Error())
		}
		if engineer == nil {
			return utils.BadRequest(c, "No available field engineer found")
		}
		req.UserID = engineer.ID
	}

	alarm, err := alarmService.Assign(id, req.UserID)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	go Hub.BroadcastTyped(ws.MessageTypeAlarmUpdate, ws.AlarmPayload{Alarm: alarm})
	return utils.Success(c, alarm, "Alarm assigned")
}

type ResolveRequest struct {
	ResolutionNote string `json:"resolution_note"`
}

// ResolveAlarm godoc
// @Summary Resolve alarm
// @Description Mark an alarm as resolved with a resolution note
// @Tags alarms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Alarm ID (UUID)"
// @Param request body ResolveRequest true "Resolution details"
// @Success 200 {object} utils.APIResponse{data=models.Alarm}
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/alarms/{id}/resolve [patch]
func ResolveAlarm(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequest(c, "Invalid alarm ID")
	}

	var req ResolveRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	alarm, err := alarmService.Resolve(id, req.ResolutionNote)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}
	go Hub.BroadcastTyped(ws.MessageTypeAlarmUpdate, ws.AlarmPayload{Alarm: alarm})
	return utils.Success(c, alarm, "Alarm resolved")
}
