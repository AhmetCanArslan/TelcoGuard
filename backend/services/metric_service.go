package services

import (
	"case1/models"
	"case1/repositories"
	"time"

	"github.com/google/uuid"
)

type MetricService struct {
	repo *repositories.MetricRepository
}

func NewMetricService() *MetricService {
	return &MetricService{
		repo: repositories.NewMetricRepository(),
	}
}

func (s *MetricService) Ingest(metric *models.Metric) error {
	metric.Timestamp = time.Now()
	return s.repo.Create(metric)
}

func (s *MetricService) GetByStationAndTimeRange(stationID uuid.UUID, from, to time.Time) ([]models.Metric, error) {
	return s.repo.FindByStationAndTimeRange(stationID, from, to)
}

func (s *MetricService) GetLatestByStation(stationID uuid.UUID) (*models.Metric, error) {
	return s.repo.FindLatestByStation(stationID)
}

func (s *MetricService) GetRecentByStation(stationID uuid.UUID, limit int) ([]models.Metric, error) {
	return s.repo.FindRecentByStation(stationID, limit)
}
