package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin           Role = "ADMIN"
	RoleNOCOperator     Role = "NOC_OPERATOR"
	RoleFieldEngineer   Role = "FIELD_ENGINEER"
	RoleNetworkManager  Role = "NETWORK_MANAGER"
)

type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"type:varchar(100);not null" json:"name"`
	Email        string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	Password     string         `gorm:"type:varchar(255);not null" json:"-"`
	Phone        string         `gorm:"type:varchar(20);index" json:"phone,omitempty"`
	Role         Role           `gorm:"type:varchar(30);default:'NOC_OPERATOR'" json:"role"`
	Latitude     *float64       `gorm:"type:decimal(10,8)" json:"latitude,omitempty"`
	Longitude    *float64       `gorm:"type:decimal(11,8)" json:"longitude,omitempty"`
	IsOnline     bool           `gorm:"default:false" json:"is_online"`
	LastSeenAt   *time.Time     `json:"last_seen_at,omitempty"`
	Active       bool           `gorm:"default:true" json:"active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string {
	return "users"
}
