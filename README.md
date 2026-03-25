# GopherBase

GopherBase is a PostgreSQL-based database management system with a Go backend and React frontend.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

```bash
docker-compose up -d
```

Access the application at `http://localhost:4173`

## Services Overview

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `backend` | `ethicalgopher/gopherbase:latest` | 8080 | Go Fiber API server |
| `frontend` | `ethicalgopher/gopherbase-frontend:latest` | 4173 | Vite React application |
| `postgres` | `postgres:16-alpine` | 5432 | PostgreSQL database |
| `ollama` | `ollama/ollama:latest` | 11434 | Local LLM service (mistral:7b-instruct) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://gopherbase:gopherbase@postgres:5432/gopherbase?sslmode=disable` | PostgreSQL connection string |
| `JWT_SECRET` | `dev-secret` | JWT authentication secret |
| `OLLAMA_HOST` | `http://ollama:11434` | Ollama service URL |

## Ports Mapping

| Service | Internal | External |
|---------|----------|----------|
| Backend API | 8080 | 8080 |
| Frontend | 4173 | 4173 |
| PostgreSQL | 5432 | - |
| Ollama | 11434 | - |

## Common Tasks

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build --no-cache

# Full rebuild
docker-compose down --remove-orphans
docker-compose up --build -d
```

## Building Images Locally

To build images locally instead of using Docker Hub:

```bash
# Build backend
docker build -t gopherbase:local .
docker tag gopherbase:local ethicalgopher/gopherbase:latest
docker push ethicalgopher/gopherbase:latest

# Build frontend
cd Interface
docker build -t gopherbase-frontend:local .
docker tag gopherbase-frontend:local ethicalgopher/gopherbase-frontend:latest
docker push ethicalgopher/gopherbase-frontend:latest
```

Or use the Makefile:

```bash
make build    # Build images locally
make up       # Start services
make rebuild  # Full rebuild
```

## Troubleshooting

- **Backend not connecting to database**: Ensure PostgreSQL container is running first
- **Ollama takes time to start**: First run downloads the mistral:7b-instruct model (~4GB)
- **Port conflicts**: Check no other service is using 8080 or 4173

## Project Structure

- `main.go`: Application entry point
- `server/`: Backend API handlers
- `Interface/`: Frontend React application
- `docker-compose.yml`: Service definitions
- `Dockerfile`: Backend container definition
- `Interface/Dockerfile`: Frontend container definition