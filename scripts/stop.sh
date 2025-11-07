#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping FlashBack application...${NC}"

# Stop containers
docker-compose down

echo -e "${GREEN}FlashBack has been stopped.${NC}"
echo -e "${YELLOW}To start again, run: ./scripts/start.sh${NC}"
echo -e "${YELLOW}To remove all data (including database), run: docker-compose down -v${NC}"