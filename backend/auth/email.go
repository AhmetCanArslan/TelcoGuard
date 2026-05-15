package auth

import (
	"fmt"
	"log"
	"net/smtp"

	"case1/config"
)

func SendEmail(to, subject, body string) error {
	cfg := config.AppConfig
	if cfg.SmtpHost == "" || cfg.SmtpUser == "" {
		return fmt.Errorf("SMTP not configured")
	}

	from := cfg.SmtpFrom
	auth := smtp.PlainAuth("", cfg.SmtpUser, cfg.SmtpPassword, cfg.SmtpHost)

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, to, subject, body)

	addr := fmt.Sprintf("%s:%s", cfg.SmtpHost, cfg.SmtpPort)
	if err := smtp.SendMail(addr, auth, from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("SMTP send failed: %w", err)
	}

	log.Printf("✅ Email sent to %s — subject: %s", to, subject)
	return nil
}

func IsSMTPConfigured() bool {
	return config.AppConfig.SmtpHost != "" && config.AppConfig.SmtpUser != ""
}

func SendOTPEmail(email, code string) error {
	subject := "TelcoGuard - Şifre Sıfırlama Kodu"
	body := fmt.Sprintf(`TelcoGuard Şifre Sıfırlama

Merhaba,

Şifre sıfırlama işlemi için tek kullanımlık kodunuz:

   %s

Bu kod 5 dakika süreyle geçerlidir.

Eğer bu işlemi siz başlatmadıysanız, bu e-postayı dikkate almayın.

TelcoGuard Güvenlik Ekibi`, code)

	if IsSMTPConfigured() {
		if err := SendEmail(email, subject, body); err != nil {
			log.Printf("⚠️ Failed to send OTP email to %s: %v", email, err)
			return err
		}
		return nil
	}

	log.Printf("⚠️ SMTP not configured — OTP for %s: %s", email, code)
	return fmt.Errorf("SMTP not configured")
}
