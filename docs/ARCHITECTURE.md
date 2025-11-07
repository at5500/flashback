# System Architecture

## Overview

Telegram Support System is built on a microservice architecture with clear separation of responsibilities between components. The system uses an event-driven approach for real-time communication.

## System Diagram

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

## System Components

### 1. Telegram Bot Layer

**Purpose**: Receive messages from users and send responses

**Technologies**:
- `teloxide` - high-level Telegram Bot API
- `tokio` - async runtime

**Responsibilities**:
- Handle incoming messages from users
- Send messages from operators back to users
- Manage bot state
- Handle commands (/start, /help, etc.)

**Interaction**:
```rust
Telegram API → Bot Handler → StoreHaus (save) → Watchtower (event)
```

### 2. Backend Server

Central component of the system, integrating all modules.

#### 2.1 HTTP API (Axum)

**Endpoints**:
```
GET    /api/conversations          - List conversations
GET    /api/conversations/:id      - Conversation details
GET    /api/messages               - List messages
POST   /api/messages/send          - Send message
GET    /api/templates              - Message templates
POST   /api/templates              - Create template
POST   /api/auth/login             - Authentication
POST   /api/auth/refresh           - Refresh token
GET    /api/operators/me           - Operator profile
```

**Middleware**:
- JWT Authentication
- CORS
- Rate Limiting
- Request Logging
- Error Handling

#### 2.2 WebSocket Layer (Watchtower)

**Purpose**: Real-time communication with operators

**Events**:
```rust
// From user to operator
message.received      // New message from user
user.typing          // User is typing
conversation.created // New conversation

// From operator to system
operator.typing      // Operator is typing
operator.online      // Operator online
operator.offline     // Operator offline
```

**Watchtower Benefits**:
- Circuit Breaker - protection against cascading failures
- Dead Letter Queue - don't lose events during failures
- Backpressure Control - load management
- Automatic reconnections

#### 2.3 Database Layer (StoreHaus)

**Purpose**: Data management with automatic caching

**Features**:
- CRUD operations
- Automatic fields (__created_at__, __updated_at__, __deleted_at__)
- Tag system for categorization
- Signal System for change tracking
- Auto-migration schema

**Stores**:
```rust
GenericStore<TelegramUser>
GenericStore<Conversation>
GenericStore<Message>
GenericStore<MessageTemplate>
GenericStore<Operator>
```

### 3. Frontend (React + shadcn/ui)

**Architecture**:
```
App
├── Layout
│   ├── Header (operator, status)
│   └── Sidebar (navigation)
├── Pages
│   ├── ConversationsPage
│   │   ├── ConversationList (conversation list)
│   │   └── ConversationDetail (selected conversation)
│   ├── MessagesPanel
│   │   ├── MessageList (message history)
│   │   └── MessageInput (input with templates)
│   ├── TemplatesPage
│   └── SettingsPage
└── Providers
    ├── AuthProvider (JWT)
    ├── WebSocketProvider (socket.io)
    └── QueryProvider (TanStack Query)
```

**State Management**:
- TanStack Query - server state and caching
- React Context - global state (auth, websocket)
- Local State - component state

## Data Flow

### Scenario 1: User sends message

```
1. User → Telegram Bot
2. Bot → StoreHaus.create_message()
3. StoreHaus → PostgreSQL (save)
4. Bot → Watchtower.publish("message.received")
5. Watchtower → WebSocket → Frontend
6. Frontend → UI update
```

### Scenario 2: Operator responds to user

```
1. Frontend → POST /api/messages/send
2. API → StoreHaus.create_message()
3. StoreHaus → PostgreSQL
4. API → Bot.send_message(telegram_user_id, text)
5. Bot → Telegram API
6. API → Watchtower.publish("message.sent")
7. Watchtower → WebSocket → Frontend (confirmation)
```

### Scenario 3: Operator uses template

```
1. Frontend → Click on template
2. Frontend → Auto-fill MessageInput
3. Frontend → POST /api/messages/send (same as scenario 2)
```

## Scaling

### Horizontal Scaling

**Backend**:
- Multiple instances behind load balancer
- Stateless HTTP API
- Session state managed through JWT tokens

**Bot**:
- Telegram Webhook on multiple instances
- Long Polling from single instance (alternative)

**Database**:
- PostgreSQL replication (master-slave)
- Read replicas for analytics
- Connection pooling through StoreHaus

### Vertical Scaling

- Increase CPU/RAM for Rust backend
- SQL query optimization
- Increase connection pool size

## Security

### Authentication and Authorization

**JWT Tokens**:
```rust
// Access Token: 15 minutes
// Refresh Token: 7 days
```

**Endpoint Protection**:
```rust
#[axum::middleware]
async fn auth_middleware(
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response> {
    // Verify JWT token
    // Extract operator_id
    // Add to request extensions
}
```

### Attack Protection

**Rate Limiting**:
- 100 requests/minute per IP
- 1000 requests/minute per user

**CORS**:
```rust
CorsLayer::new()
    .allow_origin(frontend_origin)
    .allow_methods([Method::GET, Method::POST])
    .allow_headers([AUTHORIZATION, CONTENT_TYPE])
```

**SQL Injection**:
- Parameterized queries through StoreHaus
- Input validation

**XSS**:
- Sanitization on backend
- Content Security Policy
- React automatically escapes

## Monitoring and Logging

### Metrics

**Backend** (via tracing):
```rust
- HTTP request duration
- WebSocket connections count
- Database query time
- Bot message throughput
```

**Frontend**:
```javascript
- Page load time
- API response time
- WebSocket latency
- User interactions
```

### Logging

**Levels**:
- ERROR: Critical errors
- WARN: Warnings
- INFO: Important events
- DEBUG: Debug information
- TRACE: Detailed tracing

**Structured Logs**:
```rust
tracing::info!(
    operator_id = %operator.id,
    conversation_id = %conv.id,
    "Operator sent message"
);
```

## Fault Tolerance

### Circuit Breaker (Watchtower)

When WebSocket fails:
1. Circuit Breaker opens
2. Events go to Dead Letter Queue
3. Periodic reconnection attempts
4. After recovery - resend from DLQ

### Database Failover

1. StoreHaus detects master unavailability
2. Switch to read replica
3. Read-only mode until master recovery
4. Automatic recovery

## Performance

### Optimizations

**Backend**:
- Connection pooling (up to 10 connections)
- Batch operations for bulk queries
- Async/await everywhere
- Query result caching

**Frontend**:
- Code splitting
- Lazy loading components
- List virtualization (react-window)
- Search debouncing
- Optimistic UI updates

### Target Metrics

- HTTP API response time: < 100ms (p95)
- WebSocket latency: < 50ms
- Database query time: < 10ms (p95)
- Frontend initial load: < 2s
- Time to interactive: < 3s

## Deployment

### Docker Compose (Development)

```yaml
services:
  postgres:    # PostgreSQL database
  backend:     # Rust backend with Telegram bot
  frontend:    # React frontend with Nginx
```

### Production (Kubernetes)

```
Deployment:
  - backend (replicas: 3)
  - frontend (replicas: 2)

StatefulSet:
  - postgres (with persistent volumes)

Ingress:
  - TLS termination
  - Load balancing
  - Rate limiting
```