package utils

import (
	"fmt"
	"strings"
)

func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}
	if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
		return fmt.Errorf("invalid email format")
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 6 {
		return fmt.Errorf("password must be at least 6 characters")
	}
	return nil
}

func ValidatePhone(phone string) error {
	if phone == "" {
		return fmt.Errorf("phone is required")
	}
	if !strings.HasPrefix(phone, "+") {
		return fmt.Errorf("phone must start with + (country code)")
	}
	return nil
}

func DefaultInt(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	var result int
	fmt.Sscanf(value, "%d", &result)
	if result == 0 {
		return fallback
	}
	return result
}
