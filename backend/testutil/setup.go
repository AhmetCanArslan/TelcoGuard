package testutil

import (
	"case1/config"
	"case1/database"
	"case1/models"
	"fmt"
	"log"
	"os"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var testDB *gorm.DB

func init() {
	// Use test DB config
	os.Setenv("DB_HOST", "localhost")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("DB_USER", "postgres")
	os.Setenv("DB_PASSWORD", "password")
	os.Setenv("DB_NAME", "case1_test_db")
	os.Setenv("DB_SSLMODE", "disable")
	os.Setenv("JWT_SECRET", "test-jwt-secret")
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret")
	os.Setenv("SIMULATOR_SECRET", "test-simulator-secret")

	config.Init()
}

func SetupTestDB() *gorm.DB {
	if testDB != nil {
		return testDB
	}

	var err error
	dsn := config.AppConfig.GetDSN()
	testDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}

	// Migrate all models
	if err := testDB.AutoMigrate(
		&models.User{},
		&models.BaseStation{},
		&models.Metric{},
		&models.Alarm{},
		&models.ThresholdConfig{},
		&models.OtpCode{},
	); err != nil {
		log.Fatalf("Failed to migrate test database: %v", err)
	}

	// Set the global DB variable for repository tests
	database.DB = testDB

	return testDB
}

func CleanTestDB(t *testing.T) {
	t.Helper()
	if testDB == nil {
		t.Fatal("testDB not initialized")
	}

	// Truncate all tables to ensure clean state between tests
	testDB.Exec("TRUNCATE TABLE alarms, metrics, base_stations, otp_codes, users, threshold_configs RESTART IDENTITY CASCADE")
}

func SeedThresholdConfigs(t *testing.T) {
	t.Helper()
	configs := []models.ThresholdConfig{
		{MetricName: "cpu_usage", WarningThreshold: 75.0, CriticalThreshold: 90.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "memory_usage", WarningThreshold: 80.0, CriticalThreshold: 95.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "packet_loss", WarningThreshold: 5.0, CriticalThreshold: 10.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "latency", WarningThreshold: 50.0, CriticalThreshold: 100.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "rssi", WarningThreshold: -80.0, CriticalThreshold: -90.0, Direction: models.ThresholdDirectionBelow, IsActive: true},
	}
	for _, cfg := range configs {
		if err := database.DB.Create(&cfg).Error; err != nil {
			t.Fatalf("Failed to seed threshold config: %v", err)
		}
	}
}

func CreateTestUser(t *testing.T, email string, role models.Role) *models.User {
	t.Helper()
	user := models.User{
		Name:     "Test User",
		Email:    email,
		Password: "hashedpassword",
		Role:     role,
		Active:   true,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}
	return &user
}

func CreateTestUserWithLocation(t *testing.T, email string, role models.Role, lat, lng float64) *models.User {
	t.Helper()
	user := models.User{
		Name:      "Test User",
		Email:     email,
		Password:  "hashedpassword",
		Role:      role,
		Active:    true,
		IsOnline:  true,
		Latitude:  &lat,
		Longitude: &lng,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}
	return &user
}

func CreateTestStation(t *testing.T, code string) *models.BaseStation {
	t.Helper()
	station := models.BaseStation{
		Code:     code,
		Name:     "Test Station " + code,
		Latitude: 41.0,
		Longitude: 29.0,
		Region:   "Marmara",
		Type:     models.StationTypeLTE,
		Capacity: 1000,
		Status:   models.StationStatusActive,
	}
	if err := database.DB.Create(&station).Error; err != nil {
		t.Fatalf("Failed to create test station: %v", err)
	}
	return &station
}

func CreateTestMetric(t *testing.T, stationID string, cpu, memory, packetLoss, latency, rssi float64, users int) *models.Metric {
	t.Helper()
	metric := models.Metric{
		StationID:      parseUUID(t, stationID),
		CpuUsage:       cpu,
		MemoryUsage:    memory,
		PacketLoss:     packetLoss,
		Latency:        latency,
		Rssi:           rssi,
		ConnectedUsers: users,
	}
	if err := database.DB.Create(&metric).Error; err != nil {
		t.Fatalf("Failed to create test metric: %v", err)
	}
	return &metric
}

func CreateTestAlarm(t *testing.T, stationID string, metricName string, severity models.AlarmSeverity, status models.AlarmStatus) *models.Alarm {
	t.Helper()
	alarm := models.Alarm{
		StationID:  parseUUID(t, stationID),
		MetricName: metricName,
		Severity:   severity,
		Status:     status,
		Message:    "Test alarm for " + metricName,
	}
	if err := database.DB.Create(&alarm).Error; err != nil {
		t.Fatalf("Failed to create test alarm: %v", err)
	}
	return &alarm
}

func parseUUID(t *testing.T, s string) uuid.UUID {
	id, err := uuid.Parse(s)
	if err != nil {
		t.Fatalf("Invalid UUID: %v", err)
	}
	return id
}

func GenerateTestToken(userID uint, role, email string) string {
	claims := struct {
		UserID uint   `json:"user_id"`
		Role   string `json:"role"`
		Email  string `json:"email"`
		jwt.RegisteredClaims
	}{
		UserID: userID,
		Role:   role,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: fmt.Sprintf("%d", userID),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, _ := token.SignedString([]byte(config.AppConfig.JWTSecret))
	return s
}

func NewTestApp() *fiber.App {
	return fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"success": false, "error": err.Error()})
		},
	})
}
