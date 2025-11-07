# Tech Stack

## Backend (Rust)

### Core Components

#### Web Framework: Axum 0.7

**Why Axum?**
- Built on Tower - modular middleware system
- Excellent integration with tokio and ecosystem
- Type-safe routing and extractors
- High performance
- Excellent documentation

**Alternatives**:
- Actix-web - more mature, but more complex
- Rocket - simpler, but less flexible

**Usage Example**:
```rust
use axum::{
    Router,
    routing::{get, post},
    extract::State,
    Json,
};

async fn create_app(state: AppState) -> Router {
    Router::new()
        .route("/api/conversations", get(list_conversations))
        .route("/api/messages/send", post(send_message))
        .layer(auth_middleware())
        .with_state(state)
}
```

#### Telegram Bot: teloxide 0.13

**Why teloxide?**
- Full coverage of Telegram Bot API
- Type-safe
- Async/await out of the box
- Excellent macros for dialogs
- Active community

**Features**:
```rust
use teloxide::prelude::*;

#[tokio::main]
async fn main() {
    let bot = Bot::from_env();

    teloxide::repl(bot, |bot: Bot, msg: Message| async move {
        // Message handling
        bot.send_message(msg.chat.id, "Hello!").await?;
        Ok(())
    })
    .await;
}
```

#### Database ORM: StoreHaus (Custom)

**Link**: https://github.com/at5500/storehaus

**Key Features**:
- Built on sqlx
- Automatic SQL generation
- Signal system (event tracking)
- Automatic system fields
- Tag support
- Auto-migration

**Architecture**:
```rust
StoreHaus (Application Layer)
    ↓
store_object (Database Operations)
    ↓
├── signal_system (Events)
├── table_derive (Code Generation)
└── config (Configuration)
```

**Model**:
```rust
use storehaus::prelude::*;

#[model]
#[table(name = "messages")]
pub struct Message {
    #[primary_key]
    pub id: Uuid,

    #[field(create)]
    pub conversation_id: Uuid,

    #[field(create, update)]
    pub text: String,

    // Automatic fields:
    // __created_at__: DateTime<Utc>
    // __updated_at__: DateTime<Utc>
    // __deleted_at__: Option<DateTime<Utc>>
    // __tags__: Vec<String>
}

// Usage
let store = GenericStore::<Message>::new(pool, signals, cache);
let msg = store.create(message, None).await?;
```

**Benefits for the Project**:
- No need to write SQL manually
- Built-in caching → performance
- Signal system → easy to add audit/logging
- Tags → message categorization
- Soft delete → no data loss

#### Event System: Watchtower (Custom)

**Link**: https://github.com/at5500/watchtower

**Key Features**:
- Pluggable transports (NATS, RabbitMQ, WebSocket, Webhook)
- Circuit Breaker
- Dead Letter Queue
- Backpressure Control
- Fault-tolerant

**Architecture**:
```
Application
    ↓
watchtower-core (Event abstractions, Circuit Breaker, DLQ)
    ↓
watchtower-websocket (Transport for operators)
```

**Usage**:
```rust
use watchtower_websocket::prelude::*;

// Publisher
let event = Event::new(
    "message.received",
    json!({
        "conversation_id": conv_id,
        "message": message,
    }),
);
publisher.publish(event).await?;

// Subscriber
subscriber.subscribe(
    vec!["message.received".to_string()],
    Arc::new(|event| Box::pin(async move {
        // Send to operators via WebSocket
        broadcast_to_operators(event).await?;
        Ok(())
    }))
).await?;
```

**Benefits for the Project**:
- WebSocket transport → real-time out of the box
- Circuit Breaker → if operator is offline, system doesn't crash
- DLQ → no event loss on failures
- Easy to scale (add NATS for multiple instances)

#### Async Runtime: Tokio 1.x

**Why Tokio?**
- De-facto standard for async Rust
- All libraries are compatible
- Excellent performance
- Built-in utilities (channels, timers, etc.)

**Features**:
```toml
tokio = { version = "1.0", features = [
    "full",           # All features
    "rt-multi-thread" # Multi-threaded runtime
]}
```

#### Serialization: serde 1.x

**Features**:
```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}
```

#### Authentication: jsonwebtoken 9.x

**JWT Tokens**:
```rust
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,      // operator_id
    exp: usize,       // expiration
    iat: usize,       // issued at
}

// Token generation
let token = encode(
    &Header::default(),
    &claims,
    &EncodingKey::from_secret(secret.as_bytes())
)?;

// Validation
let token_data = decode::<Claims>(
    &token,
    &DecodingKey::from_secret(secret.as_bytes()),
    &Validation::default()
)?;
```

### Supporting Libraries

