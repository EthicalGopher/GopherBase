# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/Interface
COPY Interface/package*.json ./
RUN npm install
COPY Interface/ .
ARG VITE_ADMIN_EMAIL
ARG VITE_ADMIN_PASSWORD
ENV VITE_ADMIN_EMAIL=$VITE_ADMIN_EMAIL
ENV VITE_ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend-builder /app/Interface/dist ./Interface/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o gopherbase main.go

# Stage 3: Final Image
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=backend-builder /app/gopherbase .
EXPOSE 8080
ENV DATABASE_URL=postgres://gopherbase:gopherbase@postgres:5432/gopherbase?sslmode=disable
CMD ["./gopherbase"]
