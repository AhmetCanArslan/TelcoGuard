package repositories

import (
	"case1/database"
	"case1/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AlarmRepository struct{}

func NewAlarmRepository() *AlarmRepository {
	return &AlarmRepository{}
}

func (r *AlarmRepository) Create(alarm *models.Alarm) error {
	return database.DB.Create(alarm).Error
}

func (r *AlarmRepository) FindByID(id uuid.UUID) (*models.Alarm, error) {
	var alarm models.Alarm
	result := database.DB.Preload("Station").Preload("AssignedUser").First(&alarm, "id = ?", id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &alarm, nil
}

func (r *AlarmRepository) FindByFilter(severity, status, stationID string, page, perPage int) ([]models.Alarm, int64, error) {
	var alarms []models.Alarm
	var total int64

	query := database.DB.Model(&models.Alarm{}).Preload("Station").Preload("AssignedUser")

	if severity != "" {
		query = query.Where("severity = ?", severity)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if stationID != "" {
		query = query.Where("station_id = ?", stationID)
	}

	query.Count(&total)
	offset := (page - 1) * perPage
	result := query.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&alarms)
	return alarms, total, result.Error
}

func (r *AlarmRepository) FindOpenByStationAndMetric(stationID uuid.UUID, metricName string) (*models.Alarm, error) {
	var alarm models.Alarm
	result := database.DB.Where(
		"station_id = ? AND metric_name = ? AND status != ? AND created_at > ?",
		stationID, metricName, models.AlarmStatusResolved, time.Now().Add(-5*time.Minute),
	).First(&alarm)

	if result.Error == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if result.Error != nil {
		return nil, result.Error
	}
	return &alarm, nil
}

func (r *AlarmRepository) FindByAssignee(userID uint, status string) ([]models.Alarm, error) {
	var alarms []models.Alarm
	query := database.DB.Where("assigned_to = ?", userID).Preload("Station")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	result := query.Order("created_at DESC").Find(&alarms)
	return alarms, result.Error
}

func (r *AlarmRepository) Update(alarm *models.Alarm) error {
	return database.DB.Save(alarm).Error
}

func (r *AlarmRepository) UpdateStatus(id uuid.UUID, status models.AlarmStatus) error {
	return database.DB.Model(&models.Alarm{}).Where("id = ?", id).Update("status", status).Error
}

func (r *AlarmRepository) FindByDateRange(from, to time.Time) ([]models.Alarm, error) {
	var alarms []models.Alarm
	result := database.DB.Preload("Station").Preload("AssignedUser").
		Where("created_at BETWEEN ? AND ?", from, to).
		Order("created_at DESC").
		Find(&alarms)
	return alarms, result.Error
}

func (r *AlarmRepository) FindResolvedWithEngineer(page, perPage int) ([]models.Alarm, int64, error) {
	var alarms []models.Alarm
	var total int64

	query := database.DB.Model(&models.Alarm{}).
		Preload("Station").Preload("AssignedUser").
		Where("status = ? AND assigned_to IS NOT NULL", models.AlarmStatusResolved)

	query.Count(&total)
	offset := (page - 1) * perPage
	result := query.Order("resolved_at DESC").Offset(offset).Limit(perPage).Find(&alarms)
	return alarms, total, result.Error
}

func (r *AlarmRepository) FindUnresolvedByStation(stationID uuid.UUID) ([]models.Alarm, error) {
	var alarms []models.Alarm
	result := database.DB.Where(
		"station_id = ? AND status != ?",
		stationID, models.AlarmStatusResolved,
	).Find(&alarms)
	return alarms, result.Error
}
