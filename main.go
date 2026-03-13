package main

import (
	"context"
	"fmt"
	"gopherbase/server"
	"log"
	"os"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://gopherbase:gopherbase@localhost:5432/gopherbase?sslmode=disable"
	}
	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	h := server.NewHandler(pool)

	fmt.Println("Connected to PostgreSQL")

	_, err = pool.Exec(context.Background(), "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";")
	if err != nil {
		log.Printf("Warning: Failed to create pgcrypto extension: %v\n", err)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-default-secret-key-change-in-production"
	}
	authTable := os.Getenv("AUTH_TABLE")
	if authTable == "" {
		authTable = "auth"
	}

	server.InitAuth(jwtSecret, authTable)

	err = h.CreateAuthTable()
	if err != nil {
		log.Printf("Warning: Failed to create auth table: %v\n", err)
	}

	err = h.CreateConfigTable()
	if err != nil {
		log.Printf("Warning: Failed to create config table: %v\n", err)
	}

	err = h.CreateLogsTable()
	if err != nil {
		log.Printf("Warning: Failed to create logs table: %v\n", err)
	}

	err = h.InitStorage()
	if err != nil {
		log.Printf("Warning: Failed to initialize storage: %v\n", err)
	}

	err = h.LoadConfigFromDB()
	if err != nil {
		log.Printf("Note: No config found in database, using defaults")
	}

	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://localhost:5174",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:5173",
			"http://127.0.0.1:5174",
		},
		AllowCredentials: true,
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
	}))

	// Top-level WebSocket route
	app.Get("/ws", websocket.New(h.AIWebSocket))

	api := app.Group("/rest")
	api1 := api.Group("/v1")

	api1.Get("/auth/config", server.GetAuthConfig)
	api1.Post("/auth/config", h.UpdateAuthConfig)
	api1.Post("/auth/signup", h.SignUp)
	api1.Post("/auth/signin", h.SignIn)
	api1.Post("/auth/refresh", h.RefreshToken)

	protected := api1.Group("", server.AuthMiddleware)
	protected.Post("/auth/signout", server.SignOut)
	protected.Get("/auth/user", h.GetUser)

	api1.Post("/schema/create/:table", server.AuthMiddleware, h.CreateTable)
	api1.Post("/schema/alter/:table", server.AuthMiddleware, h.AlterTable)
	api1.Delete("/schema/drop/:table", server.AuthMiddleware, h.DropTable)
	api1.Get("/schema/tables", server.AuthMiddleware, h.GetTables)
	api1.Get("/schema/:table", server.AuthMiddleware, h.GetTableSchema)

	api1.Post("/insert/:table", server.AuthMiddleware, h.Insert)
	api1.Delete("/delete/:table", server.AuthMiddleware, h.DeleteRow)

	api1.Get("/select/:table", server.AuthMiddleware, h.Select)
	api1.Post("/query", server.AuthMiddleware, h.RawQuery)
	api1.Post("/ai/query", server.AuthMiddleware, h.AIQuery)

	protected.Get("/storage/buckets", h.ListBuckets)
	protected.Post("/storage/buckets", h.CreateBucket)
	protected.Delete("/storage/buckets/:bucket", h.DeleteBucket)
	protected.Get("/storage/buckets/:bucket/files", h.ListFiles)
	protected.Post("/storage/buckets/:bucket/upload", h.UploadFile)
	protected.Delete("/storage/buckets/:bucket/files/:file", h.DeleteFile)
	protected.Get("/storage/buckets/:bucket/files/:file", h.DownloadFile)

	protected.Get("/stats", h.GetStats)
	protected.Get("/activity", h.GetActivityLogs)

	log.Fatal(app.Listen(":8080"))

}
