package auth

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"case1/config"
	"github.com/golang-jwt/jwt/v5"
)

// FirebaseServiceAccount represents the JSON structure of Firebase credentials
type FirebaseServiceAccount struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
}

var (
	firebaseEnabled        bool
	firebaseSA             *FirebaseServiceAccount
	firebaseHTTPClient     = &http.Client{Timeout: 10 * time.Second}
	firebasePublicKeys     map[string]*rsa.PublicKey
	firebaseKeysMutex      sync.RWMutex
	firebaseKeysLastUpdate time.Time
)

func InitFirebase() {
	path := config.AppConfig.FirebaseCredentialsPath
	if _, err := os.Stat(path); os.IsNotExist(err) {
		log.Println("⚠️  Firebase credentials not found at", path, "— OTP running in dev simulation mode.")
		firebaseEnabled = false
		return
	}

	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("❌ Failed to read Firebase credentials: %v", err)
		firebaseEnabled = false
		return
	}

	var sa FirebaseServiceAccount
	if err := json.Unmarshal(data, &sa); err != nil {
		log.Printf("❌ Failed to parse Firebase credentials: %v", err)
		firebaseEnabled = false
		return
	}

	if sa.ProjectID == "" || sa.PrivateKey == "" || sa.ClientEmail == "" {
		log.Println("❌ Invalid Firebase credentials: missing required fields")
		firebaseEnabled = false
		return
	}

	firebaseSA = &sa
	firebaseEnabled = true
	log.Printf("✅ Firebase initialized for project: %s", sa.ProjectID)
}

func IsFirebaseEnabled() bool {
	return firebaseEnabled && firebaseSA != nil
}

// SyncFirebaseUser creates or updates a user via Firebase Auth REST API
func SyncFirebaseUser(email, phone, name string) (string, error) {
	if !IsFirebaseEnabled() {
		return "", fmt.Errorf("firebase not enabled")
	}

	// First try to get user by email
	uid, err := getFirebaseUserByEmail(email)
	if err == nil && uid != "" {
		// Update existing user
		if err := updateFirebaseUser(uid, email, phone, name); err != nil {
			return "", fmt.Errorf("failed to update Firebase user: %w", err)
		}
		log.Printf("✅ Updated Firebase user: %s (UID: %s)", email, uid)
		return uid, nil
	}

	// Create new user
	uid, err = createFirebaseUser(email, phone, name)
	if err != nil {
		return "", fmt.Errorf("failed to create Firebase user: %w", err)
	}
	log.Printf("✅ Created Firebase user: %s (UID: %s)", email, uid)
	return uid, nil
}

func createFirebaseUser(email, phone, displayName string) (string, error) {
	url := fmt.Sprintf("https://identitytoolkit.googleapis.com/v1/projects/%s/accounts", firebaseSA.ProjectID)

	body := map[string]interface{}{
		"email":         email,
		"displayName":   displayName,
		"emailVerified": false,
		"disabled":      false,
	}
	if phone != "" {
		body["phoneNumber"] = phone
	}

	return firebaseAuthRequest(url, body)
}

func updateFirebaseUser(uid, email, phone, displayName string) error {
	url := fmt.Sprintf("https://identitytoolkit.googleapis.com/v1/projects/%s/accounts:update", firebaseSA.ProjectID)

	body := map[string]interface{}{
		"localId":     uid,
		"displayName": displayName,
	}
	if phone != "" {
		body["phoneNumber"] = phone
	}

	_, err := firebaseAuthRequest(url, body)
	return err
}

