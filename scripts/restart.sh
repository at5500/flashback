#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Restarting FlashBack application...${NC}"

# Stop containers
./scripts/stop.sh

# Wait a moment
sleep 2

# Start containers
./scripts/start.sh

echo -e "${GREEN}FlashBack has been restarted.${NC}"