package main

import (
	"context"
	"embed"
	"fmt"
	"gopherbase/server"
	"io/fs"
	"log"
	"os"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

//go:embed all:Interface/dist
var assets embed.FS

func init() {
	godotenv.Load()
}

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://gopherbase:gopherbase@localhost:5432/gopherbase?sslmode=disable"
	}

	pool, _ := pgxpool.New(context.Background(), connStr)
	h := server.NewHandler(pool)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-default-secret-key-change-in-production"
	}
	authTable := os.Getenv("AUTH_TABLE")
	if authTable == "" {
		authTable = "auth"
	}

	server.InitAuth(jwtSecret, authTable)

	// Background initialization
	go func() {
		for h.DB == nil {
			log.Printf("Waiting for database connection...")
			newPool, err := pgxpool.New(context.Background(), connStr)
			if err == nil {
				h.DB = newPool
				break
			}
			time.Sleep(5 * time.Second)
		}

		fmt.Println("Database connected, initializing tables...")
		h.DB.Exec(context.Background(), "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";")
		h.CreateAuthTable()
		h.CreateConfigTable()
		h.CreateLogsTable()
		h.InitStorage()
		h.LoadConfigFromDB()
	}()

	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			return true
		},
		AllowCredentials: true,
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
	}))

	// API Routes
	app.Get("/ws", websocket.New(h.AIWebSocket))
	api1 := app.Group("/rest/v1")
	api1.Get("/auth/config", server.GetAuthConfig)
	api1.Post("/auth/config", h.UpdateAuthConfig)
	api1.Post("/auth/signup", h.SignUp)
	api1.Post("/auth/signin", h.SignIn)
	api1.Post("/auth/refresh", h.RefreshToken)

	protected := api1.Group("", server.AuthMiddleware)
	protected.Post("/auth/signout", server.SignOut)
	protected.Get("/auth/user", h.GetUser)
	protected.Post("/schema/create/:table", h.CreateTable)
	protected.Post("/schema/alter/:table", h.AlterTable)
	protected.Delete("/schema/drop/:table", h.DropTable)
	protected.Get("/schema/tables", h.GetTables)
	protected.Get("/schema/:table", h.GetTableSchema)
	protected.Post("/insert/:table", h.Insert)
	protected.Delete("/delete/:table", h.DeleteRow)
	protected.Get("/select/:table", h.Select)
	protected.Post("/query", h.RawQuery)
	protected.Post("/ai/query", h.AIQuery)
	protected.Get("/storage/buckets", h.ListBuckets)
	protected.Post("/storage/buckets", h.CreateBucket)
	protected.Delete("/storage/buckets/:bucket", h.DeleteBucket)
	protected.Get("/storage/buckets/:bucket/files", h.ListFiles)
	protected.Post("/storage/buckets/:bucket/upload", h.UploadFile)
	protected.Delete("/storage/buckets/:bucket/files/:file", h.DeleteFile)
	protected.Get("/storage/buckets/:bucket/files/:file", h.DownloadFile)
	protected.Get("/stats", h.GetStats)
	protected.Get("/activity", h.GetActivityLogs)

	// Serve Frontend
	dist, _ := fs.Sub(assets, "Interface/dist")

	// Use static middleware for all assets
	app.Use("/", static.New("", static.Config{
		FS:         dist,
		IndexNames: []string{"index.html"},
	}))

	// SPA Fallback: for routes that don't match static files and are not API/WS
	app.Use(func(c fiber.Ctx) error {
		path := c.Path()

		// If it's an API route, WebSocket, or static asset, return 404 instead of index.html
		// This prevents the browser from getting index.html when it expects a JS/CSS file (MIME error)
		if (len(path) >= 5 && path[:5] == "/rest") || path == "/ws" || (len(path) >= 7 && path[:7] == "/assets") {
			return c.Status(404).JSON(fiber.Map{"error": "Not Found"})
		}

		// Serve index.html for browser navigation (SPA routing)
		index, err := fs.ReadFile(dist, "index.html")
		if err == nil {
			c.Set("Content-Type", "text/html; charset=utf-8")
			return c.Send(index)
		}

		return c.Next()
	})
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("GopherBase server starting on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
