package server

import (
	"github.com/gofiber/fiber/v3"
)

func (h *Handler) GetTables(c fiber.Ctx) error {
	query := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND table_name NOT LIKE 'pg_%'
		ORDER BY table_name
	`

	rows, err := h.DB.Query(c.Context(), query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		tables = append(tables, tableName)
	}

	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if tables == nil {
		tables = []string{}
	}

	return c.JSON(tables)
}

type TableColumn struct {
	Name          string      `json:"name"`
	DataType      string      `json:"dataType"`
	IsNullable    string      `json:"isNullable"`
	ColumnDefault *string     `json:"columnDefault"`
	References    *ForeignKey `json:"references"`
}

func (h *Handler) GetTableSchema(c fiber.Ctx) error {
	table := c.Params("table")
	if table == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	query := `
		SELECT 
			c.column_name, 
			c.data_type, 
			c.is_nullable, 
			c.column_default,
			fk.foreign_table_name,
			fk.foreign_column_name,
			fk.delete_rule,
			fk.update_rule
		FROM information_schema.columns c
		LEFT JOIN (
			SELECT
				kcu.table_name,
				kcu.column_name,
				ccu.table_name AS foreign_table_name,
				ccu.column_name AS foreign_column_name,
				rc.delete_rule,
				rc.update_rule
			FROM information_schema.key_column_usage AS kcu
			JOIN information_schema.referential_constraints AS rc ON kcu.constraint_name = rc.constraint_name
			JOIN information_schema.constraint_column_usage AS ccu ON rc.unique_constraint_name = ccu.constraint_name
			WHERE kcu.table_schema = 'public'
		) as fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
		WHERE c.table_schema = 'public' AND c.table_name = $1
		ORDER BY c.ordinal_position
	`

	rows, err := h.DB.Query(c.Context(), query, table)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	defer rows.Close()

	var columns []TableColumn
	for rows.Next() {
		var col TableColumn
		var fkTable, fkColumn, fkDelete, fkUpdate *string
		if err := rows.Scan(&col.Name, &col.DataType, &col.IsNullable, &col.ColumnDefault, &fkTable, &fkColumn, &fkDelete, &fkUpdate); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if fkTable != nil && fkColumn != nil {
			col.References = &ForeignKey{
				Table:    *fkTable,
				Column:   *fkColumn,
				OnDelete: *fkDelete,
				OnUpdate: *fkUpdate,
			}
		}
		columns = append(columns, col)
	}

	if err := rows.Err(); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(columns)
}
