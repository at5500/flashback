#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting FlashBack application...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}.env file created. You can customize it if needed.${NC}"
    else
        echo -e "${RED}Error: .env.example file not found!${NC}"
        exit 1
    fi
fi

# Build and start containers
echo -e "${GREEN}Building Docker images...${NC}"
docker-compose build

echo -e "${GREEN}Starting containers...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}FlashBack is now running!${NC}"
    echo -e "${GREEN}Frontend: http://localhost:8080${NC}"
    echo -e "${GREEN}Backend API: http://localhost:3000${NC}"
    echo -e "${GREEN}WebSocket: ws://localhost:3000${NC}"
    echo -e "${GREEN}PostgreSQL: localhost:5432${NC}"
    echo ""
    echo -e "${YELLOW}Default login: admin@example.com / 123456${NC}"
    echo ""
    echo -e "${YELLOW}To view logs, run: docker-compose logs -f${NC}"
    echo -e "${YELLOW}To stop the application, run: ./scripts/stop.sh${NC}"
else
    echo -e "${RED}Error: Some containers failed to start!${NC}"
    echo -e "${YELLOW}Check logs with: docker-compose logs${NC}"
    exit 1
fi