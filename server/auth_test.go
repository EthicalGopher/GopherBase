package server

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestAuthMiddleware_ApiKey(t *testing.T) {
	app := fiber.New()
	
	// Setup protected route
	app.Get("/protected", AuthMiddleware, func(c fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{"status": "ok"})
	})

	// 1. Test without any auth
	req := httptest.NewRequest("GET", "/protected", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Should be 401 without any auth, but got %d", resp.StatusCode)
	}

	// 2. Test with apikey header (e.g. "public")
	// This is what the SDK sends. It SHOULD be accepted for protected routes
	// if we want the SDK to work as expected.
	req = httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("apikey", "public")
	resp, _ = app.Test(req)
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Should be 200 with apikey: public, but got %d. SDK is currently broken.", resp.StatusCode)
	}
}

func TestPasswordHashing_LegacyFallback(t *testing.T) {
	// 1. Manually create a legacy hash using the old method
	secret := "legacy-secret"
	InitAuth(secret, "auth")
	password := "legacy-pass"
	
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(password))
	legacyHash := base64.StdEncoding.EncodeToString(h.Sum(nil))

	// 2. Verify with the new VerifyPassword function
	if !VerifyPassword(password, legacyHash) {
		t.Error("Legacy password verification failed with the correct secret!")
	}

	// 3. Verify that it FAILS if the secret is rotated (as it always did)
	InitAuth("new-secret", "auth")
	if VerifyPassword(password, legacyHash) {
		t.Error("Legacy password SHOULD have failed with rotated secret, but it succeeded!")
	}
}

func TestPasswordHashing_RotationSafe(t *testing.T) {
	// 1. Initial configuration
	InitAuth("initial-secret", "auth")
	password := "secure-password"
	
	// 2. Hash password (now using bcrypt)
	hash := HashPassword(password)
	if !VerifyPassword(password, hash) {
		t.Fatal("Initial password verification failed")
	}

	// 3. Rotate secret
	InitAuth("rotated-secret", "auth")
	
	// 4. Verification MUST still pass
	if !VerifyPassword(password, hash) {
		t.Error("Bcrypt password should NOT be affected by secret rotation!")
	}
}
