package services

import (
	"case1/models"
	"case1/repositories"

	"github.com/google/uuid"
)

type StationService struct {
	repo *repositories.StationRepository
}

func NewStationService() *StationService {
	return &StationService{
		repo: repositories.NewStationRepository(),
	}
}

func (s *StationService) GetAll() ([]models.BaseStation, error) {
	return s.repo.FindAll()
}

func (s *StationService) GetByID(id uuid.UUID) (*models.BaseStation, error) {
	return s.repo.FindByID(id)
}

func (s *StationService) UpdateStatus(id uuid.UUID, status models.StationStatus) error {
	return s.repo.UpdateStatus(id, status)
}

func (s *StationService) ResetAllToActive() error {
	return s.repo.ResetAllToActive()
}
