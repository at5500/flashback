#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Showing FlashBack logs (Ctrl+C to exit)...${NC}"

# Follow logs from all containers
docker-compose logs -f "$@"