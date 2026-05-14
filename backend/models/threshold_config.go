package models

type ThresholdDirection string

const (
	ThresholdDirectionAbove ThresholdDirection = "ABOVE"
	ThresholdDirectionBelow ThresholdDirection = "BELOW"
)

type ThresholdConfig struct {
	ID                uint               `gorm:"primaryKey" json:"id"`
	MetricName        string             `gorm:"type:varchar(50);uniqueIndex;not null" json:"metric_name"`
	WarningThreshold  float64            `gorm:"type:decimal(10,2);not null" json:"warning_threshold"`
	CriticalThreshold float64            `gorm:"type:decimal(10,2);not null" json:"critical_threshold"`
	Direction         ThresholdDirection `gorm:"type:varchar(10);not null" json:"direction"`
	IsActive          bool               `gorm:"default:true" json:"is_active"`
}

func (ThresholdConfig) TableName() string {
	return "threshold_configs"
}
