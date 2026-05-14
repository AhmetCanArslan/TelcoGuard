package utils

import "github.com/gofiber/fiber/v2"

type Meta struct {
	Page       int   `json:"page,omitempty"`
	PerPage    int   `json:"per_page,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"total_pages,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

func Success(c *fiber.Ctx, data interface{}, message string) error {
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

func SuccessWithMeta(c *fiber.Ctx, data interface{}, message string, meta Meta) error {
	return c.JSON(APIResponse{
		Success: true,
		Data:    data,
		Message: message,
		Meta:    &meta,
	})
}

func Error(c *fiber.Ctx, code int, message string) error {
	return c.Status(code).JSON(APIResponse{
		Success: false,
		Error:   message,
	})
}

func BadRequest(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusBadRequest, message)
}

func Unauthorized(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusUnauthorized, message)
}

func Forbidden(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusForbidden, message)
}

func NotFound(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusNotFound, message)
}

func InternalServerError(c *fiber.Ctx, message string) error {
	return Error(c, fiber.StatusInternalServerError, message)
}
