package auth

import "log"

func InitFirebase() {
	log.Println("⚠️  Firebase Auth not configured. OTP running in dev simulation mode.")
}

func IsFirebaseEnabled() bool {
	return false
}
