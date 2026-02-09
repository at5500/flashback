#!/bin/bash

# Generate secure random secrets for FlashBack deployment
# This script generates strong passwords and secrets for production use

set -e

echo "=== FlashBack Secrets Generator ==="
echo ""

# Function to generate a random string
generate_secret() {
    local length=$1
    # Use /dev/urandom for cryptographically secure random data
    # Convert to base64 and remove special characters to ensure compatibility
    LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$length"
}

# Generate PostgreSQL password (32 characters)
POSTGRES_PASSWORD=$(generate_secret 32)

# Generate JWT secret (64 characters)
JWT_SECRET=$(generate_secret 64)

# Determine output file
OUTPUT_FILE=".env.secrets"

echo "Generated secure credentials:"
echo ""
echo "----------------------------------------"
echo "PostgreSQL Password: $POSTGRES_PASSWORD"
echo "JWT Secret:          $JWT_SECRET"
echo "----------------------------------------"
echo ""

# Ask if user wants to save to file
read -p "Save to $OUTPUT_FILE? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > "$OUTPUT_FILE" << EOF
# Secure credentials generated on $(date)
# IMPORTANT: Keep this file secure and never commit it to version control!

# PostgreSQL Configuration
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# External Database Configuration (for remote database server)
# Uncomment and configure these if using an external database:
# EXTERNAL_DB_HOST=your-db-server.example.com
# EXTERNAL_DB_PORT=5432
# EXTERNAL_DB_NAME=flashback
# EXTERNAL_DB_USER=flashback_user
# EXTERNAL_DB_PASSWORD=$POSTGRES_PASSWORD
EOF

    echo "✓ Credentials saved to $OUTPUT_FILE"
    echo ""
    echo "Next steps:"
    echo "1. Copy these values to your .env file"
    echo "2. If using Docker Compose, update docker-compose.prod.yml"
    echo "3. Keep $OUTPUT_FILE secure and never commit it!"
    echo ""
    echo "For local deployment (database in Docker):"
    echo "  - Set POSTGRES_PASSWORD in docker-compose"
    echo "  - Set JWT_SECRET in backend .env"
    echo ""
    echo "For external database deployment:"
    echo "  - Configure EXTERNAL_DB_* variables in .env"
    echo "  - Set these credentials on your database server"
else
    echo ""
    echo "Credentials not saved. Copy them manually to your configuration."
fi

echo ""
echo "=== Security Reminders ==="
echo "✓ Use these credentials in production"
echo "✓ Store them securely (password manager, secrets vault)"
echo "✓ Never commit them to version control"
echo "✓ Rotate them periodically"
echo "✓ Use different credentials for different environments"