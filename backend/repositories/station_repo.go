package repositories

import (
	"case1/database"
	"case1/models"

	"github.com/google/uuid"
)

type StationRepository struct{}

func NewStationRepository() *StationRepository {
	return &StationRepository{}
}

func (r *StationRepository) FindAll() ([]models.BaseStation, error) {
	var stations []models.BaseStation
	result := database.DB.Find(&stations)
	return stations, result.Error
}

func (r *StationRepository) FindByID(id uuid.UUID) (*models.BaseStation, error) {
	var station models.BaseStation
	result := database.DB.First(&station, "id = ?", id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &station, nil
}

func (r *StationRepository) FindByCode(code string) (*models.BaseStation, error) {
	var station models.BaseStation
	result := database.DB.First(&station, "code = ?", code)
	if result.Error != nil {
		return nil, result.Error
	}
	return &station, nil
}

func (r *StationRepository) FindByRegion(region string) ([]models.BaseStation, error) {
	var stations []models.BaseStation
	result := database.DB.Where("region = ?", region).Find(&stations)
	return stations, result.Error
}

func (r *StationRepository) UpdateStatus(id uuid.UUID, status models.StationStatus) error {
	return database.DB.Model(&models.BaseStation{}).Where("id = ?", id).Update("status", status).Error
}

func (r *StationRepository) ResetAllToActive() error {
	return database.DB.Exec("UPDATE base_stations SET status = 'ACTIVE'").Error
}
