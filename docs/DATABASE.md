# Database

## Overview

The system uses PostgreSQL with the StoreHaus ORM layer. All tables automatically receive system fields for change tracking and soft delete support.

## Automatic System Fields (StoreHaus)

Each table automatically receives:

```sql
__created_at__   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
__updated_at__   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
__deleted_at__   TIMESTAMP WITH TIME ZONE NULL
__tags__         TEXT[] DEFAULT '{}'
```

## Database Schema

### ERD Diagram

```
┌─────────────────────┐
│   operators         │
├─────────────────────┤
│ id (PK)             │
│ email               │
│ name                │
│ password_hash       │
│ is_active           │
│ __created_at__      │
│ __updated_at__      │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐       1:N        ┌─────────────────────┐
│  conversations      │◄─────────────────│  messages           │
├─────────────────────┤                  ├─────────────────────┤
│ id (PK)             │                  │ id (PK)             │
│ telegram_user_id(FK)│                  │ conversation_id(FK) │
│ operator_id (FK)    │                  │ from_operator       │
│ status              │                  │ text                │
│ last_message_at     │                  │ read                │
│ __created_at__      │                  │ __created_at__      │
│ __updated_at__      │                  │ __updated_at__      │
└─────────────────────┘                  └─────────────────────┘
          ▲
          │ 1:N
          │
┌─────────────────────┐
│  telegram_users     │
├─────────────────────┤
│ id (PK)             │
│ username            │
│ first_name          │
│ last_name           │
│ is_blocked          │
│ __created_at__      │
│ __updated_at__      │
└─────────────────────┘

┌─────────────────────┐
│ message_templates   │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ content             │
│ category            │
│ operator_id (FK)    │
│ __created_at__      │
│ __updated_at__      │
└─────────────────────┘
```

## Models (StoreHaus)

### 1. TelegramUser

Telegram users who communicate with the bot.

```rust
use storehaus::prelude::*;
use uuid::Uuid;

#[model]
#[table(name = "telegram_users")]
pub struct TelegramUser {
    /// Telegram user ID (matches chat_id in Telegram)
    #[primary_key]
    pub id: i64,

    /// User's username (@username)
    #[field(create, update)]
    pub username: Option<String>,

    /// User's first name
    #[field(create, update)]
    pub first_name: String,

    /// User's last name
    #[field(create, update)]
    pub last_name: Option<String>,

    /// Whether the user is blocked
    #[field(create, update)]
    pub is_blocked: bool,

    // Automatic fields:
    // __created_at__: DateTime<Utc>
    // __updated_at__: DateTime<Utc>
    // __deleted_at__: Option<DateTime<Utc>>
    // __tags__: Vec<String>
}
```

**SQL (generated automatically)**:
```sql
CREATE TABLE telegram_users (
    id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    __created_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __updated_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __deleted_at__ TIMESTAMP WITH TIME ZONE,
    __tags__ TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_telegram_users_username ON telegram_users(username);
CREATE INDEX idx_telegram_users_created_at ON telegram_users(__created_at__);
```

**Usage**:
```rust
// Create
let user = TelegramUser::new(
    123456789,
    Some("johndoe".to_string()),
    "John".to_string(),
    Some("Doe".to_string()),
    false,
);

let store = storehaus.get_store::<GenericStore<TelegramUser>>("telegram_users")?;
let created = store.create(user, Some(vec!["new_user".to_string()])).await?;

// Find
let user = store.find_by_id(123456789).await?;

// Update
store.update_by_id(
    123456789,
    json!({ "is_blocked": true }),
    None
).await?;

// Soft delete
store.soft_delete_by_id(123456789).await?;
```

### 2. Operator

Operators who respond to users through the web interface.

```rust
#[model]
#[table(name = "operators")]
pub struct Operator {
    #[primary_key]
    pub id: Uuid,

    /// Email for login
    #[field(create, update)]
    pub email: String,

    /// Operator's name
    #[field(create, update)]
    pub name: String,

    /// Password hash (bcrypt)
    #[field(create)]
    pub password_hash: String,

    /// Whether the operator is active
    #[field(create, update)]
    pub is_active: bool,

    /// Last activity time
    #[field(create, update)]
    pub last_seen_at: Option<DateTime<Utc>>,
}
```

**SQL**:
```sql
CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    __created_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __updated_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __deleted_at__ TIMESTAMP WITH TIME ZONE,
    __tags__ TEXT[] DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_operators_email ON operators(email);
CREATE INDEX idx_operators_is_active ON operators(is_active);
```

