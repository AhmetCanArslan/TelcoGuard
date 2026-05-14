package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort      string
	ServerHost      string
	BackendURL      string
	SimulatorSecret string
	TickIntervalMs  int
}

var AppConfig *Config

func Init() {
	_ = godotenv.Load()

	AppConfig = &Config{
		ServerPort:      getEnv("PORT", "3001"),
		ServerHost:      getEnv("HOST", "0.0.0.0"),
		BackendURL:      getEnv("BACKEND_URL", "http://localhost:3000"),
		SimulatorSecret: getEnv("SIMULATOR_SECRET", "simulator-local-secret"),
		TickIntervalMs:  getEnvInt("TICK_INTERVAL_MS", 2000),
	}

	log.Println("✅ Simulator configuration loaded")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	var result int
	_, err := fmt.Sscanf(value, "%d", &result)
	if err != nil {
		return defaultValue
	}
	return result
}
