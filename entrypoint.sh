#!/bin/bash
set -e

echo "Starting GopherBase stack..."

# Function to handle shutdown
cleanup() {
  echo "Shutting down services..."

  if [ -n "$BACKEND_PID" ]; then
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
  fi

  if [ -n "$FRONTEND_PID" ]; then
    kill -TERM "$FRONTEND_PID" 2>/dev/null || true
  fi

  wait
  echo "Shutdown complete"
  exit 0
}

# Catch signals (docker stop, ctrl+c)
trap cleanup SIGINT SIGTERM

# -----------------------------
# Wait for PostgreSQL
# -----------------------------
echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 > /dev/null 2>&1; do
  sleep 2
done
echo "PostgreSQL is ready"

# -----------------------------
# Wait for Ollama
# -----------------------------
echo "Waiting for Ollama..."
until curl -s http://ollama:11434 > /dev/null; do
  sleep 2
done
echo "Ollama is ready"

# -----------------------------
# Start Backend
# -----------------------------
echo "Starting backend..."
./gopherbase > /var/log/backend.log 2>&1 &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"

# -----------------------------
# Start Frontend
# -----------------------------
echo "Starting frontend..."
serve -s Interface/dist -l 4173 > /var/log/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend PID: $FRONTEND_PID"

# -----------------------------
# Wait for any process to exit
# -----------------------------
wait -n

echo "One service stopped, shutting down everything..."
cleanup