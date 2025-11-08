#!/bin/bash

# Script to restart FlashBack services with pre-built Docker images

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Restarting FlashBack services (production)..."
echo ""

# Stop services
echo "Stopping services..."
docker-compose -f docker-compose.prod.yml down

echo ""

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

echo ""

# Start services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "✓ Services restarted"
echo ""
echo "To view logs: ./scripts/logs.sh"
