#!/bin/bash

# Script to stop FlashBack services running from Docker Hub images

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Stopping FlashBack services (production)..."
docker-compose -f docker-compose.prod.yml down

echo "✓ Services stopped"
echo ""
echo "To remove all data including database:"
echo "  docker-compose -f docker-compose.prod.yml down -v"