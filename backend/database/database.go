package database

import (
	"case1/config"
	"case1/models"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init() error {
	var err error
	DB, err = gorm.Open(postgres.Open(config.AppConfig.GetDSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
		return err
	}

	log.Println("✅ Database connected successfully")

	// Auto migrate models
	if err := DB.AutoMigrate(
		&models.User{},
		&models.BaseStation{},
		&models.Metric{},
		&models.Alarm{},
		&models.ThresholdConfig{},
		&models.OtpCode{},
	); err != nil {
		log.Fatalf("❌ Failed to migrate models: %v", err)
		return err
	}

	log.Println("✅ Database migrations completed")
	return nil
}

func Close() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
