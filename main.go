package main

import (
	"context"
	"fmt"
	"gopherbase/server"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func init() {
	godotenv.Load()
}

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://gopherbase:gopherbase@localhost:5432/gopherbase?sslmode=disable"
	}

	// Auth initialization
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-default-secret-key-change-in-production"
	}
	authTable := os.Getenv("AUTH_TABLE")
	if authTable == "" {
		authTable = "auth"
	}
	server.InitAuth(jwtSecret, authTable)

	// Database initialization
	var pool *pgxpool.Pool
	var err error
	
	for {
		log.Printf("Connecting to database at %s...", connStr)
		
		// Parse connection string to get target database name
		config, parseErr := pgxpool.ParseConfig(connStr)
		if parseErr == nil {
			targetDB := config.ConnConfig.Database
			
			// Try to connect to target DB first
			pool, err = pgxpool.New(context.Background(), connStr)
			if err == nil && pool != nil {
				err = pool.Ping(context.Background())
				if err == nil {
					break // Successfully connected to target DB
				}
				
				// If error is "database does not exist", try to create it
				if err != nil && (strings.Contains(err.Error(), "does not exist") || strings.Contains(err.Error(), "3D000")) {
					log.Printf("Database %s does not exist. Attempting to create...", targetDB)
					
					// Connect to default 'postgres' database to create the target one
					adminConfig := config.Copy()
					adminConfig.ConnConfig.Database = "postgres"
					
					adminConn, adminErr := pgx.ConnectConfig(context.Background(), adminConfig.ConnConfig)
					if adminErr == nil {
						// Double quote the database name to avoid issues with reserved words or special characters
						_, createErr := adminConn.Exec(context.Background(), fmt.Sprintf("CREATE DATABASE \"%s\"", targetDB))
						adminConn.Close(context.Background())
						
						if createErr == nil {
							log.Printf("Database %s created successfully.", targetDB)
							// Now retry connecting to the new database
							if pool != nil {
								pool.Close()
							}
							pool = nil // Clear pool for next iteration
							continue 
						} else {
							log.Printf("Failed to create database: %v", createErr)
							err = createErr // Update err for logging
						}
					} else {
						log.Printf("Failed to connect to admin database: %v", adminErr)
						err = adminErr // Update err for logging
					}
				}
			}
		} else {
			log.Printf("Failed to parse connection string: %v", parseErr)
		}
		
		log.Printf("Database connection failed: %v. Retrying in 5 seconds...", err)
		if pool != nil {
			pool.Close()
		}
		time.Sleep(5 * time.Second)
	}

	h := server.NewHandler(pool)
	fmt.Println("Database connected, initializing tables...")
	
	ctx := context.Background()
	_, err = h.DB.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";")
	if err != nil {
		log.Printf("Warning: Failed to create pgcrypto extension: %v", err)
	}
	
	if err := h.CreateConfigTable(); err != nil {
		log.Printf("Error creating config table: %v", err)
	}

	if err := h.CreateAuthTable(); err != nil {
		log.Printf("Error creating auth table: %v", err)
	}
	
	if err := h.CreateLogsTable(); err != nil {
		log.Printf("Error creating logs table: %v", err)
	}
	
	if err := h.InitStorage(); err != nil {
		log.Printf("Error initializing storage: %v", err)
	}
	
	if err := h.LoadConfigFromDB(); err != nil {
		log.Printf("Note: Could not load initial config from DB (may be first run): %v", err)
	}
	
	fmt.Println("Database initialization completed.")

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			return true
		},
		AllowCredentials: true,
		AllowHeaders:     []string{"Content-Type", "Authorization", "Accept"},
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
	protected.Get("/config", h.GetConfig)
	protected.Post("/config", h.UpdateConfig)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("GopherBase server starting on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
