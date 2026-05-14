package handlers

import (
	"case1/services"
	"case1/utils"

	"github.com/gofiber/fiber/v2"
)

var dashboardService = services.NewDashboardService()

// DashboardSummary godoc
// @Summary Dashboard summary
// @Description Get real-time dashboard statistics (station counts, alarm counts, online engineers)
// @Tags dashboard
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.APIResponse{data=services.DashboardSummary}
// @Failure 401 {object} utils.APIResponse
// @Router /api/v1/dashboard/summary [get]
func DashboardSummary(c *fiber.Ctx) error {
	summary, err := dashboardService.GetSummary()
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, summary, "Dashboard summary retrieved")
}
