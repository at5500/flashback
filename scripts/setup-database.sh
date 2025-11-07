#!/bin/bash

# echo Database Setup Script
# This script sets up PostgreSQL database for echo

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-echo}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}echo Database Setup${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not installed or not in PATH${NC}"
    echo "Please install PostgreSQL first:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "  Fedora/RHEL: sudo dnf install postgresql postgresql-server"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL is installed${NC}"

# Check if PostgreSQL is running
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" &> /dev/null; then
    echo -e "${YELLOW}Warning: PostgreSQL is not running on $DB_HOST:$DB_PORT${NC}"
    echo "Please start PostgreSQL first:"
    echo "  macOS: brew services start postgresql"
    echo "  Ubuntu/Debian: sudo systemctl start postgresql"
    echo "  Fedora/RHEL: sudo systemctl start postgresql"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}"
echo ""

# Test connection
echo "Testing connection to PostgreSQL..."
export PGPASSWORD="$DB_PASSWORD"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL${NC}"
    echo "Please check your credentials:"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  User: $DB_USER"
    exit 1
fi

echo -e "${GREEN}✓ Connected to PostgreSQL${NC}"
echo ""

# Check if database exists
echo "Checking if database '$DB_NAME' exists..."
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null)

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping database '$DB_NAME'..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo "Skipping database creation..."
        SKIP_INIT=true
    fi
fi

# Create database
if [ "$SKIP_INIT" != "true" ]; then
    echo "Creating database '$DB_NAME'..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    echo -e "${GREEN}✓ Database created${NC}"
    echo ""
fi

# Install extensions
echo "Installing PostgreSQL extensions..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";" 2>/dev/null
echo -e "${GREEN}✓ Extensions installed${NC}"
echo ""

# Run StoreHaus migrations (tables will be created by Rust app)
echo -e "${YELLOW}Note: Tables will be automatically created by StoreHaus when you run the app${NC}"
echo "After running the app once, you can optimize indexes by running:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/sql/02_create_indexes.sql"
echo ""

# Update .env file
echo "Updating .env file..."
if [ -f ".env" ]; then
    # Backup .env
    cp .env .env.backup
    echo -e "${GREEN}✓ Backed up .env to .env.backup${NC}"
fi

# Update DATABASE_URL in .env
cat > .env.tmp << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-your_bot_token_here}

# Database Configuration
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=${JWT_SECRET:-your_secret_key_change_in_production}
JWT_EXPIRATION=900

# Server Configuration
HOST=0.0.0.0
PORT=8080

# Logging
RUST_LOG=info,echo_backend=debug

# Environment
ENVIRONMENT=development
EOF

if [ -f ".env" ]; then
    # Preserve TELEGRAM_BOT_TOKEN from existing .env
    TELEGRAM_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" .env | cut -d '=' -f2)
    if [ -n "$TELEGRAM_TOKEN" ]; then
        sed -i.bak "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN|" .env.tmp
    fi

    # Preserve JWT_SECRET from existing .env
    JWT_SECRET_VAL=$(grep "^JWT_SECRET=" .env | cut -d '=' -f2)
    if [ -n "$JWT_SECRET_VAL" ]; then
        sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET_VAL|" .env.tmp
    fi
fi

mv .env.tmp .env
rm -f .env.tmp.bak
echo -e "${GREEN}✓ Updated .env file${NC}"
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Database setup complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run the application: cd backend && cargo run"
echo "  2. After first run, optimize indexes: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/sql/02_create_indexes.sql"
echo ""
echo "Database connection details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo "Default login credentials (created on first run):"
echo "  Email: op@example.com"
echo "  Password: 123456"
echo ""