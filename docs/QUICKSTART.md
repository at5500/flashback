# Quick Start Guide

This guide will help you quickly launch the project via Docker or for local development.

## Quick Launch via Docker (Recommended)

### Prerequisites

- **Docker** and **Docker Compose** ([installation](https://docs.docker.com/get-docker/))

### Deployment Modes

FlashBack supports two database deployment modes:

1. **Local Database Mode** - PostgreSQL runs in Docker on the same server
2. **External Database Mode** - PostgreSQL runs on a separate database server

Choose the mode that fits your infrastructure.

---

## Local Database Mode (Single Server)

Best for: Small to medium deployments, single-server setups

### Launch in 3 Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd FlashBack
```

2. **Generate secure credentials (production only)**
```bash
make generate-secrets
# Copy the generated passwords to your .env file
```

For development, you can skip this step (uses default passwords).

3. **Start the application**
```bash
make start-local-db
```

The application will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3000
- Database: PostgreSQL in Docker (not exposed externally)

**Default credentials (development only):**
- Email: `op@example.com`
- Password: `123456`

**Security Note:** The database is NOT exposed to the external network. It's only accessible from the backend container via Docker's internal network.

---

## External Database Mode (Multi-Server)

Best for: Production deployments, high availability, separate database server

### Prerequisites

1. **PostgreSQL server** (version 15+) on a separate machine
2. **Network access** from application server to database server
3. **Database created** on PostgreSQL server

### Setup Database Server

Choose one of the following methods to install PostgreSQL on your database server:

#### Option 1: Native Installation (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql-15 postgresql-contrib-15 -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql

# Configure PostgreSQL to accept remote connections
sudo nano /etc/postgresql/15/main/postgresql.conf
# Change: listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host    all    all    <your-app-server-ip>/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Option 2: Native Installation (CentOS/RHEL)

```bash
# Install PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Disable built-in PostgreSQL module
sudo dnf -qy module disable postgresql

# Install PostgreSQL 15
sudo dnf install -y postgresql15-server postgresql15-contrib

# Initialize database
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Start and enable PostgreSQL
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15

# Configure for remote connections (same as Ubuntu above)
```

#### Option 3: Docker on Database Server

```bash
# Create directory for PostgreSQL data
mkdir -p ~/postgres-data

# Generate secure password
POSTGRES_PASSWORD=$(openssl rand -base64 32)
echo "Save this password: $POSTGRES_PASSWORD"

# Run PostgreSQL container
docker run -d \
  --name flashback-postgres \
  --restart unless-stopped \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=flashback \
  -p 5432:5432 \
  -v ~/postgres-data:/var/lib/postgresql/data \
  postgres:15-alpine

# Check logs
docker logs flashback-postgres

# Access PostgreSQL
docker exec -it flashback-postgres psql -U postgres
```

**Docker Compose on Database Server:**

Create `docker-compose.yml` on your database server:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: flashback-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: flashback
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Set in .env
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=en_US.UTF-8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

Start with:
```bash
# Create .env with POSTGRES_PASSWORD
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" > .env

# Start PostgreSQL
docker-compose up -d
```

#### Option 4: Managed Database Service

Use a managed PostgreSQL service from cloud providers:

**AWS RDS:**
1. Go to AWS RDS Console
2. Create PostgreSQL 15 instance
3. Configure security group to allow application server IP
4. Note down endpoint, port, username, password

**DigitalOcean Managed Database:**
1. Create → Databases → PostgreSQL 15
2. Add application server to trusted sources
3. Note connection details

**Google Cloud SQL:**
1. Create Cloud SQL PostgreSQL 15 instance
2. Configure authorized networks
3. Note connection string

**Azure Database for PostgreSQL:**
1. Create Azure Database for PostgreSQL server
2. Configure firewall rules
3. Note server name and credentials

For managed services, skip the manual installation steps and use provided connection details.

---

### Configure Database (All Methods)

Once PostgreSQL is running, create the database and user:

```sql
-- Connect to PostgreSQL as admin
-- Native installation: psql -U postgres
-- Docker: docker exec -it flashback-postgres psql -U postgres
-- Managed service: use provided connection method

psql -U postgres

-- Create database
CREATE DATABASE flashback;

-- Create user with strong password (use generated password from make generate-secrets)
CREATE USER flashback_user WITH PASSWORD '<your_secure_password>';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE flashback TO flashback_user;

-- Connect to database
\c flashback

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO flashback_user;

-- Exit psql
\q
```

**Security Configuration:**

For native installations, ensure PostgreSQL accepts connections from your application server:

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf
# Change: listen_addresses = '*'
# Or: listen_addresses = 'localhost,<app-server-ip>'

# Edit pg_hba.conf to allow application server
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add this line (replace <app-server-ip> with your application server IP):
# host    flashback    flashback_user    <app-server-ip>/32    scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

For Docker installations, the container is already configured to accept remote connections.

For managed services, use the provider's firewall/security group configuration.

### Setup Application Server

1. **Clone the repository**
```bash
git clone <repository-url>
cd FlashBack
```

2. **Generate secure credentials**
```bash
make generate-secrets
```

3. **Configure .env file**

Create or edit `.env`:
```bash
cp .env.example .env
nano .env
```

Set these variables:
```env
# External Database Configuration
EXTERNAL_DB_HOST=your-db-server.example.com
EXTERNAL_DB_PORT=5432
EXTERNAL_DB_NAME=flashback
EXTERNAL_DB_USER=flashback_user
EXTERNAL_DB_PASSWORD=<your_secure_password>

# JWT Configuration
JWT_SECRET=<generated_from_make_generate-secrets>
JWT_EXPIRATION=2592000

# Environment
ENVIRONMENT=production
```

4. **Start the application**
```bash
make start-external-db
```

The application will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3000
- Database: External PostgreSQL server

**Security Recommendations:**
- Use firewall rules to restrict database access to application server IP only
- Enable SSL/TLS for database connections
- Use strong passwords (minimum 16 characters)
- Consider VPN or private network for database communication

### Troubleshooting External Database Connection

**Problem: Backend can't connect to external database**

Check the following:

1. **Network connectivity:**
   ```bash
   # From application server, test connection to database server
   telnet your-db-server.example.com 5432
   # Or
   nc -zv your-db-server.example.com 5432
   ```

2. **PostgreSQL is accepting connections:**
   ```bash
   # On database server
   sudo systemctl status postgresql
   # Or for Docker
   docker ps | grep postgres
   ```

3. **Firewall allows connections:**
   ```bash
   # On database server (Ubuntu/Debian)
   sudo ufw status
   sudo ufw allow from <app-server-ip> to any port 5432

   # CentOS/RHEL
   sudo firewall-cmd --list-all
   sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<app-server-ip>" port port="5432" protocol="tcp" accept'
   sudo firewall-cmd --reload
   ```

4. **PostgreSQL configuration:**
   ```bash
   # Check postgresql.conf
   sudo grep listen_addresses /etc/postgresql/15/main/postgresql.conf
   # Should be: listen_addresses = '*' or specific IPs

   # Check pg_hba.conf
   sudo grep "host.*flashback" /etc/postgresql/15/main/pg_hba.conf
   # Should have entry for your app server IP
   ```

5. **Credentials are correct:**
   ```bash
   # Test connection from application server
   psql -h your-db-server.example.com -U flashback_user -d flashback
   # Enter password when prompted
   ```

6. **Backend logs:**
   ```bash
   # Check backend container logs
   make logs-backend
   # Look for connection errors
   ```

**Common error messages:**

- `connection refused` → Firewall blocking or PostgreSQL not listening
- `authentication failed` → Wrong username/password
- `database "flashback" does not exist` → Database not created
- `EXTERNAL_DB_HOST is required` → Missing environment variables in .env

---

## Common Setup

### Telegram Bot Setup
After logging into the web interface:
1. Go to the settings section
2. Add your bot token (get it from [@BotFather](https://t.me/BotFather))
3. The bot will automatically start

### Management

```bash
# View all logs
make logs

# View backend logs only
make logs-backend

# Stop application
make stop-prod

# Restart with latest images
make restart-prod

# Check container status
make status

# Show all available commands
make help
```

### Security Validation

The backend automatically validates security settings on startup:

**In Production Mode (`ENVIRONMENT=production`):**
- ✓ Rejects default passwords
- ✓ Enforces minimum password lengths (DB: 16 chars, JWT: 32 chars)
- ✓ Validates JWT_SECRET strength
- ✗ Fails to start if security requirements not met

**Error Example:**
```
SECURITY ERROR: Insecure database password detected in production!
Password 'password' is not allowed. Please use a strong, randomly generated password.
Use scripts/generate-secrets.sh to generate secure credentials.
```

**Solution:** Run `make generate-secrets` and update your `.env` file.

### Switching Between Modes

**From Local to External Database:**
1. Backup your data:
   ```bash
   docker exec flashback_postgres pg_dump -U postgres flashback > backup.sql
   ```
2. Setup external database server
3. Restore data to external server:
   ```bash
   psql -h your-db-server.example.com -U flashback_user -d flashback < backup.sql
   ```
4. Update `.env` with `EXTERNAL_DB_*` variables
5. Restart:
   ```bash
   make stop-prod
   make start-external-db
   ```

**From External to Local Database:**
1. Backup your external database
2. Remove `EXTERNAL_DB_HOST` from `.env`
3. Restore data to local database
4. Restart:
   ```bash
   make stop-prod
   make start-local-db
   ```

---

## Local Development (without Docker)

### Prerequisites

- **Rust** 1.90+ ([installation](https://rustup.rs/))
- **Node.js** 20+ ([installation](https://nodejs.org/))
- **Docker** and **Docker Compose** ([installation](https://docs.docker.com/get-docker/))
- **Git**

## Step 1: Clone Repository

```bash
git clone <repository-url>
cd FlashBack
```

## Step 2: Backend Setup

### 2.1 Create .env file

```bash
cp .env.example .env
```

### 2.2 Edit .env

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/flashback

# JWT
JWT_SECRET=development_secret_key_change_in_production
JWT_EXPIRATION=2592000

# Backend Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000

# Logging
RUST_LOG=info,flashback_backend=debug

# Environment
ENVIRONMENT=development
```

### 2.3 Create storehaus.toml

```bash
cp storehaus.toml.example storehaus.toml
```

Or create the file manually:

```toml
[database]
host = "localhost"
port = 5432
database = "flashback"
username = "postgres"
password = "password"
min_connections = 1
max_connections = 10
connection_timeout_seconds = 30
idle_timeout_seconds = 600
max_lifetime_seconds = 3600

[signal]
callback_timeout_seconds = 30
max_callbacks = 100
```

## Step 3: Frontend Setup

```bash
cd frontend
cp .env.example .env
```

Edit frontend/.env:

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

## Step 4: Start Infrastructure (PostgreSQL)

Return to root directory:

```bash
cd ..
```

Start Docker Compose:

```bash
docker-compose up -d postgres
```

Check that the service has started:

```bash
docker-compose ps
```

You should see:
```
NAME                   STATUS
flashback_postgres     Up (healthy)
```

## Step 5: Start Backend

```bash
cd backend

# Install dependencies and run
cargo run
```

On first launch:
- All Rust dependencies will be installed
- StoreHaus will automatically create tables in the database
- Telegram Bot will connect to the API

You should see:
```
INFO  flashback_backend > Starting Telegram Support System
INFO  flashback_backend > Database initialized successfully
INFO  flashback_backend > Server listening on 0.0.0.0:3000
INFO  flashback_backend > Telegram bot started
```

## Step 6: Start Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Install shadcn/ui components (if not yet installed)
npx shadcn-ui@latest add button card dialog dropdown-menu avatar badge toast scroll-area

# Start dev server
npm run dev
```

You should see:
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:8080/
➜  Network: use --host to expose
```

## Step 7: First Launch - Automatic Operator Creation

On first backend launch, an administrator is automatically created:

**Email**: `op@example.com`
**Password**: `123456`

This happens in the `seed_database()` function in `backend/src/db/init.rs`.

You can log into the system immediately after starting backend and frontend!

## Step 8: Testing

### 8.1 Open Web Interface

Open browser: http://localhost:8080

Login:
- Email: `op@example.com`
- Password: `123456`

### 8.2 Test Telegram Bot

1. Find your bot in Telegram by username
2. Send `/start`
3. Send any message

### 8.3 Check Web Interface

A new conversation with your message should appear in the web interface!

## Useful Commands

### Backend

```bash
# Watch mode (auto-reload on changes)
cargo install cargo-watch
cargo watch -x run

# Tests
cargo test

# Formatting
cargo fmt

# Linter
cargo clippy

# Build for production
cargo build --release
```

### Frontend

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Linter
npm run lint

# Type check
npm run type-check
```

### Docker

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Stop all
docker-compose down

# Stop and remove volumes (complete cleanup)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it flashback_postgres psql -U postgres -d flashback

# Backup
docker exec flashback_postgres pg_dump -U postgres flashback > backup.sql

# Restore
cat backup.sql | docker exec -i flashback_postgres psql -U postgres -d flashback

# View tables
docker exec -it flashback_postgres psql -U postgres -d flashback -c "\dt"
```

## Troubleshooting

### Backend Won't Start

**Problem**: `error: could not compile storehaus`

**Solution**: Make sure you're using Rust 1.90+
```bash
rustc --version
rustup update
```

---

**Problem**: `connection refused` when connecting to database

**Solution**:
```bash
docker-compose ps  # Check status
docker-compose up -d postgres  # Restart
```

### Frontend Won't Start

**Problem**: `Module not found`

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

**Problem**: shadcn/ui components not found

**Solution**:
```bash
npx shadcn-ui@latest add button card dialog
```

### Telegram Bot Not Responding

**Problem**: Bot not accepting messages

**Solution**:
1. Check token in settings (web interface)
2. Check backend logs: `cargo run` or `docker-compose logs -f backend`
3. Make sure the bot isn't running elsewhere

### WebSocket Not Working

**Problem**: Real-time updates not arriving

**Solution**:
1. Open Developer Tools (F12) → Console
2. Check for WebSocket errors
3. Make sure `VITE_WS_URL` is correct in frontend/.env

## Next Steps

Now you're ready for development! 🎉

We recommend studying:
- [System Architecture](docs/ARCHITECTURE.md)
- [Tech Stack](docs/TECH_STACK.md)
- [Database Schema](docs/DATABASE.md)
- [API Documentation](docs/API.md)
- [Project Structure](docs/STRUCTURE.md)

## Useful Links

- [StoreHaus Documentation](https://github.com/at5500/storehaus)
- [Watchtower Documentation](https://github.com/at5500/watchtower)
- [Axum Documentation](https://docs.rs/axum)
- [teloxide Documentation](https://docs.rs/teloxide)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [React Query Documentation](https://tanstack.com/query/latest)

## Support

If you encounter problems, create an Issue in the repository.