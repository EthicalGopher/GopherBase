package server

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
)

type Stats struct {
	ActiveConnections int     `json:"activeConnections"`
	StorageUsageBytes int64   `json:"storageUsageBytes"`
	TableCount        int     `json:"tableCount"`
	APIRequests24h    int     `json:"apiRequests24h"`
}

type ActivityLog struct {
	ID        string    `json:"id"`
	Event     string    `json:"event"`
	User      string    `json:"user"`
	Table     string    `json:"table"`
	Timestamp time.Time `json:"timestamp"`
}

func (h *Handler) CreateLogsTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS _gopherbase_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event VARCHAR(255) NOT NULL,
			username VARCHAR(255),
			table_name VARCHAR(255),
			timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`
	_, err := h.DB.Exec(context.Background(), query)
	return err
}

func (h *Handler) LogActivity(event, username, tableName string) {
	query := `
		INSERT INTO _gopherbase_logs (event, username, table_name)
		VALUES ($1, $2, $3)
	`
	_, err := h.DB.Exec(context.Background(), query, event, username, tableName)
	if err != nil {
		fmt.Printf("Error logging activity: %v\n", err)
	}
}

func (h *Handler) GetStats(c fiber.Ctx) error {
	var stats Stats

	// Get active connections
	err := h.DB.QueryRow(c.Context(), "SELECT count(*) FROM pg_stat_activity").Scan(&stats.ActiveConnections)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Get database size
	err = h.DB.QueryRow(c.Context(), "SELECT pg_database_size(current_database())").Scan(&stats.StorageUsageBytes)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Get table count
	err = h.DB.QueryRow(c.Context(), "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%' AND table_name NOT LIKE '_gopherbase_%'").Scan(&stats.TableCount)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Get API requests in last 24h from logs
	err = h.DB.QueryRow(c.Context(), "SELECT count(*) FROM _gopherbase_logs WHERE timestamp > NOW() - INTERVAL '24 hours'").Scan(&stats.APIRequests24h)
	if err != nil {
		// If table doesn't exist yet or other error, just return 0
		stats.APIRequests24h = 0
	}

	return c.JSON(stats)
}

func (h *Handler) GetActivityLogs(c fiber.Ctx) error {
	query := `
		SELECT id, event, username, table_name, timestamp
		FROM _gopherbase_logs
		ORDER BY timestamp DESC
		LIMIT 50
	`

	rows, err := h.DB.Query(c.Context(), query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	var logs []ActivityLog
	for rows.Next() {
		var log ActivityLog
		var username, tableName *string
		if err := rows.Scan(&log.ID, &log.Event, &username, &tableName, &log.Timestamp); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		if username != nil {
			log.User = *username
		}
		if tableName != nil {
			log.Table = *tableName
		}
		logs = append(logs, log)
	}

	if logs == nil {
		logs = []ActivityLog{}
	}

	return c.JSON(logs)
}
