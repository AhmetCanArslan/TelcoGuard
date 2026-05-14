package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"case1/database"
	"case1/models"
)

func GenerateOTP() (string, error) {
	max := big.NewInt(900000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

func hashOTP(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

func StoreOTP(contact, method, code string) error {
	hash := hashOTP(code)
	otp := models.OtpCode{
		Contact:   strings.ToLower(strings.TrimSpace(contact)),
		Method:    method,
		CodeHash:  hash,
		ExpiresAt: time.Now().Add(5 * time.Minute),
		Attempts:  0,
		Used:      false,
	}
	return database.DB.Create(&otp).Error
}

func ValidateOTP(contact, code string) (*models.OtpCode, error) {
	var otp models.OtpCode
	result := database.DB.Where(
		"contact = ? AND used = false AND expires_at > ?",
		strings.ToLower(strings.TrimSpace(contact)), time.Now(),
	).Order("created_at DESC").First(&otp)

	if result.Error != nil {
		return nil, fmt.Errorf("invalid or expired OTP")
	}

	otp.Attempts++
	database.DB.Save(&otp)

	if otp.Attempts >= 3 {
		otp.Used = true
		database.DB.Save(&otp)
		return nil, fmt.Errorf("too many attempts")
	}

	hash := hashOTP(code)
	if otp.CodeHash != hash {
		return nil, fmt.Errorf("invalid or expired OTP")
	}

	return &otp, nil
}

func MarkOTPUsed(otp *models.OtpCode) {
	otp.Used = true
	database.DB.Save(otp)
}

func SendOTP(contact, method, code string) {
	if IsFirebaseEnabled() {
		log.Printf("📧 [Firebase] Would send OTP %s to %s via %s", code, contact, method)
		// TODO: integrate Firebase email action or SMS via Firebase
		// For now, log since hackathon scope prioritizes working local flow
	} else {
		log.Printf("📧 [DEV MODE] OTP for %s (%s): %s", contact, method, code)
	}
}
