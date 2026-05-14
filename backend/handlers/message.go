package handlers

import (
	"case1/database"
	"case1/models"

	"github.com/gofiber/fiber/v2"
)

// CreateMessage creates a new message
func CreateMessage(c *fiber.Ctx) error {
	var message models.Message

	if err := c.BodyParser(&message); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	result := database.DB.Create(&message)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": result.Error.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(message)
}

// ListMessages retrieves all messages for a user
func ListMessages(c *fiber.Ctx) error {
	userID := c.Params("user_id")
	var messages []models.Message

	result := database.DB.Where("user_id = ?", userID).Find(&messages)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": result.Error.Error(),
		})
	}

	return c.JSON(messages)
}

// DeleteMessage deletes a message
func DeleteMessage(c *fiber.Ctx) error {
	id := c.Params("id")

	result := database.DB.Delete(&models.Message{}, id)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": result.Error.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Message deleted successfully",
	})
}
