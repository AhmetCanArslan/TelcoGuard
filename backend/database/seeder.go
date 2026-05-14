package database

import (
	"case1/config"
	"case1/models"
	"log"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func Seed() error {
	log.Println("🌱 Seeding database...")

	if err := seedThresholdConfigs(); err != nil {
		return err
	}

	if err := seedBaseStations(); err != nil {
		return err
	}

	if err := seedUsers(); err != nil {
		return err
	}

	log.Println("✅ Database seeding completed")
	return nil
}

func seedThresholdConfigs() error {
	var count int64
	DB.Model(&models.ThresholdConfig{}).Count(&count)
	if count > 0 {
		log.Println("⏭️  Threshold configs already seeded")
		return nil
	}

	configs := []models.ThresholdConfig{
		{MetricName: "cpu_usage", WarningThreshold: 75.0, CriticalThreshold: 90.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "memory_usage", WarningThreshold: 80.0, CriticalThreshold: 95.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "packet_loss", WarningThreshold: 5.0, CriticalThreshold: 10.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "latency", WarningThreshold: 50.0, CriticalThreshold: 100.0, Direction: models.ThresholdDirectionAbove, IsActive: true},
		{MetricName: "rssi", WarningThreshold: -80.0, CriticalThreshold: -90.0, Direction: models.ThresholdDirectionBelow, IsActive: true},
	}

	if err := DB.Create(&configs).Error; err != nil {
		return err
	}
	log.Println("✅ Threshold configs seeded")
	return nil
}

func seedBaseStations() error {
	var count int64
	DB.Model(&models.BaseStation{}).Count(&count)
	if count > 0 {
		log.Println("⏭️  Base stations already seeded")
		return nil
	}

	stations := []models.BaseStation{
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111111"), Code: "BSC-001", Name: "Levent-K1", Latitude: 41.0732, Longitude: 29.0199, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 1000, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111112"), Code: "BSC-002", Name: "Kadıköy-M3", Latitude: 40.9887, Longitude: 29.0277, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 800, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111113"), Code: "BSC-003", Name: "Taksim-A2", Latitude: 41.0373, Longitude: 29.0252, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 1200, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111114"), Code: "BSC-004", Name: "Beşiktaş-B1", Latitude: 41.0516, Longitude: 29.0112, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 950, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111115"), Code: "BSC-005", Name: "Fatih-F2", Latitude: 41.0096, Longitude: 28.9624, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 1100, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111116"), Code: "BSC-006", Name: "Eminönü-E1", Latitude: 41.0094, Longitude: 28.9784, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 850, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111117"), Code: "BSC-007", Name: "Beyoğlu-BY1", Latitude: 41.0257, Longitude: 28.9828, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 1050, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111118"), Code: "BSC-008", Name: "Şişli-S3", Latitude: 41.0489, Longitude: 29.0133, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 920, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111119"), Code: "BSC-009", Name: "Bahçelievler-BA2", Latitude: 41.0072, Longitude: 28.8821, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 880, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111a"), Code: "BSC-010", Name: "Bakırköy-BAK1", Latitude: 40.9756, Longitude: 28.8899, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 780, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111b"), Code: "BSC-011", Name: "Maltepe-MAL1", Latitude: 40.9619, Longitude: 29.1342, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 920, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111c"), Code: "BSC-012", Name: "Pendik-PEN1", Latitude: 40.8897, Longitude: 29.2410, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 850, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111d"), Code: "BSC-013", Name: "Bağcılar-BAG1", Latitude: 41.2268, Longitude: 29.2046, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 1150, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111e"), Code: "BSC-014", Name: "Eyüpsultan-EYU1", Latitude: 41.0667, Longitude: 28.9133, Region: "Marmara", Type: models.StationTypeLTE, Capacity: 750, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-11111111111f"), Code: "BSC-015", Name: "Avcılar-AVC1", Latitude: 41.0085, Longitude: 28.7454, Region: "Marmara", Type: models.StationTypeNR5G, Capacity: 1000, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111120"), Code: "BSC-016", Name: "İzmir-Alsancak-IZ1", Latitude: 38.4215, Longitude: 27.1467, Region: "Ege", Type: models.StationTypeNR5G, Capacity: 1100, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111121"), Code: "BSC-017", Name: "İzmir-Konak-IZ2", Latitude: 38.4192, Longitude: 27.1441, Region: "Ege", Type: models.StationTypeLTE, Capacity: 900, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111122"), Code: "BSC-018", Name: "Aydın-AYD1", Latitude: 37.8442, Longitude: 27.8454, Region: "Ege", Type: models.StationTypeLTE, Capacity: 650, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111123"), Code: "BSC-019", Name: "Ankara-Çankaya-ANK1", Latitude: 39.8817, Longitude: 32.7940, Region: "İç Anadolu", Type: models.StationTypeNR5G, Capacity: 1050, Status: models.StationStatusActive},
		{ID: uuid.MustParse("11111111-1111-1111-1111-111111111124"), Code: "BSC-020", Name: "Ankara-Keçiören-ANK2", Latitude: 39.9500, Longitude: 32.8500, Region: "İç Anadolu", Type: models.StationTypeLTE, Capacity: 800, Status: models.StationStatusActive},
	}

	if err := DB.Create(&stations).Error; err != nil {
		return err
	}
	log.Println("✅ Base stations seeded (20 stations)")
	return nil
}

func seedUsers() error {
	hashPwd := func(pwd string) string {
		hash, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		return string(hash)
	}

	defaultUsers := []models.User{
		{Name: "Admin", Email: config.AppConfig.DefaultAdminEmail, Password: hashPwd(config.AppConfig.DefaultAdminPassword), Role: models.RoleAdmin, Active: true},
		{Name: "NOC Admin", Email: config.AppConfig.DefaultNocEmail, Password: hashPwd(config.AppConfig.DefaultNocPassword), Role: models.RoleNOCOperator, Active: true},
		{Name: "Saha Mühendisi", Email: config.AppConfig.DefaultSahaEmail, Password: hashPwd(config.AppConfig.DefaultSahaPassword), Role: models.RoleFieldEngineer, Active: true},
		{Name: "Şebeke Yöneticisi", Email: config.AppConfig.DefaultSebekeEmail, Password: hashPwd(config.AppConfig.DefaultSebekePassword), Role: models.RoleNetworkManager, Active: true},
	}

	for _, user := range defaultUsers {
		var count int64
		DB.Model(&models.User{}).Where("email = ?", user.Email).Count(&count)
		if count == 0 {
			if err := DB.Create(&user).Error; err != nil {
				log.Printf("⚠️ Failed to seed user %s: %v", user.Email, err)
			} else {
				log.Printf("✅ Seeded default user: %s", user.Email)
			}
		} else {
			log.Printf("⏭️ User %s already exists", user.Email)
		}
	}

	return nil
}