**Usage**:
```rust
use bcrypt::{hash, verify, DEFAULT_COST};

// Create operator
let password_hash = hash("password123", DEFAULT_COST)?;
let operator = Operator::new(
    Uuid::new_v4(),
    "operator@example.com".to_string(),
    "John Smith".to_string(),
    password_hash,
    true,
    None,
);

let store = storehaus.get_store::<GenericStore<Operator>>("operators")?;
let created = store.create(operator, None).await?;

// Authentication
let operator = store.find_one(
    json!({ "email": "operator@example.com" }),
    None
).await?;

if verify("password123", &operator.password_hash)? {
    // Successful authentication
}
```

### 3. Conversation

Dialogue between a user and an operator.

```rust
#[model]
#[table(name = "conversations")]
pub struct Conversation {
    #[primary_key]
    pub id: Uuid,

    /// Telegram user ID
    #[field(create)]
    pub telegram_user_id: i64,

    /// Operator ID (if assigned)
    #[field(create, update)]
    pub operator_id: Option<Uuid>,

    /// Conversation status: "waiting", "active", "closed"
    #[field(create, update)]
    pub status: String,

    /// Time of last message
    #[field(create, update)]
    pub last_message_at: Option<DateTime<Utc>>,

    /// Number of unread messages (for operator)
    #[field(create, update)]
    pub unread_count: i32,
}
```

**SQL**:
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_user_id BIGINT NOT NULL REFERENCES telegram_users(id),
    operator_id UUID REFERENCES operators(id),
    status TEXT NOT NULL DEFAULT 'waiting',
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER NOT NULL DEFAULT 0,
    __created_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __updated_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __deleted_at__ TIMESTAMP WITH TIME ZONE,
    __tags__ TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_conversations_telegram_user ON conversations(telegram_user_id);