```toml
[dependencies]
# Web framework
axum = "0.7"
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }

# Telegram
teloxide = { version = "0.13", features = ["macros"] }

# Database & Events
storehaus = { git = "https://github.com/at5500/storehaus" }
watchtower-core = { git = "https://github.com/at5500/watchtower" }
watchtower-websocket = { git = "https://github.com/at5500/watchtower" }

# Async
tokio = { version = "1.0", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Auth
jsonwebtoken = "9.0"
bcrypt = "0.15"

# UUID
uuid = { version = "1.0", features = ["v4", "serde"] }

# Date/Time
chrono = { version = "0.4", features = ["serde"] }

# Environment
dotenv = "0.15"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Error handling
anyhow = "1.0"
thiserror = "1.0"
```

## Frontend (React + TypeScript)

### Core Components

#### Framework: React 18

**Why React?**
- Huge ecosystem
- Maturity and stability
- Excellent TypeScript support
- Hooks for convenient state management

**Features**:
```typescript
import { useState, useEffect } from 'react';

function ConversationList() {
  const [conversations, setConversations] = useState([]);
  
  useEffect(() => {
    fetchConversations();
  }, []);
  
  return <div>{/* UI */}</div>;
}
```

#### Build Tool: Vite 5.x

**Why Vite?**
- Instant HMR (Hot Module Replacement)
- Fast build (esbuild)
- Excellent TypeScript support
- Optimization out of the box

**Configuration**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
```

#### UI Library: shadcn/ui

**Why shadcn/ui?**
- Copied into project → full control
- Built on Radix UI → accessibility
- Tailwind CSS → easy to customize
- Beautiful by default
- TypeScript out of the box

**Components**:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add scroll-area
```

**Usage**:
```tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function MessageCard() {
  return (
    <Card>
      <p>Message text</p>
      <Button variant="outline">Reply</Button>
    </Card>
  );
}
```

#### Styling: Tailwind CSS 3.x

**Configuration**:
```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        primary: "hsl(var(--primary))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Responsive Design**:
```tsx
<div className="
  flex flex-col       // mobile
  md:flex-row         // tablet+
  lg:max-w-7xl        // desktop
  gap-4               // spacing
  p-4                 // padding
">
  {/* Content */}
</div>
```

#### State Management: TanStack Query 5.x

**Why TanStack Query?**
- Automatic caching
- Background refetching
- Optimistic updates
- Pagination/Infinite queries
- DevTools

**Usage**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching
const { data, isLoading } = useQuery({
  queryKey: ['conversations'],
  queryFn: fetchConversations,
});

// Mutation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: sendMessage,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  },
});
```

#### WebSocket: socket.io-client 4.x

**Integration**:
```typescript
import { io, Socket } from 'socket.io-client';

const socket = io('ws://localhost:8080', {
  auth: {
    token: localStorage.getItem('token'),
  },
});

socket.on('message.received', (data) => {
  // Update UI
  queryClient.setQueryData(['messages', data.conversationId], (old) => {
    return [...old, data.message];
  });
});
```

#### Icons: Lucide React

**Why Lucide?**
- Beautiful, consistent icons
- Tree-shakeable (only used ones)
- TypeScript support
- Large library

```tsx
import { Send, Users, Settings, MessageSquare } from 'lucide-react';

<Button>
  <Send className="mr-2 h-4 w-4" />
  Send
</Button>
```

### Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    
    "@tanstack/react-query": "^5.0.0",
    "socket.io-client": "^4.7.0",
    
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-scroll-area": "^1.0.5",
    
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.300.0",
    
    "date-fns": "^3.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

## Infrastructure

### Database: PostgreSQL 15+

**Why PostgreSQL?**
- Reliability and ACID
- JSON/JSONB support
- Full-text search
- Replication
- Excellent performance

**Features for the Project**:
- Message storage with timestamps
- JSON fields for metadata
- Indexes for fast search
- Replication for scaling

### Docker

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flashback
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/flashback
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## Development Tools

### Backend

```bash
# Formatting
cargo fmt

# Linting
cargo clippy

# Testing
cargo test

# Watch mode
cargo watch -x run
```

### Frontend

```bash
# Development
npm run dev

# Build
npm run build

# Preview production
npm run preview

# Linting
npm run lint

# Type checking
npm run type-check
```

## CI/CD (Future)

### GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test
      - run: cargo clippy

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run build
```

## Monitoring (Future)

- **Prometheus** - metrics collection
- **Grafana** - visualization
- **Loki** - centralized logs
- **Jaeger** - distributed tracing

## Conclusion

This stack provides:
- High performance (Rust backend)
- Security (Type safety, JWT)
- Scalability (Async, caching, event-driven)
- Excellent UX (React, shadcn/ui, real-time)
- Developer Experience (StoreHaus, Watchtower, TypeScript)
