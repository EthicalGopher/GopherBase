package server

import (
	"context"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v3"
)

type Bucket struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	IsPublic  bool      `json:"isPublic"`
	CreatedAt time.Time `json:"createdAt"`
}

type StorageFile struct {
	ID        string    `json:"id"`
	BucketID  string    `json:"bucketId"`
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	Type      string    `json:"type"`
	Path      string    `json:"path"`
	CreatedAt time.Time `json:"createdAt"`
}

func (h *Handler) InitStorage() error {
	// Create buckets table
	query := `
		CREATE TABLE IF NOT EXISTS _gopherbase_buckets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) UNIQUE NOT NULL,
			is_public BOOLEAN DEFAULT false,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`
	_, err := h.DB.Exec(context.Background(), query)
	if err != nil {
		return err
	}

	// Create files table
	query = `
		CREATE TABLE IF NOT EXISTS _gopherbase_files (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			bucket_id UUID REFERENCES _gopherbase_buckets(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			size BIGINT NOT NULL,
			type VARCHAR(100),
			path TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			UNIQUE(bucket_id, name)
		);
	`
	_, err = h.DB.Exec(context.Background(), query)
	if err != nil {
		return err
	}

	// Create storage directory
	return os.MkdirAll("./storage", 0755)
}

func (h *Handler) ListBuckets(c fiber.Ctx) error {
	rows, err := h.DB.Query(c.Context(), "SELECT id, name, is_public, created_at FROM _gopherbase_buckets ORDER BY name")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var buckets []Bucket
	for rows.Next() {
		var b Bucket
		if err := rows.Scan(&b.ID, &b.Name, &b.IsPublic, &b.CreatedAt); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		buckets = append(buckets, b)
	}

	if buckets == nil {
		buckets = []Bucket{}
	}
	return c.JSON(buckets)
}

func (h *Handler) CreateBucket(c fiber.Ctx) error {
	var body struct {
		Name     string `json:"name"`
		IsPublic bool   `json:"isPublic"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	query := "INSERT INTO _gopherbase_buckets (name, is_public) VALUES ($1, $2) RETURNING id, created_at"
	var id string
	var createdAt time.Time
	err := h.DB.QueryRow(c.Context(), query, body.Name, body.IsPublic).Scan(&id, &createdAt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Create directory for bucket
	err = os.MkdirAll(filepath.Join("./storage", body.Name), 0755)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create bucket directory"})
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("CREATE BUCKET SUCCESS", username, body.Name)

	return c.JSON(Bucket{
		ID:        id,
		Name:      body.Name,
		IsPublic:  body.IsPublic,
		CreatedAt: createdAt,
	})
}

func (h *Handler) DeleteBucket(c fiber.Ctx) error {
	bucketName := c.Params("bucket")

	// Get ID and confirm existence
	var id string
	err := h.DB.QueryRow(c.Context(), "SELECT id FROM _gopherbase_buckets WHERE name = $1", bucketName).Scan(&id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Bucket not found"})
	}

	_, err = h.DB.Exec(c.Context(), "DELETE FROM _gopherbase_buckets WHERE id = $1", id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Remove files from disk
	os.RemoveAll(filepath.Join("./storage", bucketName))

	username, _ := c.Locals("email").(string)
	h.LogActivity("DELETE BUCKET SUCCESS", username, bucketName)

	return c.JSON(fiber.Map{"message": "Bucket deleted successfully"})
}

func (h *Handler) ListFiles(c fiber.Ctx) error {
	bucketName := c.Params("bucket")

	query := `
		SELECT f.id, f.bucket_id, f.name, f.size, f.type, f.path, f.created_at
		FROM _gopherbase_files f
		JOIN _gopherbase_buckets b ON f.bucket_id = b.id
		WHERE b.name = $1
		ORDER BY f.name
	`
	rows, err := h.DB.Query(c.Context(), query, bucketName)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var files []StorageFile
	for rows.Next() {
		var f StorageFile
		if err := rows.Scan(&f.ID, &f.BucketID, &f.Name, &f.Size, &f.Type, &f.Path, &f.CreatedAt); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		files = append(files, f)
	}

	if files == nil {
		files = []StorageFile{}
	}
	return c.JSON(files)
}

func (h *Handler) UploadFile(c fiber.Ctx) error {
	bucketName := c.Params("bucket")

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file uploaded"})
	}

	// Confirm bucket exists
	var bucketID string
	err = h.DB.QueryRow(c.Context(), "SELECT id FROM _gopherbase_buckets WHERE name = $1", bucketName).Scan(&bucketID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Bucket not found"})
	}

	// Save to disk
	path := filepath.Join("./storage", bucketName, file.Filename)
	if err := c.SaveFile(file, path); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
	}

	// Save to database
	query := `
		INSERT INTO _gopherbase_files (bucket_id, name, size, type, path)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (bucket_id, name) DO UPDATE SET
			size = EXCLUDED.size,
			type = EXCLUDED.type,
			created_at = NOW()
		RETURNING id, created_at
	`
	var id string
	var createdAt time.Time
	err = h.DB.QueryRow(c.Context(), query, bucketID, file.Filename, file.Size, file.Header.Get("Content-Type"), path).Scan(&id, &createdAt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("UPLOAD FILE SUCCESS", username, bucketName+"/"+file.Filename)

	return c.JSON(StorageFile{
		ID:        id,
		BucketID:  bucketID,
		Name:      file.Filename,
		Size:      file.Size,
		Type:      file.Header.Get("Content-Type"),
		Path:      path,
		CreatedAt: createdAt,
	})
}

func (h *Handler) DeleteFile(c fiber.Ctx) error {
	bucketName := c.Params("bucket")
	fileName := c.Params("file")

	var bucketID string
	err := h.DB.QueryRow(c.Context(), "SELECT id FROM _gopherbase_buckets WHERE name = $1", bucketName).Scan(&bucketID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Bucket not found"})
	}

	_, err = h.DB.Exec(c.Context(), "DELETE FROM _gopherbase_files WHERE bucket_id = $1 AND name = $2", bucketID, fileName)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Remove from disk
	os.Remove(filepath.Join("./storage", bucketName, fileName))

	username, _ := c.Locals("email").(string)
	h.LogActivity("DELETE FILE SUCCESS", username, bucketName+"/"+fileName)

	return c.JSON(fiber.Map{"message": "File deleted successfully"})
}

func (h *Handler) DownloadFile(c fiber.Ctx) error {
	bucketName := c.Params("bucket")
	fileName := c.Params("file")

	path := filepath.Join("./storage", bucketName, fileName)
	return c.SendFile(path)
}
