FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o gopherbase .

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/gopherbase .
COPY --from=builder /app/docker-compose.yml .

RUN apk add --no-cache ca-certificates

EXPOSE 8080

CMD ["./gopherbase"]
