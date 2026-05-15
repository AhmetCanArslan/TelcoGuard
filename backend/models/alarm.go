package models

import (
	"time"

	"github.com/google/uuid"
)

type AlarmSeverity string

const (
	AlarmSeverityWarning  AlarmSeverity = "WARNING"
	AlarmSeverityCritical AlarmSeverity = "CRITICAL"
)

type AlarmStatus string

const (
	AlarmStatusOpen          AlarmStatus = "OPEN"
	AlarmStatusAcknowledged  AlarmStatus = "ACKNOWLEDGED"
	AlarmStatusInProgress    AlarmStatus = "IN_PROGRESS"
	AlarmStatusResolved      AlarmStatus = "RESOLVED"
	AlarmStatusRejected      AlarmStatus = "REJECTED"
)

type Alarm struct {
	ID              uuid.UUID     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StationID       uuid.UUID     `gorm:"type:uuid;not null;index" json:"station_id"`
	Station         BaseStation   `gorm:"foreignKey:StationID" json:"station,omitempty"`
	MetricName      string        `gorm:"type:varchar(50);not null" json:"metric_name"`
	Severity        AlarmSeverity `gorm:"type:varchar(20);not null;index" json:"severity"`
	Status          AlarmStatus   `gorm:"type:varchar(20);default:'OPEN';index" json:"status"`
	Message         string        `gorm:"type:text;not null" json:"message"`
	AssignedTo      *uint         `gorm:"index" json:"assigned_to,omitempty"`
	AssignedUser    *User         `gorm:"foreignKey:AssignedTo" json:"assigned_user,omitempty"`
	ResolutionNote  string        `gorm:"type:text" json:"resolution_note,omitempty"`
	RejectionNote   string        `gorm:"type:text" json:"rejection_note,omitempty"`
	CreatedAt       time.Time     `gorm:"not null;index" json:"created_at"`
	AcknowledgedAt  *time.Time    `json:"acknowledged_at,omitempty"`
	ResolvedAt      *time.Time    `json:"resolved_at,omitempty"`
	RejectedAt      *time.Time    `json:"rejected_at,omitempty"`
}

func (Alarm) TableName() string {
	return "alarms"
}
