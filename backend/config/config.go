package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost                  string
	DBPort                  string
	DBUser                  string
	DBPassword              string
	DBName                  string
	DBSSLMode               string
	ServerPort              string
	ServerHost              string
	Env                     string
	JWTSecret               string
	JWTRefreshSecret        string
	SimulatorSecret         string
	FirebaseCredentialsPath string
}

var AppConfig *Config

func Init() {
	_ = godotenv.Load()

	AppConfig = &Config{
		DBHost:                  getEnv("DB_HOST", "localhost"),
		DBPort:                  getEnv("DB_PORT", "5432"),
		DBUser:                  getEnv("DB_USER", "postgres"),
		DBPassword:              getEnv("DB_PASSWORD", "password"),
		DBName:                  getEnv("DB_NAME", "case1_db"),
		DBSSLMode:               getEnv("DB_SSLMODE", "disable"),
		ServerPort:              getEnv("SERVER_PORT", "3000"),
		ServerHost:              getEnv("SERVER_HOST", "0.0.0.0"),
		Env:                     getEnv("ENV", "development"),
		JWTSecret:               getEnv("JWT_SECRET", "default-jwt-secret-change-me"),
		JWTRefreshSecret:        getEnv("JWT_REFRESH_SECRET", "default-refresh-secret-change-me"),
		SimulatorSecret:         getEnv("SIMULATOR_SECRET", "simulator-local-secret"),
		FirebaseCredentialsPath: getEnv("FIREBASE_CREDENTIALS_PATH", "./config/firebase-credentials.json"),
	}

	log.Println("✅ Configuration loaded successfully")
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode)
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
