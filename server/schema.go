package server

import (
	"fmt"

	"github.com/gofiber/fiber/v3"
)

func (h *Handler) GetTables(c fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}
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
	IsPrimary     bool        `json:"isPrimary"`
	IsUnique      bool        `json:"isUnique"`
	References    *ForeignKey `json:"references"`
}

func (h *Handler) GetTableSchema(c fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}
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
			fk.update_rule,
			CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary,
			CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END as is_unique
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
		LEFT JOIN (
			SELECT kcu.table_name, kcu.column_name
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
			WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
		) as pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
		LEFT JOIN (
			SELECT kcu.table_name, kcu.column_name
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
			WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
		) as uq ON c.table_name = uq.table_name AND c.column_name = uq.column_name
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
		if err := rows.Scan(&col.Name, &col.DataType, &col.IsNullable, &col.ColumnDefault, &fkTable, &fkColumn, &fkDelete, &fkUpdate, &col.IsPrimary, &col.IsUnique); err != nil {
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

type AlterTableRequest struct {
	Add    []Column `json:"add"`
	Drop   []string `json:"drop"`
	Rename []struct {
		Old string `json:"old"`
		New string `json:"new"`
	} `json:"rename"`
}

func (h *Handler) AlterTable(c fiber.Ctx) error {
	if h.DB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not ready"})
	}
	table := c.Params("table")
	if table == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Table name is required"})
	}

	var body AlterTableRequest
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var queries []string

	// Handle drops
	for _, colName := range body.Drop {
		queries = append(queries, fmt.Sprintf("ALTER TABLE \"%s\" DROP COLUMN IF EXISTS \"%s\"", table, colName))
	}

	// Handle adds
	for _, col := range body.Add {
		colDef := buildColumnDefinition(col)
		queries = append(queries, fmt.Sprintf("ALTER TABLE \"%s\" ADD COLUMN %s", table, colDef))
	}

	// Handle renames
	for _, r := range body.Rename {
		queries = append(queries, fmt.Sprintf("ALTER TABLE \"%s\" RENAME COLUMN \"%s\" TO \"%s\"", table, r.Old, r.New))
	}

	for _, query := range queries {
		_, err := h.DB.Exec(c.Context(), query)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("ALTER TABLE SUCCESS", username, table)

	return c.JSON(fiber.Map{"message": "Table altered successfully"})
}
