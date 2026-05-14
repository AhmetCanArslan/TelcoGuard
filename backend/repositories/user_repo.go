package repositories

import (
	"case1/database"
	"case1/models"
)

type UserRepository struct{}

func NewUserRepository() *UserRepository {
	return &UserRepository{}
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	result := database.DB.Where("email = ?", email).First(&user)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *UserRepository) FindByRole(role models.Role) ([]models.User, error) {
	var users []models.User
	result := database.DB.Where("role = ? AND active = true", role).Find(&users)
	return users, result.Error
}

func (r *UserRepository) FindFieldEngineers() ([]models.User, error) {
	var users []models.User
	result := database.DB.Where("role = ? AND active = true", models.RoleFieldEngineer).Find(&users)
	return users, result.Error
}

func (r *UserRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	result := database.DB.First(&user, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &user, nil
}

func (r *UserRepository) UpdateOnlineStatus(id uint, isOnline bool) error {
	return database.DB.Model(&models.User{}).Where("id = ?", id).Update("is_online", isOnline).Error
}
