package handlers

import (
	"case1/auth"
	"case1/config"
	"case1/database"
	"case1/models"
	"case1/utils"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Name      string      `json:"name"`
	Email     string      `json:"email"`
	Password  string      `json:"password"`
	Role      models.Role `json:"role"`
	Phone     string      `json:"phone,omitempty"`
	Latitude  *float64    `json:"latitude,omitempty"`
	Longitude *float64    `json:"longitude,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type OTPRequest struct {
	Contact string `json:"contact"`
	Method  string `json:"method"` // email or sms
}

type OTPVerifyRequest struct {
	Contact string `json:"contact"`
	Code    string `json:"code"`
}

type TokenResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         models.User `json:"user"`
}

// Register godoc
// @Summary Register a new user
// @Description Create a new user account with email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 201 {object} utils.APIResponse{data=models.User}
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/auth/register [post]
func Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if err := utils.ValidateEmail(req.Email); err != nil {
		return utils.BadRequest(c, err.Error())
	}
	if err := utils.ValidatePassword(req.Password); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	if req.Role == "" {
		req.Role = models.RoleNOCOperator
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return utils.InternalServerError(c, "Failed to hash password")
	}

	user := models.User{
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hashed),
		Role:      req.Role,
		Phone:     req.Phone,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Active:    true,
	}

	if result := database.DB.Create(&user); result.Error != nil {
		return utils.BadRequest(c, "User already exists or invalid data")
	}

	user.Password = ""
	return utils.Success(c, user, "User registered successfully")
}

// Login godoc
// @Summary Login
// @Description Authenticate with email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} utils.APIResponse{data=TokenResponse}
// @Failure 401 {object} utils.APIResponse
// @Router /api/v1/auth/login [post]
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	var user models.User
	result := database.DB.Where("email = ? AND active = true", req.Email).First(&user)
	if result.Error != nil {
		return utils.Unauthorized(c, "Invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return utils.Unauthorized(c, "Invalid credentials")
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, string(user.Role), user.Email)
	if err != nil {
		return utils.InternalServerError(c, "Failed to generate tokens")
	}
	refreshToken, err := auth.GenerateRefreshToken(user.ID)
	if err != nil {
		return utils.InternalServerError(c, "Failed to generate tokens")
	}

	user.Password = ""
	return utils.Success(c, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, "Login successful")
}

// SendOTP godoc
// @Summary Send OTP
// @Description Send one-time password via email or SMS
// @Tags auth
// @Accept json
// @Produce json
// @Param request body OTPRequest true "OTP request"
// @Success 200 {object} utils.APIResponse
// @Failure 400 {object} utils.APIResponse
// @Router /api/v1/auth/otp/send [post]
func SendOTP(c *fiber.Ctx) error {
	var req OTPRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	if req.Method != "email" && req.Method != "sms" {
		return utils.BadRequest(c, "Method must be 'email' or 'sms'")
	}

	if req.Method == "email" {
		if err := utils.ValidateEmail(req.Contact); err != nil {
			return utils.BadRequest(c, err.Error())
		}
	} else {
		if err := utils.ValidatePhone(req.Contact); err != nil {
			return utils.BadRequest(c, err.Error())
		}
	}

	code, err := auth.GenerateOTP()
	if err != nil {
		return utils.InternalServerError(c, "Failed to generate OTP")
	}

	if err := auth.StoreOTP(req.Contact, req.Method, code); err != nil {
		return utils.InternalServerError(c, "Failed to store OTP")
	}

	auth.SendOTP(req.Contact, req.Method, code)

	if config.AppConfig.Env == "development" && !auth.IsFirebaseEnabled() {
		return utils.Success(c, fiber.Map{
			"code": code,
		}, "OTP sent (dev mode)")
	}

	return utils.Success(c, nil, "OTP sent successfully")
}

// VerifyOTP godoc
// @Summary Verify OTP
// @Description Verify one-time password and receive JWT tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body OTPVerifyRequest true "OTP verification"
// @Success 200 {object} utils.APIResponse{data=TokenResponse}
// @Failure 401 {object} utils.APIResponse
// @Router /api/v1/auth/otp/verify [post]
func VerifyOTP(c *fiber.Ctx) error {
	var req OTPVerifyRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	otp, err := auth.ValidateOTP(req.Contact, req.Code)
	if err != nil {
		return utils.Unauthorized(c, err.Error())
	}

	auth.MarkOTPUsed(otp)

	var user models.User
	if otp.Method == "email" {
		database.DB.Where("email = ?", req.Contact).First(&user)
	} else {
		database.DB.Where("phone = ?", req.Contact).First(&user)
	}

	if user.ID == 0 {
		user = models.User{
			Name:     req.Contact,
			Email:    req.Contact,
			Role:     models.RoleNOCOperator,
			Phone:    req.Contact,
			Active:   true,
			Password: "",
		}
		if otp.Method == "email" {
			user.Phone = ""
		} else {
			user.Email = req.Contact + "@placeholder.com"
		}
		database.DB.Create(&user)
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, string(user.Role), user.Email)
	if err != nil {
		return utils.InternalServerError(c, "Failed to generate tokens")
	}
	refreshToken, err := auth.GenerateRefreshToken(user.ID)
	if err != nil {
		return utils.InternalServerError(c, "Failed to generate tokens")
	}

	user.Password = ""
	return utils.Success(c, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, "OTP verified successfully")
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Get a new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body object{refresh_token=string} true "Refresh token"
// @Success 200 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Router /api/v1/auth/refresh [post]
func RefreshToken(c *fiber.Ctx) error {
	type refreshReq struct {
		RefreshToken string `json:"refresh_token"`
	}
	var req refreshReq
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequest(c, "Invalid request body")
	}

	userID, err := auth.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		return utils.Unauthorized(c, "Invalid refresh token")
	}

	var user models.User
	if database.DB.First(&user, userID).Error != nil {
		return utils.Unauthorized(c, "User not found")
	}

	accessToken, err := auth.GenerateAccessToken(user.ID, string(user.Role), user.Email)
	if err != nil {
		return utils.InternalServerError(c, "Failed to generate access token")
	}

	return utils.Success(c, fiber.Map{
		"access_token": accessToken,
	}, "Token refreshed")
}

// GetMe godoc
// @Summary Get current user
// @Description Get the currently authenticated user's profile
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.APIResponse{data=models.User}
// @Failure 401 {object} utils.APIResponse
// @Router /api/v1/me [get]
func GetMe(c *fiber.Ctx) error {
	userID := auth.GetUserID(c)
	var user models.User
	if database.DB.First(&user, userID).Error != nil {
		return utils.NotFound(c, "User not found")
	}
	user.Password = ""
	return utils.Success(c, user, "User retrieved")
}
