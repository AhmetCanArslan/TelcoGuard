package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		{"valid email", "test@example.com", false},
		{"valid with subdomain", "user@mail.example.com", false},
		{"missing @", "testexample.com", true},
		{"missing domain", "test@", true},
		{"missing dot", "test@example", true},
		{"empty string", "", true},
		{"just spaces", "   ", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEmail(tt.email)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name    string
		pass    string
		wantErr bool
	}{
		{"valid 6 chars", "pass12", false},
		{"valid 10 chars", "password12", false},
		{"too short", "12345", true},
		{"empty", "", true},
		{"exactly 6", "123456", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePassword(tt.pass)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidatePhone(t *testing.T) {
	tests := []struct {
		name    string
		phone   string
		wantErr bool
	}{
		{"valid with +", "+905551234567", false},
		{"valid with country code", "+1234567890", false},
		{"missing +", "905551234567", true},
		{"empty", "", true},
		{"just +", "+", false}, // technically starts with +
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePhone(tt.phone)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestDefaultInt(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		fallback int
		want     int
	}{
		{"valid number", "42", 10, 42},
		{"empty string", "", 10, 10},
		{"zero value", "0", 10, 0},
		{"invalid string", "abc", 5, 5},
		{"negative number", "-3", 10, -3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DefaultInt(tt.value, tt.fallback)
			assert.Equal(t, tt.want, got)
		})
	}
}
