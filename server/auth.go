package server

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var AuthConfig AuthSettings
var configMu sync.RWMutex

func (h *Handler) maybeCreateConfigTable() error {
	if h.DB == nil {
		return fmt.Errorf("database not initialized")
	}
	_, err := h.DB.Exec(context.Background(), "SELECT 1 FROM _gopherbase_config LIMIT 1")
	if err != nil && (strings.Contains(err.Error(), "does not exist") || strings.Contains(err.Error(), "42P01")) {
		return h.CreateConfigTable()
	}
	return nil
}

type AuthSettings struct {
	JWTSecret          string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
	TableName          string
}

type Config struct {
	JWT  Secret             `json:"jwt"`
	Auth AuthConfigSettings `json:"auth"`
}

type Secret struct {
	Secret    string `json:"secret"`
	ExpiresAt *int64 `json:"expires_at"`
	Algorithm string `json:"algorithm"`
}

type AuthConfigSettings struct {
	EnableSignUp        bool        `json:"enable_signup"`
	DoubleConfirm       bool        `json:"double_confirm"`
	EnableConfirmations bool        `json:"enable_confirmations"`
	Fields              []AuthField `json:"fields"`
}

type AuthField struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
}

type JWTPayload struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AuthToken struct {
	AccessToken  string                 `json:"access_token"`
	RefreshToken string                 `json:"refresh_token"`
	TokenType    string                 `json:"token_type"`
	ExpiresIn    int                    `json:"expires_in"`
	User         map[string]interface{} `json:"user"`
}

func InitAuth(secret string, tableName string) {
	AuthConfig = AuthSettings{
		JWTSecret:          secret,
		AccessTokenExpiry:  24 * time.Hour,
		RefreshTokenExpiry: 7 * 24 * time.Hour,
		TableName:          tableName,
	}
}

func (h *Handler) CreateAuthTable() error {
	query := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`, AuthConfig.TableName)

	_, err := h.DB.Exec(context.Background(), query)
	if err != nil {
		return fmt.Errorf("failed to create auth table: %w", err)
	}

	return h.CreateAuthTableWithFields(nil)
}

func (h *Handler) CreateAuthTableWithFields(fields []AuthField) error {
	for _, field := range fields {
		query := fmt.Sprintf(`
			ALTER TABLE %s ADD COLUMN IF NOT EXISTS %s %s;
		`, AuthConfig.TableName, field.Name, field.Type)

		_, err := h.DB.Exec(context.Background(), query)
		if err != nil {
			return fmt.Errorf("failed to add column %s: %w", field.Name, err)
		}
	}
	return nil
}

func (h *Handler) CreateConfigTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS _gopherbase_config (
			key VARCHAR(255) PRIMARY KEY,
			value JSONB NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`
	_, err := h.DB.Exec(context.Background(), query)
	return err
}

func (h *Handler) LoadConfigFromDB() error {
	if h.DB == nil {
		return fmt.Errorf("database not initialized")
	}
	
	if err := h.maybeCreateConfigTable(); err != nil {
		return err
	}

	var configJSON string
	err := h.DB.QueryRow(context.Background(),
		"SELECT value::text FROM _gopherbase_config WHERE key = 'auth'",
	).Scan(&configJSON)

	if err != nil {
		return err
	}

	var config Config
	err = parseConfigJSON(configJSON, &config)
	if err != nil {
		return err
	}

	if config.JWT.Secret != "" {
		configMu.Lock()
		AuthConfig.JWTSecret = config.JWT.Secret
		configMu.Unlock()
	}

	return nil
}

func parseConfigJSON(jsonStr string, config *Config) error {
	return json.Unmarshal([]byte(jsonStr), config)
}

