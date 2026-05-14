package models

import (
	"time"

	"github.com/google/uuid"
)

type Metric struct {
	ID              uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	StationID       uuid.UUID  `gorm:"type:uuid;not null;index:idx_metrics_station_timestamp,priority:1" json:"station_id"`
	Station         BaseStation `gorm:"foreignKey:StationID" json:"station,omitempty"`
	Timestamp       time.Time  `gorm:"not null;index:idx_metrics_station_timestamp,priority:2" json:"timestamp"`
	CpuUsage        float64    `gorm:"type:decimal(5,2);not null" json:"cpu_usage"`
	MemoryUsage     float64    `gorm:"type:decimal(5,2);not null" json:"memory_usage"`
	PacketLoss      float64    `gorm:"type:decimal(5,2);not null" json:"packet_loss"`
	Latency         float64    `gorm:"type:decimal(8,2);not null" json:"latency"`
	Rssi            float64    `gorm:"type:decimal(6,2);not null" json:"rssi"`
	ConnectedUsers  int        `gorm:"not null" json:"connected_users"`
}

func (Metric) TableName() string {
	return "metrics"
}
