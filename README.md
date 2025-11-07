<div align="center">
  <img src="frontend/public/assets/logo.png" alt="FlashBack Logo" width="120" height="120">

  # /// FlashBack ///
  ## Telegram Support System

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Rust](https://img.shields.io/badge/Rust-1.90+-orange.svg?logo=rust)](https://www.rust-lang.org)
  [![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?logo=typescript)](https://www.typescriptlang.org)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg?logo=postgresql)](https://www.postgresql.org)
  [![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg?logo=docker)](https://www.docker.com)

  A customer support system for Telegram with a web interface for operators.
</div>

<div align="center">
  <img src="docs/screenshots/intro.png" alt="Operator Interface" width="300">
  <p><i>Operator interface in action - managing multiple conversations in real-time</i></p>
</div>

## Description

Users communicate with a Telegram bot that acts as a mediator between the user and operator. Operators work through a web interface where they see all conversations in real-time and respond to users as if there was no bot between them.

## Key Features

- **Real-time communication** via Telegram Bot
- **Web interface for operators** with mobile adaptation
- **PWA support** - works as a native application
- **Message templates** for quick responses
- **Real-time notifications** via WebSocket
- **Full conversation history** with complete context
- **Tagging system** for categorizing requests
- **Automatic caching** for performance

## Documentation

### Getting Started
- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running quickly with Docker or local development

### Architecture & Design
- [System Architecture](docs/ARCHITECTURE.md) - High-level system architecture and design decisions
- [Tech Stack](docs/TECH_STACK.md) - Technologies and frameworks used in the project

### API & Database
- [API Documentation](docs/API.md) - REST API endpoints and WebSocket events
- [Database Schema](docs/DATABASE.md) - Database tables, relationships, and migrations

## Product Overview

### Conversations & Messaging

The main workspace where operators communicate with customers in real-time. View all conversations in a sidebar with status indicators (Active, Waiting, Closed), exchange messages with full history and timestamps, see typing indicators and delivery confirmations, and access user information including name, phone, and country.

<div align="center">
  <a href="docs/screenshots/conversations.png">
    <img src="docs/screenshots/conversations.png" alt="Conversations Interface" width="70%">
  </a>
  <p><i>Operator workspace with conversations list and active chat (click to enlarge)</i></p>
</div>

### User Profile

Access detailed information about each customer. View complete user profile with contact details and location, see full conversation history across all interactions, track user tags and categorization, and monitor user activity timeline.

<div align="center">
  <a href="docs/screenshots/user-profile.png">
    <img src="docs/screenshots/user-profile.png" alt="User Profile" width="70%">
  </a>
  <p><i>Detailed user profile with conversation history (click to enlarge)</i></p>
</div>

### Message Templates

Speed up responses with pre-configured message templates. Create custom templates for frequently asked questions, organize templates by categories or tags, insert templates into conversations with one click, and edit templates on the fly as needed.

<div align="center">
  <a href="docs/screenshots/templates.png">
    <img src="docs/screenshots/templates.png" alt="Message Templates" width="70%">
  </a>
  <p><i>Template management interface with categories and quick access (click to enlarge)</i></p>
</div>

### User Settings

Personalize your operator experience. Configure notification preferences and sound alerts, customize interface language and theme, manage your profile and account security, and set up quick actions and keyboard shortcuts.

<div align="center">
  <a href="docs/screenshots/user-settings.png">
    <img src="docs/screenshots/user-settings.png" alt="User Settings" width="70%">
  </a>
  <p><i>User settings panel for personalization (click to enlarge)</i></p>
</div>

### Administration

Manage system configuration and operator accounts. Configure Telegram bot token and connection settings, create and manage operator accounts with role-based permissions, customize notification preferences and system behavior, and monitor system health and logs.

<div align="center">
  <a href="docs/screenshots/administration.png">
    <img src="docs/screenshots/administration.png" alt="Administration Panel" width="70%">
  </a>
  <p><i>Administration interface for system and user management (click to enlarge)</i></p>
</div>

## Architecture

```
┌─────────────────┐
│      User       │
│   in Telegram   │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│    Telegram Bot (Rust/tokio)    │
│  • teloxide                     │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────┐
│          Backend Server (Rust)                   │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  WATCHTOWER (Event System)                 │  │
│  │  • WebSocket transport                     │  │
│  │  • Real-time events                        │  │
│  │  • Circuit breaker + DLQ                   │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  STOREHAUS (Database Layer)                │  │
│  │  • PostgreSQL ORM                          │  │
│  │  • Signal system                           │  │
│  │  • Auto-migration                          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  HTTP API (Axum)                           │  │
│  │  • REST endpoints                          │  │
│  │  • JWT authentication                      │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────┘
                           │
                     ┌─────▼──────┐
                     │ PostgreSQL │
                     └─────┬──────┘
                           │
                     ┌─────▼───────────────────────┐
                     │  Web Interface (React)      │
                     │  • shadcn/ui components     │
                     │  • Tailwind CSS             │
                     │  • WebSocket client         │
                     │  • Vite + TypeScript        │
                     │  • PWA                      │
                     └─────────────────────────────┘
```

## Tech Stack

### Backend (Rust)
- **Web Framework**: Axum
- **Telegram Bot**: teloxide
- **Database ORM**: StoreHaus
- **Event System**: Watchtower
- **Async Runtime**: Tokio
- **Authentication**: JWT (jsonwebtoken)

### Frontend (React)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **WebSocket**: socket.io-client
- **Icons**: Lucide React

### Infrastructure
- **Database**: PostgreSQL 15+
- **Deployment**: Docker + Docker Compose

## Project Structure

```
FlashBack/
├── backend/                  # Rust backend
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   ├── telegram/         # Telegram bot module
│   │   ├── api/              # HTTP API handlers
│   │   ├── websocket/        # WebSocket handlers
│   │   ├── models/           # StoreHaus models
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── .env.example
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # Detailed architecture
│   ├── TECH_STACK.md         # Technology stack
│   ├── DATABASE.md           # Database schema
│   └── API.md                # API documentation
├── docker-compose.yml        # Infrastructure
├── Cargo.toml                # Workspace config
└── README.md
```

## Quick Start

### Requirements

- Docker
- Docker Compose

### Running with Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd FlashBack
```

2. **Start the application**
```bash
./scripts/start.sh
```

The script will automatically:
- Check for `.env` file existence
- Build Docker images
- Start all services (PostgreSQL + Backend)
- Wait for services to be ready

After startup, the application will be available at:
- Backend API: `http://localhost:3000`
- WebSocket: `ws://localhost:3000`
- PostgreSQL: `localhost:5432`

**Default credentials (created on first launch):**
- Email: `op@example.com`
- Password: `123456`

**Telegram Bot Setup:**
- The bot token is configured through the web interface in the settings section after logging in

### Application Management

**View logs:**
```bash
./scripts/logs.sh

# or for a specific service
./scripts/logs.sh backend
./scripts/logs.sh postgres
```

**Stop the application:**
```bash
./scripts/stop.sh
```

**Restart:**
```bash
./scripts/restart.sh
```

**Complete cleanup (including database data):**
```bash
docker-compose down -v
```

### Local Development (without Docker)

<details>
<summary>Click to expand local development instructions</summary>

#### Requirements

- Rust 1.90+
- Node.js 20+
- PostgreSQL 15+

#### Installation

1. **Setup PostgreSQL database**

```bash
./scripts/setup-database.sh
```

The script will automatically:
- Check PostgreSQL installation and status
- Create `flashback` database
- Install required extensions (uuid-ossp, pg_trgm)
- Update `.env` file with correct DATABASE_URL

2. **Run backend**
```bash
cd backend
cargo run
```

StoreHaus will automatically create all necessary tables on first launch.

3. **Run frontend**
```bash
cd frontend
npm install
npm run dev
```

</details>

## Configuration

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/flashback

# JWT
JWT_SECRET=your_secret_key_change_in_production
JWT_EXPIRATION=2592000  # 30 days in seconds

# Backend Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=3000

# Frontend Server (for local development)
FRONTEND_HOST=0.0.0.0
FRONTEND_PORT=8080

# Logging
RUST_LOG=info,flashback_backend=debug

# Environment (development, production)
ENVIRONMENT=development
```

**Note:** Telegram bot token is configured through the web interface, not via .env file

### StoreHaus (storehaus.toml)
```toml
[database]
host = "localhost"
port = 5432
database = "flashback"
username = "postgres"
password = "password"
min_connections = 1
max_connections = 10
```

## Attribution

- **Logo**: [Chat icon](https://www.flaticon.com/free-icon/chat_10525239) created by [Freepik - Flaticon](https://www.flaticon.com/authors/freepik)