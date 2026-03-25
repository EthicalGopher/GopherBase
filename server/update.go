package server

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
)

type UpdateRequest struct {
	Where map[string]any `json:"where"`
	Set   map[string]any `json:"set"`
}

func (h *Handler) UpdateRow(c fiber.Ctx) error {
	table := c.Params("table")
	if table == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	var body UpdateRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(body.Where) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Where conditions required",
		})
	}

	if len(body.Set) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Set values required",
		})
	}

	setClauses := make([]string, 0, len(body.Set))
	setValues := make([]any, 0, len(body.Set))
	i := 1

	for col, val := range body.Set {
		setClauses = append(setClauses, fmt.Sprintf("\"%s\" = $%d", col, i))
		setValues = append(setValues, val)
		i++
	}

	whereClauses := make([]string, 0, len(body.Where))
	for col, val := range body.Where {
		whereClauses = append(whereClauses, fmt.Sprintf("\"%s\" = $%d", col, i))
		setValues = append(setValues, val)
		i++
	}

	query := fmt.Sprintf(
		"UPDATE \"%s\" SET %s WHERE %s",
		table,
		strings.Join(setClauses, ", "),
		strings.Join(whereClauses, " AND "),
	)

	_, err := h.DB.Exec(c.Context(), query, setValues...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("UPDATE SUCCESS", username, table)

	return c.Status(200).JSON(fiber.Map{
		"message": "Row updated successfully",
	})
}
