package handlers

import (
	"case1/services"
	"case1/utils"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

var summaryService = services.NewSummaryService()

func SummaryOverview(c *fiber.Ctx) error {
	overview, err := summaryService.GetOverview()
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, overview, "Summary overview retrieved")
}

func SummaryTrends(c *fiber.Ctx) error {
	days := 7
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 && parsed <= 90 {
			days = parsed
		}
	}
	trends, err := summaryService.GetTrends(days)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, trends, "Trends retrieved")
}

func SummaryEngineers(c *fiber.Ctx) error {
	now := time.Now()
	month, _ := strconv.Atoi(c.Query("month"))
	year, _ := strconv.Atoi(c.Query("year"))
	if month < 1 || month > 12 {
		month = int(now.Month())
	}
	if year < 2020 {
		year = now.Year()
	}
	if month == 0 && year == 0 {
		month = int(now.Month())
		year = now.Year()
	}

	analytics, err := summaryService.GetEngineerAnalytics(month, year)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, analytics, "Engineer analytics retrieved")
}

func SummaryFixedIssues(c *fiber.Ctx) error {
	page := 1
	perPage := 20
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if pp := c.Query("per_page"); pp != "" {
		if parsed, err := strconv.Atoi(pp); err == nil && parsed > 0 && parsed <= 100 {
			perPage = parsed
		}
	}

	issues, total, err := summaryService.GetFixedIssues(page, perPage)
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	return utils.SuccessWithMeta(c, issues, "Fixed issues retrieved", utils.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	})
}

func SummaryLocations(c *fiber.Ctx) error {
	locations, err := summaryService.GetLocationAnalysis()
	if err != nil {
		return utils.InternalServerError(c, err.Error())
	}
	return utils.Success(c, locations, "Location analysis retrieved")
}
