#!/bin/bash

# Script to start FlashBack using pre-built Docker images from Docker Hub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "==================================="
echo "FlashBack - Quick Start (Production)"
echo "==================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
fi

echo "📦 Pulling latest Docker images from Docker Hub..."
docker-compose -f docker-compose.prod.yml pull

echo ""
echo "🚀 Starting services with pre-built images..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Wait for backend to be healthy
echo "Checking backend health..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✓ Backend is healthy!"
        break
    fi
    attempt=$((attempt + 1))
    echo "  Waiting for backend... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to start. Check logs with: ./scripts/logs.sh backend"
    exit 1
fi

echo ""
echo "==================================="
echo "✅ FlashBack is running!"
echo "==================================="
echo ""
echo "Services:"
echo "  • Backend API:  http://localhost:3000"
echo "  • Frontend:     http://localhost:8080"
echo "  • PostgreSQL:   localhost:5432"
echo ""
echo "Default credentials:"
echo "  • Email:    op@example.com"
echo "  • Password: 123456"
echo ""
echo "Useful commands:"
echo "  • View logs:    ./scripts/logs.sh"
echo "  • Stop:         ./scripts/stop-prod.sh"
echo "  • Restart:      ./scripts/restart-prod.sh"
echo ""
echo "Note: Using pre-built images from Docker Hub (at5500/flashback-*)"
echo "==================================="