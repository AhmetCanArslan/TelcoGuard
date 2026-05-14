package repositories

import (
	"case1/database"
	"case1/models"
)

type ThresholdRepository struct{}

func NewThresholdRepository() *ThresholdRepository {
	return &ThresholdRepository{}
}

func (r *ThresholdRepository) FindAllActive() ([]models.ThresholdConfig, error) {
	var configs []models.ThresholdConfig
	result := database.DB.Where("is_active = true").Find(&configs)
	return configs, result.Error
}

func (r *ThresholdRepository) FindByMetric(metricName string) (*models.ThresholdConfig, error) {
	var config models.ThresholdConfig
	result := database.DB.Where("metric_name = ? AND is_active = true", metricName).First(&config)
	if result.Error != nil {
		return nil, result.Error
	}
	return &config, nil
}

func (r *ThresholdRepository) CreateOrUpdate(config *models.ThresholdConfig) error {
	var existing models.ThresholdConfig
	result := database.DB.Where("metric_name = ?", config.MetricName).First(&existing)
	if result.Error != nil {
		return database.DB.Create(config).Error
	}
	config.ID = existing.ID
	return database.DB.Save(config).Error
}
