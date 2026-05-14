package repositories

import (
	"case1/database"
	"case1/models"
	"time"

	"github.com/google/uuid"
)

type MetricRepository struct{}

func NewMetricRepository() *MetricRepository {
	return &MetricRepository{}
}

func (r *MetricRepository) Create(metric *models.Metric) error {
	return database.DB.Create(metric).Error
}

func (r *MetricRepository) FindByStationAndTimeRange(stationID uuid.UUID, from, to time.Time) ([]models.Metric, error) {
	var metrics []models.Metric
	result := database.DB.Where("station_id = ? AND timestamp BETWEEN ? AND ?", stationID, from, to).
		Order("timestamp DESC").
		Find(&metrics)
	return metrics, result.Error
}

func (r *MetricRepository) FindLatestByStation(stationID uuid.UUID) (*models.Metric, error) {
	var metric models.Metric
	result := database.DB.Where("station_id = ?", stationID).Order("timestamp DESC").First(&metric)
	if result.Error != nil {
		return nil, result.Error
	}
	return &metric, nil
}

func (r *MetricRepository) FindRecentByStation(stationID uuid.UUID, limit int) ([]models.Metric, error) {
	var metrics []models.Metric
	result := database.DB.Where("station_id = ?", stationID).
		Order("timestamp DESC").
		Limit(limit).
		Find(&metrics)
	return metrics, result.Error
}

func (r *MetricRepository) CreateBatch(metrics []models.Metric) error {
	return database.DB.CreateInBatches(metrics, 100).Error
}
