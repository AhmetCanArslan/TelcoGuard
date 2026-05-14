// @title TelcoGuard API
// @version 1.0
// @description TelcoGuard — Gerçek Zamanlı Şebeke İzleme ve Anomali Tespit Platformu
// @termsOfService http://swagger.io/terms/

// @contact.name Turkcell CodeNight 2026
// @contact.url https://turkcell.com.tr

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:3000
// @BasePath /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

package main

import (
	"case1/auth"
	"case1/config"
	"case1/database"
	"case1/middleware"
	"case1/models"
	"case1/routes"
	"log"
	"math"
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func init() {
	// Initialize configuration
	config.Init()

	// Initialize database
	if err := database.Init(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Seed data
	if err := database.Seed(); err != nil {
		log.Printf("Warning: failed to seed database: %v", err)
	}

	// Initialize Firebase (optional)
	auth.InitFirebase()

	// Sync all local users to Firebase Auth (so password reset emails work)
	if auth.IsFirebaseEnabled() {
		syncLocalUsersToFirebase()
	}
}

func syncLocalUsersToFirebase() {
	var users []models.User
	if err := database.DB.Find(&users).Error; err != nil {
		log.Printf("⚠️ Failed to fetch users for Firebase sync: %v", err)
		return
	}
	synced := 0
	for _, u := range users {
		if _, err := auth.SyncFirebaseUser(u.Email, u.Phone, u.Name); err != nil {
			log.Printf("⚠️ Failed to sync user %s to Firebase: %v", u.Email, err)
		} else {
			synced++
		}
	}
	log.Printf("✅ Synced %d/%d users to Firebase Auth", synced, len(users))
}

// startMetricDrift runs in a background goroutine, creating new metric rows
// with small random drift every 2 seconds so the UI always sees live-changing data.
func startMetricDrift() {
	log.Println("Starting metric drift goroutine (interval: 2s)")

	// Station baselines matching the simulator seed, used as fallback
	type bl struct{ cpu, mem, packet, latency, rssi float64; users int }
	baselines := map[string]bl{
		"11111111-1111-1111-1111-111111111111": {35, 50, 1, 15, 50, 300},
		"11111111-1111-1111-1111-111111111112": {30, 45, 1, 20, 55, 250},
		"11111111-1111-1111-1111-111111111113": {40, 55, 1, 12, 48, 400},
		"11111111-1111-1111-1111-111111111114": {32, 48, 1, 18, 52, 280},
		"11111111-1111-1111-1111-111111111115": {38, 52, 1, 14, 50, 350},
		"11111111-1111-1111-1111-111111111116": {28, 42, 1, 22, 58, 220},
		"11111111-1111-1111-1111-111111111117": {36, 51, 1, 16, 49, 320},
		"11111111-1111-1111-1111-111111111118": {34, 49, 1, 17, 51, 290},
		"11111111-1111-1111-1111-111111111119": {33, 47, 1, 19, 53, 260},
		"11111111-1111-1111-1111-11111111111a": {29, 43, 1, 21, 56, 230},
		"11111111-1111-1111-1111-11111111111b": {37, 50, 1, 15, 50, 310},
		"11111111-1111-1111-1111-11111111111c": {31, 46, 1, 20, 54, 240},
		"11111111-1111-1111-1111-11111111111d": {39, 53, 1, 13, 47, 380},
		"11111111-1111-1111-1111-11111111111e": {27, 41, 1, 23, 59, 210},
		"11111111-1111-1111-1111-11111111111f": {35, 50, 1, 16, 50, 300},
		"11111111-1111-1111-1111-111111111120": {36, 51, 1, 14, 49, 330},
		"11111111-1111-1111-1111-111111111121": {32, 47, 1, 18, 52, 270},
		"11111111-1111-1111-1111-111111111122": {25, 40, 1, 24, 60, 200},
		"11111111-1111-1111-1111-111111111123": {37, 52, 1, 15, 50, 340},
		"11111111-1111-1111-1111-111111111124": {30, 45, 1, 19, 54, 260},
	}

	drift := func() float64 {
		sign := 1.0
		if rand.Float64() < 0.5 {
			sign = -1.0
		}
		return sign * (math.Floor(rand.Float64()*5) + 1)
	}
	driftInt := func() int {
		sign := 1
		if rand.Float64() < 0.5 {
			sign = -1
		}
		return sign * (rand.Intn(5) + 1)
	}
	clamp := func(v, lo, hi float64) float64 { return math.Max(lo, math.Min(hi, v)) }
	clampInt := func(v, lo, hi int) int {
		if v < lo { return lo }
		if v > hi { return hi }
		return v
	}

	tick := func() {
		var stations []models.BaseStation
		if err := database.DB.Find(&stations).Error; err != nil {
			return
		}
		batch := make([]models.Metric, 0, len(stations))
		now := time.Now()
		for _, s := range stations {
			var latest models.Metric
			if err := database.DB.Where("station_id = ?", s.ID).Order("timestamp DESC").First(&latest).Error; err != nil {
				b, ok := baselines[s.ID.String()]
				if !ok {
					b = bl{35, 50, 1, 15, 50, 300}
				}
				latest = models.Metric{StationID: s.ID, CpuUsage: b.cpu, MemoryUsage: b.mem, PacketLoss: b.packet, Latency: b.latency, Rssi: b.rssi, ConnectedUsers: b.users}
			}
			batch = append(batch, models.Metric{
				ID:             uuid.New(),
				StationID:      s.ID,
				Timestamp:       now,
				CpuUsage:       clamp(latest.CpuUsage+drift(), 0, 100),
				MemoryUsage:    clamp(latest.MemoryUsage+drift(), 0, 100),
				PacketLoss:     clamp(latest.PacketLoss+drift(), 0, 100),
				Latency:        math.Max(latest.Latency+drift(), 0),
				Rssi:           math.Max(latest.Rssi+drift(), 0),
				ConnectedUsers: clampInt(latest.ConnectedUsers+driftInt(), 0, 999999),
			})
		}
		if len(batch) > 0 {
			database.DB.Create(&batch)
		}
	}

	tick()
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		tick()
	}
}

func main() {
	defer func() {
		if err := database.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "TelcoGuard Backend",
		ErrorHandler: middleware.ErrorHandler(),
	})

	// Setup routes
	routes.Setup(app)

	// Start background metric drift to keep DB data live
	go startMetricDrift()

	// Start server
	addr := config.AppConfig.ServerHost + ":" + config.AppConfig.ServerPort
	log.Printf("🚀 Server starting on http://%s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}
