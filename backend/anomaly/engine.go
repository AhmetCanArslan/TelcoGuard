package anomaly

import (
	"case1/models"
	"case1/repositories"
	"case1/services"
	ws "case1/websocket"
	"log"

	"github.com/google/uuid"
)

type AnomalyResult struct {
	StationID  uuid.UUID
	MetricName string
	Severity   models.AlarmSeverity
	Value      float64
	Message    string
}

type Engine struct {
	thresholdDetector *ThresholdDetector
	movingAvgDetector *MovingAvgDetector
	zScoreDetector    *ZScoreDetector
	correlator        *Correlator
	alarmService      *services.AlarmService
	stationRepo       *repositories.StationRepository
	hub               *ws.Hub
}

func NewEngine() *Engine {
	return &Engine{
		thresholdDetector: NewThresholdDetector(),
		movingAvgDetector: NewMovingAvgDetector(),
		zScoreDetector:    NewZScoreDetector(),
		correlator:        NewCorrelator(),
		alarmService:      services.NewAlarmService(),
		stationRepo:       repositories.NewStationRepository(),
	}
}

func (e *Engine) SetHub(hub *ws.Hub) {
	e.hub = hub
}

func (e *Engine) Process(metric *models.Metric) ([]models.Alarm, error) {
	var allResults []AnomalyResult

	// Run all detectors
	if results, err := e.thresholdDetector.Detect(metric); err == nil {
		allResults = append(allResults, results...)
	} else {
		log.Printf("Threshold detection error: %v", err)
	}

	if results, err := e.movingAvgDetector.Detect(metric); err == nil {
		allResults = append(allResults, results...)
	} else {
		log.Printf("Moving avg detection error: %v", err)
	}

	if results, err := e.zScoreDetector.Detect(metric); err == nil {
		allResults = append(allResults, results...)
	} else {
		log.Printf("Z-score detection error: %v", err)
	}

	if len(allResults) == 0 {
		return nil, nil
	}

	// Correlate
	allResults = e.correlator.Correlate(allResults)

	// Create/update alarms and determine max severity
	var createdAlarms []models.Alarm
	maxSeverity := models.AlarmSeverityWarning

	for _, result := range allResults {
		if result.Severity == models.AlarmSeverityCritical {
			maxSeverity = models.AlarmSeverityCritical
		}

		alarm, err := e.alarmService.CreateOrUpdate(
			metric.StationID,
			result.MetricName,
			result.Severity,
			result.Message,
		)
		if err != nil {
			log.Printf("Failed to create alarm: %v", err)
			continue
		}
		createdAlarms = append(createdAlarms, *alarm)
		// Broadcast new alarm via WebSocket
		if e.hub != nil {
			e.hub.BroadcastTyped(ws.MessageTypeNewAlarm, ws.AlarmPayload{Alarm: alarm})
		}
	}

	// Update station status based on max severity
	var status models.StationStatus
	switch maxSeverity {
	case models.AlarmSeverityCritical:
		status = models.StationStatusCritical
	case models.AlarmSeverityWarning:
		status = models.StationStatusWarning
	default:
		status = models.StationStatusActive
	}

	if err := e.stationRepo.UpdateStatus(metric.StationID, status); err != nil {
		log.Printf("Failed to update station status: %v", err)
	}

	return createdAlarms, nil
}
