# Stage 1: Build Backend
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Create Interface/dist if it doesn't exist to satisfy the embed directive
RUN mkdir -p Interface/dist && touch Interface/dist/.keep
RUN CGO_ENABLED=0 GOOS=linux go build -o gopherbase main.go

# Stage 2: Final Image
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/gopherbase .
EXPOSE 8080
ENV DATABASE_URL=postgres://gopherbase:gopherbase@postgres:5432/gopherbase?sslmode=disable
CMD ["./gopherbase"]
