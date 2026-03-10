package server

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func (h *Handler) DeleteRow(c fiber.Ctx) error {
	table := c.Params("table")
	if table == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	var body map[string]any
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(body) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Where conditions required",
		})
	}

	conditions := make([]string, 0, len(body))
	values := make([]any, 0, len(body))
	i := 1

	for col, val := range body {
		conditions = append(conditions, fmt.Sprintf("%s = $%d", col, i))
		values = append(values, val)
		i++
	}

	query := fmt.Sprintf(
		"DELETE FROM %s WHERE %s",
		table,
		strings.Join(conditions, " AND "),
	)

	_, err := h.DB.Exec(c.Context(), query, values...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("DELETE SUCCESS", username, table)

	return c.Status(200).JSON(fiber.Map{
		"message": "Row deleted successfully",
	})
}
