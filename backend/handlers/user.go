package handlers

import (
	"case1/auth"
	"case1/database"
	"case1/models"
	"case1/utils"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func ListUsers(c *fiber.Ctx) error {
	var users []models.User
	result := database.DB.Find(&users)
	if result.Error != nil {
		return utils.InternalServerError(c, result.Error.Error())
	}
	for i := range users {
		users[i].Password = ""
	}
	return utils.Success(c, users, "Users retrieved")
}

func GetUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var user models.User
	result := database.DB.First(&user, id)
	if result.Error != nil {
		return utils.NotFound(c, "User not found")
	}
	user.Password = ""
	return utils.Success(c, user, "User retrieved")
}

func UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.User
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	updateData := fiber.Map{}
	if req.Name != "" {
		updateData["name"] = req.Name
	}
	if req.Phone != "" {
		updateData["phone"] = req.Phone
	}
	if req.Latitude != nil {
		updateData["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		updateData["longitude"] = *req.Longitude
	}
	if req.IsOnline {
		updateData["is_online"] = req.IsOnline
	}

	result := database.DB.Model(&models.User{}).Where("id = ?", id).Updates(updateData)
	if result.Error != nil {
		return utils.InternalServerError(c, result.Error.Error())
	}

	return utils.Success(c, nil, "User updated successfully")
}

func DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	result := database.DB.Delete(&models.User{}, id)
	if result.Error != nil {
		return utils.InternalServerError(c, result.Error.Error())
	}
	return utils.Success(c, nil, "User deleted successfully")
}

func UpdatePassword(c *fiber.Ctx) error {
	type passwordReq struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	var req passwordReq
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	userID := auth.GetUserID(c)
	var user models.User
	if database.DB.First(&user, userID).Error != nil {
		return utils.NotFound(c, "User not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return utils.Unauthorized(c, "Invalid old password")
	}

	if err := utils.ValidatePassword(req.NewPassword); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return utils.InternalServerError(c, "Failed to hash password")
	}

	database.DB.Model(&user).Update("password", string(hashed))
	return utils.Success(c, nil, "Password updated successfully")
}