CREATE INDEX idx_conversations_operator ON conversations(operator_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Constraint: one active conversation per user
CREATE UNIQUE INDEX idx_conversations_active_user
ON conversations(telegram_user_id)
WHERE status IN ('waiting', 'active');
```

**Usage**:
```rust
// Create conversation
let conversation = Conversation::new(
    Uuid::new_v4(),
    123456789, // telegram_user_id
    None, // operator_id (not assigned)
    "waiting".to_string(),
    Some(Utc::now()),
    0,
);

let store = storehaus.get_store::<GenericStore<Conversation>>("conversations")?;
let created = store.create(conversation, Some(vec!["new".to_string()])).await?;

// Assign operator
store.update_by_id(
    conversation_id,
    json!({
        "operator_id": operator_id,
        "status": "active"
    }),
    Some(vec!["assigned".to_string()])
).await?;

// Get operator's active conversations
let conversations = store.find_many(
    json!({
        "operator_id": operator_id,
        "status": "active"
    }),
    Some("last_message_at DESC"),
    None,
    None
).await?;

// Close conversation
store.update_by_id(
    conversation_id,
    json!({ "status": "closed" }),
    Some(vec!["closed".to_string()])
).await?;
```

### 4. Message

Messages in a conversation.

```rust
#[model]
#[table(name = "messages")]
pub struct Message {
    #[primary_key]
    pub id: Uuid,

    /// Conversation ID
    #[field(create)]
    pub conversation_id: Uuid,

    /// From operator (true) or from user (false)
    #[field(create)]
    pub from_operator: bool,

    /// Message text
    #[field(create)]
    pub text: String,

    /// Whether the message has been read
    #[field(create, update)]
    pub read: bool,

    /// Telegram message ID (if sent by bot)
    #[field(create, update)]
    pub telegram_message_id: Option<i64>,
}
```

**SQL**:
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    from_operator BOOLEAN NOT NULL,
    text TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    telegram_message_id BIGINT,
    __created_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __updated_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __deleted_at__ TIMESTAMP WITH TIME ZONE,
    __tags__ TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, __created_at__ DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read) WHERE NOT read;
CREATE INDEX idx_messages_created_at ON messages(__created_at__ DESC);
```

**Usage**:
```rust
// Message from user
let message = Message::new(
    Uuid::new_v4(),
    conversation_id,
    false, // from user
    "Hello! I need help".to_string(),
    false, // not read
    Some(12345), // Telegram message_id
);

let store = storehaus.get_store::<GenericStore<Message>>("messages")?;
let created = store.create(message, Some(vec!["user_message".to_string()])).await?;

// Message from operator
let message = Message::new(
    Uuid::new_v4(),
    conversation_id,
    true, // from operator
    "Hello! How can I help you?".to_string(),
    true, // immediately read
    None,
);
store.create(message, Some(vec!["operator_message".to_string()])).await?;

// Get conversation messages
let messages = store.find_many(
    json!({ "conversation_id": conversation_id }),
    Some("__created_at__ ASC"),
    None,
    None
).await?;

// Mark as read
store.update_by_id(
    message_id,
    json!({ "read": true }),
    None
).await?;

// Count unread messages
let unread_count = store.count(
    json!({
        "conversation_id": conversation_id,
        "from_operator": false,
        "read": false
    })
).await?;
```

### 5. MessageTemplate

Message templates for quick replies.

```rust
#[model]
#[table(name = "message_templates")]
pub struct MessageTemplate {
    #[primary_key]
    pub id: Uuid,

    /// Template title
    #[field(create, update)]
    pub title: String,

    /// Template text
    #[field(create, update)]
    pub content: String,

    /// Category (optional)
    #[field(create, update)]
    pub category: Option<String>,

    /// ID of the operator who created it (optional)
    #[field(create)]
    pub operator_id: Option<Uuid>,

    /// Usage count
    #[field(create, update)]
    pub usage_count: i32,
}
```

**SQL**:
```sql
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    operator_id UUID REFERENCES operators(id),
    usage_count INTEGER NOT NULL DEFAULT 0,
    __created_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __updated_at__ TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    __deleted_at__ TIMESTAMP WITH TIME ZONE,
    __tags__ TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_message_templates_category ON message_templates(category);
CREATE INDEX idx_message_templates_operator ON message_templates(operator_id);
CREATE INDEX idx_message_templates_usage ON message_templates(usage_count DESC);
```

**Usage**:
```rust
// Create template
let template = MessageTemplate::new(
    Uuid::new_v4(),
    "Greeting".to_string(),
    "Hello! How can I help you?".to_string(),
    Some("greeting".to_string()),
    Some(operator_id),
    0,
);

let store = storehaus.get_store::<GenericStore<MessageTemplate>>("templates")?;
let created = store.create(template, None).await?;

// Get all templates
let templates = store.find_many(
    json!({}),
    Some("usage_count DESC"),
    None,
    None
).await?;

// Use template (increment counter)
store.update_by_id(
    template_id,
    json!({ "usage_count": template.usage_count + 1 }),
    None
).await?;

// Templates by category
let greeting_templates = store.find_many(
    json!({ "category": "greeting" }),
    None,
    None,
    None
).await?;
```

## Database Setup

### Automatic Setup (Recommended)

Use the automatic database setup script:

```bash
./scripts/setup-database.sh
```

The script performs the following actions:

1. **Checks for PostgreSQL** presence and status
2. **Tests database connection**
3. **Creates database** `flashback` (with drop/recreate option)
4. **Installs extensions**:
   - `uuid-ossp` - for UUID generation
   - `pg_trgm` - for full-text search
5. **Updates `.env` file** with the correct DATABASE_URL
6. **Preserves existing values** of TELEGRAM_BOT_TOKEN and JWT_SECRET

#### Environment Variables

The script uses the following environment variables (with default values):

```bash
DB_HOST=localhost         # PostgreSQL host
DB_PORT=5432              # PostgreSQL port
DB_NAME=flashback         # Database name
DB_USER=postgres          # PostgreSQL user
DB_PASSWORD=password      # PostgreSQL password
```

Example with custom parameters:

```bash
export DB_HOST=192.168.1.100
export DB_PORT=5433
export DB_NAME=flashback_dev
export DB_USER=flashback_user
export DB_PASSWORD=secure_password

./scripts/setup-database.sh
```

### Manual Setup

#### Step 1: Create Database

```bash
psql -U postgres -f scripts/sql/01_init_database.sql
```

The `01_init_database.sql` script contains:

```sql
-- Create database
CREATE DATABASE flashback;

-- Connect to database
\c flashback

-- Install extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set access permissions
GRANT ALL PRIVILEGES ON DATABASE flashback TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
```

#### Step 2: Run Application (StoreHaus Auto-migration)

On first run, StoreHaus will automatically create all tables:

```bash
cd backend
cargo run
```

StoreHaus will perform:
- Creation of all tables according to models
- Addition of system fields (`__created_at__`, `__updated_at__`, `__deleted_at__`, `__tags__`)
- Creation of basic indexes (primary keys, foreign keys)

#### Step 3: Index Optimization

After first run, it's recommended to install optimized indexes:

```bash
psql -h localhost -p 5432 -U postgres -d flashback -f scripts/sql/02_create_indexes.sql
```

The `02_create_indexes.sql` script creates:

**telegram_users:**
- Index for blocked users (partial index)
- GIN indexes for full-text search by username and first_name

**operators:**
- Unique index for email
- Index for active operators (partial index)

**conversations:**
- Indexes for searching by telegram_user_id and operator_id
- Index for searching by status
- Composite index (operator_id + status) for operator dashboard
- Index for sorting by last message time
- Composite index for unread conversations

**messages:**
- Indexes for searching by conversation_id
- Composite index (conversation_id + __created_at__) for chronology
- Indexes for unread and operator messages
- Index for messages with media (partial index)
- GIN index for full-text search by content

**message_templates:**
- Index for searching by category (partial index)
- GIN index for full-text search by title

### Updating .env File

After database setup, update the `.env` file:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/flashback
```

If you used the `setup-database.sh` script, this will happen automatically.

## Database Initialization (Code)

```rust
use storehaus::prelude::*;

pub async fn initialize_database() -> Result<StoreHaus> {
    // Configuration
    let config = DatabaseConfig::new(
        "localhost".to_string(),
        5432,
        "flashback".to_string(),
        "postgres".to_string(),
        "password".to_string(),
        1,  // min_connections
        10, // max_connections
        30, // connection_timeout
        600, // idle_timeout
        3600, // max_lifetime
    );

    // Create StoreHaus
    let mut storehaus = StoreHaus::new(config).await?;

    // Auto-migrate tables
    storehaus.auto_migrate::<TelegramUser>(true).await?;
    storehaus.auto_migrate::<Operator>(true).await?;
    storehaus.auto_migrate::<Conversation>(true).await?;
    storehaus.auto_migrate::<Message>(true).await?;
    storehaus.auto_migrate::<MessageTemplate>(true).await?;

    // Register stores
    storehaus.register_store(
        "telegram_users".to_string(),
        GenericStore::<TelegramUser>::new(
            storehaus.pool().clone(),
            None,
            None,
        ),
    )?;

    storehaus.register_store(
        "operators".to_string(),
        GenericStore::<Operator>::new(
            storehaus.pool().clone(),
            None,
            None,
        ),
    )?;

    storehaus.register_store(
        "conversations".to_string(),
        GenericStore::<Conversation>::new(
            storehaus.pool().clone(),
            None,
            None,
        ),
    )?;

    storehaus.register_store(
        "messages".to_string(),
        GenericStore::<Message>::new(
            storehaus.pool().clone(),
            None,
            None,
        ),
    )?;

    storehaus.register_store(
        "templates".to_string(),
        GenericStore::<MessageTemplate>::new(
            storehaus.pool().clone(),
            None,
            None,
        ),
    )?;

    Ok(storehaus)
}
```

## Seed Data (For Development)

```rust
pub async fn seed_database(storehaus: &StoreHaus) -> Result<()> {
    // Create default operator
    let operator_store = storehaus.get_store::<GenericStore<Operator>>("operators")?;

    let password_hash = bcrypt::hash("123456", bcrypt::DEFAULT_COST)?;
    let operator = Operator::new(
        Uuid::new_v4(),
        "op@example.com".to_string(),
        "Operator".to_string(),
        password_hash,
        true,
        None,
    );
    operator_store.create(operator, None).await?;

    // Create default templates
    let template_store = storehaus.get_store::<GenericStore<MessageTemplate>>("templates")?;

    let templates = vec![
        ("Greeting", "Hello! How can I help you?", "greeting"),
        ("Goodbye", "Thank you for contacting us! Have a great day!", "farewell"),
        ("Waiting", "Please wait a minute...", "waiting"),
    ];

    for (title, content, category) in templates {
        let template = MessageTemplate::new(
            Uuid::new_v4(),
            title.to_string(),
            content.to_string(),
            Some(category.to_string()),
            None,
            0,
        );
        template_store.create(template, None).await?;
    }

    Ok(())
}
```

## Indexes and Optimization

```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_messages_conversation_time
ON messages(conversation_id, __created_at__ DESC);

CREATE INDEX CONCURRENTLY idx_conversations_operator_status
ON conversations(operator_id, status)
WHERE status IN ('waiting', 'active');

-- Partial index for active users
CREATE INDEX CONCURRENTLY idx_telegram_users_active
ON telegram_users(id)
WHERE NOT is_blocked AND __deleted_at__ IS NULL;

-- Full-text search for messages (if search is needed)
ALTER TABLE messages ADD COLUMN text_tsv tsvector;

CREATE INDEX idx_messages_fts ON messages USING gin(text_tsv);

CREATE TRIGGER messages_text_tsv_update
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(text_tsv, 'pg_catalog.russian', text);
```

## Migrations

StoreHaus performs auto-migration, but for production it's recommended to use explicit migrations:

```bash
# Install sqlx-cli
cargo install sqlx-cli

# Create migration
sqlx migrate add create_initial_schema

# Run migrations
sqlx migrate run
```

## Backups

```bash
# Backup
pg_dump -U postgres flashback > backup.sql

# Restore
psql -U postgres flashback < backup.sql
```