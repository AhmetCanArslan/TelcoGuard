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
	DefaultAdminEmail       string
	DefaultAdminPassword    string
	DefaultNocEmail         string
	DefaultNocPassword      string
	DefaultSahaEmail        string
	DefaultSahaPassword     string
	DefaultSebekeEmail      string
	DefaultSebekePassword   string
	DefaultAdminEmail       string
	DefaultAdminPassword    string
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
		DefaultAdminEmail:       getEnv("DEFAULT_ADMIN_EMAIL", "admin@turkcell.com"),
		DefaultAdminPassword:    getEnv("DEFAULT_ADMIN_PASSWORD", "admin"),
		DefaultNocEmail:         getEnv("DEFAULT_NOC_EMAIL", "noc@turkcell.com"),
		DefaultNocPassword:      getEnv("DEFAULT_NOC_PASSWORD", "noc"),
		DefaultSahaEmail:        getEnv("DEFAULT_SAHA_EMAIL", "saha@turkcell.com"),
		DefaultSahaPassword:     getEnv("DEFAULT_SAHA_PASSWORD", "saha"),
		DefaultSebekeEmail:      getEnv("DEFAULT_SEBEKE_EMAIL", "sebeke@turkcell.com"),
		DefaultSebekePassword:   getEnv("DEFAULT_SEBEKE_PASSWORD", "sebeke"),

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
