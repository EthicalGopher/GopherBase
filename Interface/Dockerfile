# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy build artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Use a non-root user
USER node

EXPOSE 4173

# Serve the static files with SPA support
CMD ["serve", "-s", "dist", "-l", "4173"]
