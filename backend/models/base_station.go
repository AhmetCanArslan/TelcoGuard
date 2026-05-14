package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StationType string

const (
	StationTypeLTE   StationType = "LTE"
	StationTypeNR5G  StationType = "NR_5G"
)

type StationStatus string

const (
	StationStatusActive    StationStatus = "ACTIVE"
	StationStatusWarning   StationStatus = "WARNING"
	StationStatusCritical  StationStatus = "CRITICAL"
	StationStatusOffline   StationStatus = "OFFLINE"
)

type BaseStation struct {
	ID           uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Code         string         `gorm:"type:varchar(20);uniqueIndex;not null" json:"code"`
	Name         string         `gorm:"type:varchar(200);not null" json:"name"`
	Latitude     float64        `gorm:"type:decimal(10,8);not null" json:"latitude"`
	Longitude    float64        `gorm:"type:decimal(11,8);not null" json:"longitude"`
	Region       string         `gorm:"type:varchar(50);not null;index" json:"region"`
	Type         StationType    `gorm:"type:varchar(10);not null" json:"type"`
	Capacity     int            `gorm:"not null" json:"capacity"`
	Status       StationStatus  `gorm:"type:varchar(20);default:'ACTIVE';index" json:"status"`
	Metrics      []Metric       `gorm:"foreignKey:StationID" json:"metrics,omitempty"`
	Alarms       []Alarm        `gorm:"foreignKey:StationID" json:"alarms,omitempty"`
	CreatedAt    int64          `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    int64          `gorm:"autoUpdateTime" json:"updated_at"`
}

func (BaseStation) TableName() string {
	return "base_stations"
}

func (b *BaseStation) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
