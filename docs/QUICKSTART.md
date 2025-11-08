# Quick Start Guide

This guide will help you quickly launch the project via Docker or for local development.

## Quick Launch via Docker (Recommended)

### Prerequisites

- **Docker** and **Docker Compose** ([installation](https://docs.docker.com/get-docker/))

### Launch in 2 Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd FlashBack
```

2. **Start the application**
```bash
make start-prod
```

The application will be available at:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3000

**Default credentials:**
- Email: `op@example.com`
- Password: `123456`

**Telegram Bot Setup:**
- After logging into the web interface, go to the settings section and add the bot token (get it from [@BotFather](https://t.me/BotFather))

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

# Show all available commands
make help
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