package main

import (
	"context"
	"gopherbase/server"
)

// App struct
type App struct {
	ctx     context.Context
	handler *server.Handler
}

// NewApp creates a new App application struct
func NewApp(h *server.Handler) *App {
	return &App{
		handler: h,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetTables returns a list of tables in the database
func (a *App) GetTables() ([]string, error) {
	query := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND table_name NOT LIKE 'pg_%'
		ORDER BY table_name
	`

	rows, err := a.handler.DB.Query(a.ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	if tables == nil {
		tables = []string{}
	}

	return tables, nil
}
