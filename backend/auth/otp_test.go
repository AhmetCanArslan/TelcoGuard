package auth

import (
	"case1/testutil"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateOTP(t *testing.T) {
	code, err := GenerateOTP()
	require.NoError(t, err)
	assert.Len(t, code, 6)
	
	// Should be numeric
	for _, c := range code {
		assert.True(t, c >= '0' && c <= '9')
	}
}

func TestOTPFlow(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	contact := "test@otp.com"
	method := "email"

	// Generate and store OTP
	code, err := GenerateOTP()
	require.NoError(t, err)
	err = StoreOTP(contact, method, code)
	require.NoError(t, err)

	// Validate with correct code
	otp, err := ValidateOTP(contact, code)
	require.NoError(t, err)
	assert.NotNil(t, otp)
	assert.Equal(t, contact, otp.Contact)
	assert.Equal(t, method, otp.Method)
	assert.False(t, otp.Used)

	// Mark as used
	MarkOTPUsed(otp)
	
	// Should not validate again (used)
	_, err = ValidateOTP(contact, code)
	assert.Error(t, err)

	// Should not validate with wrong code
	testutil.CleanTestDB(t)
	code2, _ := GenerateOTP()
	StoreOTP(contact, method, code2)
	_, err = ValidateOTP(contact, "000000")
	assert.Error(t, err)
}

func TestOTPExpiry(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	contact := "expired@test.com"
	code, _ := GenerateOTP()
	StoreOTP(contact, "email", code)

	// Manually expire the OTP
	testutil.SetupTestDB().Table("otp_codes").
		Where("contact = ?", contact).
		Update("expires_at", time.Now().Add(-1*time.Hour))

	_, err := ValidateOTP(contact, code)
	assert.Error(t, err)
}

func TestOTPAttempts(t *testing.T) {
	testutil.SetupTestDB()
	testutil.CleanTestDB(t)

	contact := "attempts@test.com"
	code, _ := GenerateOTP()
	StoreOTP(contact, "email", code)

	// 3 failed attempts should invalidate
	for i := 0; i < 3; i++ {
		_, err := ValidateOTP(contact, "000000")
		assert.Error(t, err)
	}

	// Even correct code should fail after 3 attempts
	_, err := ValidateOTP(contact, code)
	assert.Error(t, err)
}
