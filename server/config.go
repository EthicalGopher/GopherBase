package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v3"
)

type ConfigItem struct {
	Key   string      `json:"key"`
	Value interface{} `json:"value"`
}

func (h *Handler) GetConfig(c fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}
	rows, err := h.DB.Query(c.Context(), "SELECT key, value FROM _gopherbase_config")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	config := make(map[string]interface{})
	for rows.Next() {
		var key string
		var value []byte
		if err := rows.Scan(&key, &value); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		var parsedValue interface{}
		json.Unmarshal(value, &parsedValue)
		config[key] = parsedValue
	}

	return c.JSON(config)
}

func (h *Handler) UpdateConfig(c fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}
	var body ConfigItem
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	valueJSON, err := json.Marshal(body.Value)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid value format"})
	}

	log.Printf("[Config] Updating key=%s value=%s", body.Key, string(valueJSON))

	query := `
		INSERT INTO _gopherbase_config (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
	`
	_, err = h.DB.Exec(c.Context(), query, body.Key, valueJSON)
	if err != nil {
		log.Printf("[Config] Error updating %s: %v", body.Key, err)
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": fmt.Sprintf("Config %s updated successfully", body.Key)})
}

func (h *Handler) GetConfigValue(key string) string {
	if h.DB == nil {
		return ""
	}
	var value []byte
	err := h.DB.QueryRow(context.Background(), "SELECT value FROM _gopherbase_config WHERE key = $1", key).Scan(&value)
	if err != nil {
		if err.Error() != "no rows in result set" {
			log.Printf("[Config] Error getting %s: %v", key, err)
		}
		return ""
	}
	
	var str string
	if err := json.Unmarshal(value, &str); err == nil {
		return str
	}
	
	result := string(value)
	return result
}
