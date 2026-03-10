package server

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	DB *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{DB: db}
}

type ForeignKey struct {
	Table    string `json:"table"`
	Column   string `json:"column"`
	OnDelete string `json:"onDelete"`
	OnUpdate string `json:"onUpdate"`
}

type Column struct {
	Name          string      `json:"name"`
	Type          string      `json:"type"`
	Primary       *bool       `json:"primary"`
	Unique        *bool       `json:"unique"`
	NotNull       *bool       `json:"notNull"`
	Nullable      *bool       `json:"nullable"`
	Index         *bool       `json:"index"`
	Default       any         `json:"default"`
	Length        *int        `json:"length"`
	Unsigned      *bool       `json:"unsigned"`
	AutoIncrement *bool       `json:"autoIncrement"`
	References    *ForeignKey `json:"references"`
	Check         string      `json:"check"`
	Comment       string      `json:"comment"`
}

type CreateTableRequest struct {
	Name    string   `json:"name"`
	Columns []Column `json:"columns"`
}

func (h *Handler) CreateTable(c fiber.Ctx) error {
	table := c.Params("table")
	if table == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	var body CreateTableRequest

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(body.Columns) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Columns required",
		})
	}

	columnDefs := make([]string, 0, len(body.Columns))
	for _, col := range body.Columns {
		if col.References != nil && (col.References.Table == "" || col.References.Column == "") {
			return c.Status(400).JSON(fiber.Map{
				"error": fmt.Sprintf("Foreign key reference for column '%s' is missing table or column", col.Name),
			})
		}
		colDef := buildColumnDefinition(col)
		columnDefs = append(columnDefs, colDef)
	}

	query := fmt.Sprintf("CREATE TABLE IF NOT EXISTS \"%s\" (%s);", table, strings.Join(columnDefs, ", "))

	_, err := h.DB.Exec(c.Context(), query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("CREATE TABLE SUCCESS", username, table)

	for _, col := range body.Columns {
		if col.Index != nil && *col.Index {
			indexName := fmt.Sprintf("idx_%s_%s", table, col.Name)
			indexQuery := fmt.Sprintf("CREATE INDEX IF NOT EXISTS \"%s\" ON \"%s\" (\"%s\");", indexName, table, col.Name)
			_, err := h.DB.Exec(c.Context(), indexQuery)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{
					"error": "Failed to create index: " + err.Error(),
				})
			}
		}
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "Table created successfully",
	})
}

func (h *Handler) DropTable(c fiber.Ctx) error {
	table := c.Params("table")
	if table == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	query := fmt.Sprintf("DROP TABLE IF EXISTS %s;", table)

	_, err := h.DB.Exec(c.Context(), query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("DROP TABLE SUCCESS", username, table)

	return c.Status(200).JSON(fiber.Map{
		"message": "Table dropped successfully",
	})
}

func buildColumnDefinition(col Column) string {
	colType := col.Type
	if col.Length != nil {
		colType = fmt.Sprintf("%s(%d)", col.Type, *col.Length)
	}

	def := fmt.Sprintf("\"%s\" %s", col.Name, colType)

	if col.NotNull != nil && *col.NotNull {
		def += " NOT NULL"
	}

	if col.Nullable != nil && *col.Nullable {
		def += " NULL"
	}

	if col.Primary != nil && *col.Primary {
		def += " PRIMARY KEY"
	}

	if col.Unique != nil && *col.Unique {
		def += " UNIQUE"
	}

	if col.Default != nil {
		switch v := col.Default.(type) {
		case string:
			if strings.HasSuffix(v, "()") || strings.ToUpper(v) == "CURRENT_TIMESTAMP" || strings.ToUpper(v) == "NOW" {
				def += fmt.Sprintf(" DEFAULT %s", v)
			} else {
				def += fmt.Sprintf(" DEFAULT '%s'", strings.ReplaceAll(v, "'", "''"))
			}
		default:
			def += fmt.Sprintf(" DEFAULT %v", v)
		}
	}

	if col.AutoIncrement != nil && *col.AutoIncrement {
		def += " GENERATED ALWAYS AS IDENTITY"
	}

	if col.References != nil {
		def += fmt.Sprintf(" REFERENCES \"%s\"(\"%s\")", col.References.Table, col.References.Column)
		if col.References.OnDelete != "" {
			def += fmt.Sprintf(" ON DELETE %s", strings.ToUpper(col.References.OnDelete))
		}
		if col.References.OnUpdate != "" {
			def += fmt.Sprintf(" ON UPDATE %s", strings.ToUpper(col.References.OnUpdate))
		}
	}

	if col.Check != "" {
		def += fmt.Sprintf(" CHECK (%s)", col.Check)
	}

	if col.Comment != "" {
		def += fmt.Sprintf(" COMMENT '%s'", strings.ReplaceAll(col.Comment, "'", "''"))
	}

	return def
}

type InsertRequest struct {
	Data map[string]any `json:"data"`
}

func (h *Handler) Insert(c fiber.Ctx) error {
	fmt.Println("Hi")
	table := c.Params("table")
	fmt.Println(table)
	if table == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	var body InsertRequest

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(body.Data) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Data is required",
		})
	}

	columns := make([]string, 0, len(body.Data))
	values := make([]any, 0, len(body.Data))
	placeholders := make([]string, 0, len(body.Data))

	i := 0
	for col, val := range body.Data {
		columns = append(columns, col)
		values = append(values, val)
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
		i++
	}

	query := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		table,
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)

	_, err := h.DB.Exec(c.Context(), query, values...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	username, _ := c.Locals("email").(string)
	h.LogActivity("INSERT SUCCESS", username, table)

	return c.Status(201).JSON(fiber.Map{
		"message": "Row inserted successfully",
	})
}
