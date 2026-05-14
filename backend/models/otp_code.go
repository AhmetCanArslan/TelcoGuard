package models

import "time"

type OtpCode struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Contact   string    `gorm:"type:varchar(150);index;not null" json:"contact"`
	Method    string    `gorm:"type:varchar(10);not null" json:"method"` // email or sms
	CodeHash  string    `gorm:"type:varchar(64);not null" json:"-"`
	ExpiresAt time.Time `gorm:"not null;index" json:"expires_at"`
	Attempts  int       `gorm:"default:0" json:"attempts"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
}

func (OtpCode) TableName() string {
	return "otp_codes"
}
