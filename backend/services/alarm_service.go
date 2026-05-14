package services

import (
	"case1/models"
	"case1/repositories"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type AlarmService struct {
	repo *repositories.AlarmRepository
}

func NewAlarmService() *AlarmService {
	return &AlarmService{
		repo: repositories.NewAlarmRepository(),
	}
}

func (s *AlarmService) CreateOrUpdate(stationID uuid.UUID, metricName string, severity models.AlarmSeverity, message string) (*models.Alarm, error) {
	// Check for duplicate within 5 minutes
	existing, err := s.repo.FindOpenByStationAndMetric(stationID, metricName)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		// Update existing alarm
		existing.Severity = severity
		existing.Message = message
		existing.CreatedAt = time.Now()
		if err := s.repo.Update(existing); err != nil {
			return nil, err
		}
		return existing, nil
	}

	// Create new alarm
	alarm := &models.Alarm{
		StationID:  stationID,
		MetricName: metricName,
		Severity:   severity,
		Status:     models.AlarmStatusOpen,
		Message:    message,
		CreatedAt:  time.Now(),
	}
	if err := s.repo.Create(alarm); err != nil {
		return nil, err
	}
	return alarm, nil
}

func (s *AlarmService) Acknowledge(alarmID uuid.UUID) (*models.Alarm, error) {
	alarm, err := s.repo.FindByID(alarmID)
	if err != nil {
		return nil, err
	}
	if alarm.Status != models.AlarmStatusOpen {
		return nil, fmt.Errorf("alarm is not open")
	}
	now := time.Now()
	alarm.Status = models.AlarmStatusAcknowledged
	alarm.AcknowledgedAt = &now
	if err := s.repo.Update(alarm); err != nil {
		return nil, err
	}
	return alarm, nil
}

func (s *AlarmService) Assign(alarmID uuid.UUID, userID uint) (*models.Alarm, error) {
	alarm, err := s.repo.FindByID(alarmID)
	if err != nil {
		return nil, err
	}
	if alarm.Status == models.AlarmStatusResolved {
		return nil, fmt.Errorf("alarm is already resolved")
	}
	alarm.AssignedTo = &userID
	alarm.Status = models.AlarmStatusInProgress
	if err := s.repo.Update(alarm); err != nil {
		return nil, err
	}
	return alarm, nil
}

func (s *AlarmService) Resolve(alarmID uuid.UUID, resolutionNote string) (*models.Alarm, error) {
	alarm, err := s.repo.FindByID(alarmID)
	if err != nil {
		return nil, err
	}
	if alarm.Status == models.AlarmStatusResolved {
		return nil, fmt.Errorf("alarm is already resolved")
	}
	now := time.Now()
	alarm.Status = models.AlarmStatusResolved
	alarm.ResolutionNote = resolutionNote
	alarm.ResolvedAt = &now
	if err := s.repo.Update(alarm); err != nil {
		return nil, err
	}
	return alarm, nil
}

func (s *AlarmService) GetByID(id uuid.UUID) (*models.Alarm, error) {
	return s.repo.FindByID(id)
}

func (s *AlarmService) GetByFilter(severity, status, stationID string, page, perPage int) ([]models.Alarm, int64, error) {
	return s.repo.FindByFilter(severity, status, stationID, page, perPage)
}

func (s *AlarmService) GetByAssignee(userID uint, status string) ([]models.Alarm, error) {
	return s.repo.FindByAssignee(userID, status)
}

func (s *AlarmService) DeleteAll() error {
	return s.repo.DeleteAll()
}