func getFirebaseUserByEmail(email string) (string, error) {
	url := fmt.Sprintf("https://identitytoolkit.googleapis.com/v1/projects/%s/accounts:lookup", firebaseSA.ProjectID)

	body := map[string]interface{}{
		"email": []string{email},
	}

	respBody, err := firebaseAuthRequestRaw(url, body)
	if err != nil {
		return "", err
	}

	var result struct {
		Users []struct {
			LocalID string `json:"localId"`
		} `json:"users"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", err
	}

	if len(result.Users) == 0 {
		return "", fmt.Errorf("user not found")
	}

	return result.Users[0].LocalID, nil
}

// GenerateFirebaseCustomToken creates a custom token for frontend Firebase Auth
func GenerateFirebaseCustomToken(uid string) (string, error) {
	if !IsFirebaseEnabled() {
		return "", fmt.Errorf("firebase not enabled")
	}

	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"iss": firebaseSA.ClientEmail,
		"sub": firebaseSA.ClientEmail,
		"aud": "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
		"iat": now.Unix(),
		"exp": now.Add(time.Hour).Unix(),
		"uid": uid,
	})

	privateKey, err := parseRSAPrivateKey(firebaseSA.PrivateKey)
	if err != nil {
		return "", fmt.Errorf("failed to parse private key: %w", err)
	}

	tokenString, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// VerifyFirebaseIDToken verifies a Firebase ID token from frontend
func VerifyFirebaseIDToken(idToken string) (*FirebaseToken, error) {
	if !IsFirebaseEnabled() {
		return nil, fmt.Errorf("firebase not enabled")
	}

	// Refresh public keys if needed
	if err := refreshFirebasePublicKeys(); err != nil {
		return nil, fmt.Errorf("failed to get Firebase public keys: %w", err)
	}

	firebaseKeysMutex.RLock()
	keys := firebasePublicKeys
	firebaseKeysMutex.RUnlock()

	token, err := jwt.Parse(idToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid header")
		}

		key, ok := keys[kid]
		if !ok {
			return nil, fmt.Errorf("unknown kid: %s", kid)
		}
		return key, nil
	}, jwt.WithIssuer("https://securetoken.google.com/"+firebaseSA.ProjectID), jwt.WithAudience(firebaseSA.ProjectID))

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("token is not valid")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	// Check expiration
	if exp, ok := claims["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			return nil, fmt.Errorf("token expired")
		}
	}

	uid, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	name, _ := claims["name"].(string)

	return &FirebaseToken{
		UID:   uid,
		Email: email,
		Name:  name,
	}, nil
}

type FirebaseToken struct {
	UID   string
	Email string
	Name  string
}

func refreshFirebasePublicKeys() error {
	firebaseKeysMutex.RLock()
	if time.Since(firebaseKeysLastUpdate) < time.Hour && len(firebasePublicKeys) > 0 {
		firebaseKeysMutex.RUnlock()
		return nil
	}
	firebaseKeysMutex.RUnlock()

	firebaseKeysMutex.Lock()
	defer firebaseKeysMutex.Unlock()

	// Double check after acquiring write lock
	if time.Since(firebaseKeysLastUpdate) < time.Hour && len(firebasePublicKeys) > 0 {
		return nil
	}

	resp, err := http.Get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com")
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var certs map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&certs); err != nil {
		return err
	}

	keys := make(map[string]*rsa.PublicKey)
	for kid, certPEM := range certs {
		block, _ := pem.Decode([]byte(certPEM))
		if block == nil {
			continue
		}
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			continue
		}
		if rsaPublicKey, ok := cert.PublicKey.(*rsa.PublicKey); ok {
			keys[kid] = rsaPublicKey
		}
	}

	firebasePublicKeys = keys
	firebaseKeysLastUpdate = time.Now()
	return nil
}

func firebaseAuthRequest(url string, body map[string]interface{}) (string, error) {
	respBody, err := firebaseAuthRequestRaw(url, body)
	if err != nil {
		return "", err
	}

	var result struct {
		LocalID string `json:"localId"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", err
	}

	return result.LocalID, nil
}

func firebaseAuthRequestRaw(url string, body map[string]interface{}) ([]byte, error) {
	// Get access token
	accessToken, err := getFirebaseAccessToken()
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := firebaseHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("firebase auth error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

func getFirebaseAccessToken() (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"iss":   firebaseSA.ClientEmail,
		"sub":   firebaseSA.ClientEmail,
		"scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase.database",
		"aud":   "https://oauth2.googleapis.com/token",
		"iat":   now.Unix(),
		"exp":   now.Add(time.Hour).Unix(),
	})

	privateKey, err := parseRSAPrivateKey(firebaseSA.PrivateKey)
	if err != nil {
		return "", err
	}

	tokenString, err := token.SignedString(privateKey)
	if err != nil {
		return "", err
	}

	// Exchange JWT for access token
	data := fmt.Sprintf("grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=%s", tokenString)
	req, err := http.NewRequest("POST", "https://oauth2.googleapis.com/token", strings.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := firebaseHTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.AccessToken, nil
}

func parseRSAPrivateKey(keyPEM string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		key, err = x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}
	}

	if rsaKey, ok := key.(*rsa.PrivateKey); ok {
		return rsaKey, nil
	}

	return nil, fmt.Errorf("not an RSA private key")
}