func (h *Handler) SetJWTSecret(secret string) error {
	configMu.Lock()
	AuthConfig.JWTSecret = secret
	configMu.Unlock()

	if err := h.maybeCreateConfigTable(); err != nil {
		return err
	}

	configJSON := fmt.Sprintf(`{"jwt": {"secret": "%s", "algorithm": "HS256"}}`, secret)

	_, err := h.DB.Exec(context.Background(),
		`INSERT INTO _gopherbase_config (key, value, updated_at) 
		 VALUES ('auth', $1::jsonb, NOW()) 
		 ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
		configJSON,
	)

	return err
}

func GetJWTSecret() string {
	configMu.RLock()
	defer configMu.RUnlock()
	return AuthConfig.JWTSecret
}

func (h *Handler) GenerateToken(userID, email string) (AuthToken, error) {
	now := time.Now()

	accessClaims := JWTPayload{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(AuthConfig.AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	refreshClaims := JWTPayload{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(AuthConfig.RefreshTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(AuthConfig.JWTSecret))
	if err != nil {
		return AuthToken{}, err
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(AuthConfig.JWTSecret))
	if err != nil {
		return AuthToken{}, err
	}

	userData := fiber.Map{
		"id":    userID,
		"email": email,
	}

	if h.DB != nil {
		rows, err := h.DB.Query(context.Background(), fmt.Sprintf("SELECT * FROM %s WHERE id = $1", AuthConfig.TableName), userID)
		if err == nil {
			defer rows.Close()
			if rows.Next() {
				values, err := rows.Values()
				if err == nil {
					fields := rows.FieldDescriptions()
					for i, fd := range fields {
						col := string(fd.Name)
						if col != "password_hash" {
							userData[col] = values[i]
						}
					}
				}
			}
			if err := rows.Err(); err != nil {
				fmt.Println("Error iterating rows:", err)
			}
		}
	}

	return AuthToken{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		TokenType:    "Bearer",
		ExpiresIn:    int(AuthConfig.AccessTokenExpiry.Seconds()),
		User:         userData,
	}, nil
}

func VerifyToken(tokenString string) (*JWTPayload, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTPayload{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(AuthConfig.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTPayload); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func AuthMiddleware(c fiber.Ctx) error {
	// 1. Check for API Key first (SDK support)
	apiKey := c.Get("apikey")
	if apiKey != "" {
		// In a real system, we'd check if this key is valid in DB.
		// For GopherBase, "public" is the default unauthenticated key,
		// and private keys are JWTs.
		if apiKey == "public" {
			// Public key access - we allow it but don't set user_id/email
			return c.Next()
		}
		
		// If it looks like a JWT, treat it as one
		if len(apiKey) > 20 && strings.Count(apiKey, ".") == 2 {
			claims, err := VerifyToken(apiKey)
			if err == nil {
				c.Locals("user_id", claims.UserID)
				c.Locals("email", claims.Email)
				return c.Next()
			}
		}
	}

	// 2. Fallback to Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		// 3. Also check cookies
		cookie := c.Cookies("gopherbase_access_token")
		if cookie != "" {
			authHeader = "Bearer " + cookie
		}
	}

	if authHeader == "" || len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized: Missing or invalid token",
		})
	}

	tokenString := authHeader[7:]
	claims, err := VerifyToken(tokenString)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Unauthorized: " + err.Error(),
		})
	}

	c.Locals("user_id", claims.UserID)
	c.Locals("email", claims.Email)
	return c.Next()
}

func HashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes)
}

func VerifyPassword(password, hash string) bool {
	// Try bcrypt first
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err == nil {
		return true
	}

	// Fallback to legacy HMAC-SHA256 for backward compatibility
	h := hmac.New(sha256.New, []byte(AuthConfig.JWTSecret))
	h.Write([]byte(password))
	legacyHash := base64.StdEncoding.EncodeToString(h.Sum(nil))
	return legacyHash == hash
}

func setAuthCookies(c fiber.Ctx, token AuthToken) {
	c.Cookie(&fiber.Cookie{
		Name:     "gopherbase_access_token",
		Value:    token.AccessToken,
		Path:     "/",
		Expires:  time.Now().Add(AuthConfig.AccessTokenExpiry),
		Secure:   false,
		HTTPOnly: true,
		SameSite: "Lax",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "gopherbase_refresh_token",
		Value:    token.RefreshToken,
		Path:     "/",
		Expires:  time.Now().Add(AuthConfig.RefreshTokenExpiry),
		Secure:   false,
		HTTPOnly: true,
		SameSite: "Lax",
	})
}

func clearAuthCookies(c fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:    "gopherbase_access_token",
		Value:   "",
		Path:    "/",
		Expires: time.Now().Add(-time.Hour),
	})
	c.Cookie(&fiber.Cookie{
		Name:    "gopherbase_refresh_token",
		Value:   "",
		Path:    "/",
		Expires: time.Now().Add(-time.Hour),
	})
}

type SignUpRequest struct {
	Email    string                 `json:"email"`
	Password string                 `json:"password"`
	Metadata map[string]interface{} `json:"metadata"`
}

type SignInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) SignUp(c fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}
	var body SignUpRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if body.Email == "" || body.Password == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	passwordHash := HashPassword(body.Password)

	var existingID string
	err := h.DB.QueryRow(c.Context(),
		fmt.Sprintf("SELECT id FROM %s WHERE email = $1", AuthConfig.TableName),
		body.Email,
	).Scan(&existingID)

	if err == nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "User already exists",
		})
	}

	columns := []string{"email", "password_hash"}
	values := []interface{}{body.Email, passwordHash}

	if body.Metadata != nil {
		for key, value := range body.Metadata {
			columns = append(columns, key)
			values = append(values, value)
		}
	}

	colStr := ""
	valStr := ""
	for i, col := range columns {
		if i > 0 {
			colStr += ", "
			valStr += ", "
		}
		colStr += col
		valStr += fmt.Sprintf("$%d", i+1)
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id", AuthConfig.TableName, colStr, valStr)

	var userID string
	err = h.DB.QueryRow(c.Context(), query, values...).Scan(&userID)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create user: " + err.Error(),
		})
	}

	token, err := h.GenerateToken(userID, body.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	setAuthCookies(c, token)
	return c.Status(201).JSON(token)
}

func (h *Handler) SignIn(c fiber.Ctx) error {
	var body SignInRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if body.Email == "" || body.Password == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	// 1. Check against Environment Variables first (Admin Bypass)
	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	// Fallback to same defaults as frontend if env not set
	if adminEmail == "" {
		adminEmail = "admin@example.com"
	}
	if adminPassword == "" {
		adminPassword = "password"
	}

	if body.Email == adminEmail && body.Password == adminPassword {
		// Issue a token for a fixed "admin" ID
		token, err := h.GenerateToken("00000000-0000-0000-0000-000000000000", adminEmail)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
		}
		setAuthCookies(c, token)
		return c.JSON(token)
	}

	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}

	// 2. Fallback to Database check
	var user User
	err := h.DB.QueryRow(c.Context(),
		fmt.Sprintf("SELECT id, email, password_hash FROM %s WHERE email = $1", AuthConfig.TableName),
		body.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash)

	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	if !VerifyPassword(body.Password, user.PasswordHash) {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	token, err := h.GenerateToken(user.ID, user.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	setAuthCookies(c, token)
	return c.JSON(token)
}

func (h *Handler) GetUser(c fiber.Ctx) error {
	userID := c.Locals("user_id")
	email := c.Locals("email")

	result := fiber.Map{
		"id":    userID,
		"email": email,
	}

	if h.DB == nil {
		return c.JSON(result)
	}

	rows, err := h.DB.Query(c.Context(), fmt.Sprintf("SELECT * FROM %s WHERE id = $1", AuthConfig.TableName), userID)
	if err == nil {
		defer rows.Close()
		if rows.Next() {
			values, err := rows.Values()
			if err == nil {
				fields := rows.FieldDescriptions()
				for i, fd := range fields {
					col := string(fd.Name)
					if col != "password_hash" {
						result[col] = values[i]
					}
				}
			}
		}
		if err := rows.Err(); err != nil {
			fmt.Println("Error iterating rows:", err)
		}
	}

	return c.JSON(result)
}

func (h *Handler) RefreshToken(c fiber.Ctx) error {
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token"`
	}

	var body RefreshRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	claims, err := VerifyToken(body.RefreshToken)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid or expired refresh token",
		})
	}

	token, err := h.GenerateToken(claims.UserID, claims.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	setAuthCookies(c, token)
	return c.JSON(token)
}

func SignOut(c fiber.Ctx) error {
	clearAuthCookies(c)
	return c.JSON(fiber.Map{
		"message": "Signed out successfully",
	})
}

func GetAuthConfig(c fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"site_url":             "",
		"add_auth_headers":     true,
		"enable_signup":        true,
		"double_confirm":       true,
		"enable_confirmations": false,
		"fields":               []AuthField{},
	})
}

type UpdateConfigRequest struct {
	JWT *struct {
		Secret string `json:"secret"`
	} `json:"jwt"`
	Auth *AuthConfigSettings `json:"auth"`
}

func (h *Handler) UpdateAuthConfig(c fiber.Ctx) error {
	var body UpdateConfigRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if body.JWT != nil && body.JWT.Secret != "" {
		err := h.SetJWTSecret(body.JWT.Secret)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to update JWT secret: " + err.Error(),
			})
		}
	}

	if body.Auth != nil && len(body.Auth.Fields) > 0 {
		err := h.CreateAuthTableWithFields(body.Auth.Fields)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to create auth table with fields: " + err.Error(),
			})
		}
	}

	return c.JSON(fiber.Map{
		"message": "Configuration updated successfully",
	})
}
