# Stage 1: Build Frontend
FROM node:24-slim AS frontend-builder
WORKDIR /app
COPY Interface/package*.json ./
RUN npm install
COPY Interface/ .
RUN npm run build

# Stage 2: Build Backend (with Frontend Embedded)
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# CRITICAL: Copy the built frontend into the backend build context for embedding
COPY --from=frontend-builder /app/dist ./Interface/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o gopherbase main.go

# Stage 3: Lean Backend Image (For Parallel/Compose Use)
FROM alpine:latest AS backend-lean
WORKDIR /app
COPY --from=backend-builder /app/gopherbase .
EXPOSE 8080
CMD ["./gopherbase"]

# Stage 4: Final "All-in-One" Image
FROM debian:bullseye-slim AS all-in-one
RUN apt-get update && apt-get install -y \
    curl sudo zstd postgresql postgresql-contrib \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g serve \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://ollama.com/install.sh | sh
WORKDIR /app
COPY --from=backend-builder /app/gopherbase .
COPY --from=frontend-builder /app/dist ./Interface/dist
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
EXPOSE 8080 4173
ENV DATABASE_URL=postgres://gopherbase:gopherbase@localhost:5432/gopherbase?sslmode=disable
ENV OLLAMA_HOST=http://localhost:11434
ENTRYPOINT ["./entrypoint.sh"]
