package server

import (
	"fmt"
	"log"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func (h *Handler) Select(c fiber.Ctx) error {
	table := c.Params("table")
	if table == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	if h.DB == nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Database connection is not initialized",
		})
	}

	checkQuery := fmt.Sprintf("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)")
	var exists bool
	err := h.DB.QueryRow(c.Context(), checkQuery, table).Scan(&exists)
	if err != nil {
		log.Printf("Error checking table existence: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to check table",
		})
	}
	if !exists {
		return c.Status(404).JSON(fiber.Map{
			"error": "Table not found",
		})
	}

	columns := c.Query("select", "*")
	limit := c.Query("limit", "100")
	offset := c.Query("offset", "0")
	order := c.Query("order")
	where := c.Query("where")

	query := fmt.Sprintf("SELECT %s FROM \"%s\"", columns, table)

	if where != "" {
		query += fmt.Sprintf(" WHERE %s", where)
	}

	if order != "" {
		query += fmt.Sprintf(" ORDER BY %s", order)
	}

	query += fmt.Sprintf(" LIMIT %s OFFSET %s", limit, offset)

	rows, err := h.DB.Query(c.Context(), query)
	if err != nil {
		log.Printf("Select query error: %v", err)
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	defer rows.Close()

	fieldDescriptions := rows.FieldDescriptions()
	var results []map[string]interface{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		row := make(map[string]interface{})
		for i, fd := range fieldDescriptions {
			if b, ok := values[i].([16]byte); ok {
				row[fd.Name] = fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
			} else {
				row[fd.Name] = values[i]
			}
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if results == nil {
		results = []map[string]interface{}{}
	}

	return c.JSON(results)
}

type RawQueryRequest struct {
	Query string `json:"query"`
}

func (h *Handler) RawQuery(c fiber.Ctx) error {
	var body RawQueryRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	query := strings.TrimSpace(body.Query)
	if query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query cannot be empty"})
	}

	isSelect := strings.HasPrefix(strings.ToUpper(query), "SELECT") || strings.HasPrefix(strings.ToUpper(query), "WITH")

	username, _ := c.Locals("email").(string)
	h.LogActivity("RAW SQL EXECUTE", username, "")

	if isSelect {
		rows, err := h.DB.Query(c.Context(), query)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		defer rows.Close()

		fieldDescriptions := rows.FieldDescriptions()
		columns := make([]string, len(fieldDescriptions))
		for i, fd := range fieldDescriptions {
			columns[i] = fd.Name
		}

		var results []map[string]any
		for rows.Next() {
			values, err := rows.Values()
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": err.Error()})
			}

			rowMap := make(map[string]any)
			for i, col := range columns {
				val := values[i]
				if b, ok := val.([16]byte); ok {
					rowMap[col] = fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
				} else {
					rowMap[col] = val
				}
			}
			results = append(results, rowMap)
		}

		if results == nil {
			results = []map[string]any{}
		}

		return c.JSON(fiber.Map{
			"columns": columns,
			"rows":    results,
		})
	} else {
		tag, err := h.DB.Exec(c.Context(), query)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{
			"message":      "Query executed successfully",
			"rowsAffected": tag.RowsAffected(),
		})
	}
}
