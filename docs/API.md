# API Documentation

## Overview

The API is built on Axum using REST for HTTP and WebSocket for real-time communication.

**Base URL**: `http://localhost:8080/api`

**Authentication**: JWT Bearer token

## Authentication

### POST /api/auth/login

Operator login.

**Request**:
```json
{
  "email": "operator@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "operator": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "operator@example.com",
    "name": "John Smith",
    "is_active": true
  }
}
```

**Errors**:
- `401 Unauthorized` - invalid credentials
- `403 Forbidden` - operator is inactive

### POST /api/auth/refresh

Refresh access token.

**Request**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### POST /api/auth/logout

Logout (invalidate refresh token).

**Headers**: `Authorization: Bearer <access_token>`

**Response** (204 No Content)

## Operators

### GET /api/operators/me

Get current operator profile.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "operator@example.com",
  "name": "John Smith",
  "is_active": true,
  "last_seen_at": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

### PATCH /api/operators/me

Update current operator profile.

**Headers**: `Authorization: Bearer <access_token>`

**Request**:
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "is_active": true,
  "last_seen_at": "2024-01-15T14:35:00Z"
}
```

### POST /api/operators/me/password

Change password.

**Headers**: `Authorization: Bearer <access_token>`

**Request**:
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

**Response** (204 No Content)

**Errors**:
- `400 Bad Request` - invalid current password
- `422 Unprocessable Entity` - weak new password

## Conversations

### GET /api/conversations

Get list of conversations.

**Headers**: `Authorization: Bearer <access_token>`

**Query Parameters**:
- `status` (optional): "waiting", "active", "closed"
- `operator_id` (optional): operator UUID
- `page` (optional, default: 1): page number
- `per_page` (optional, default: 20, max: 100): items per page
- `sort` (optional, default: "last_message_at"): sort field
- `order` (optional, default: "desc"): "asc" or "desc"

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "telegram_user": {
        "id": 123456789,
        "username": "johndoe",
        "first_name": "John",
        "last_name": "Doe"
      },
      "operator_id": "550e8400-e29b-41d4-a716-446655440000",
      "operator_name": "Admin",
      "status": "active",
      "last_message_at": "2024-01-15T14:30:00Z",
      "unread_count": 2,
      "created_at": "2024-01-15T10:00:00Z",
      "last_message": {
        "text": "Thank you for your help!",
        "from_operator": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

### GET /api/conversations/:id

Get conversation details.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "telegram_user": {
    "id": 123456789,
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "is_blocked": false
  },
  "operator": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Admin"
  },
  "status": "active",
  "last_message_at": "2024-01-15T14:30:00Z",
  "unread_count": 2,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

**Errors**:
- `404 Not Found` - conversation not found

### PATCH /api/conversations/:id

Update conversation (assign operator, change status).

**Headers**: `Authorization: Bearer <access_token>`

**Request**:
```json
{
  "operator_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active"
}
```

**Response** (200 OK):
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "telegram_user_id": 123456789,
  "operator_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "updated_at": "2024-01-15T14:35:00Z"
}
```

### POST /api/conversations/:id/close

Close conversation.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "closed",
  "updated_at": "2024-01-15T15:00:00Z"
}
```

## Messages

### GET /api/conversations/:conversation_id/messages

Get conversation messages.

**Headers**: `Authorization: Bearer <access_token>`

**Query Parameters**:
- `before` (optional): message UUID (for pagination)
- `limit` (optional, default: 50, max: 100): number of messages

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890",
      "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "from_operator": false,
      "text": "Hello! Need help",
      "read": true,
      "created_at": "2024-01-15T10:05:00Z"
    },
    {
      "id": "b2c3d4e5-f678-4901-b2c3-d4e5f6789012",
      "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "from_operator": true,
      "text": "Hello! How can I help you?",
      "read": true,
      "created_at": "2024-01-15T10:06:00Z"
    }
  ],
  "has_more": false
}
```

### POST /api/messages/send

Send message to user.

**Headers**: `Authorization: Bearer <access_token>`

**Request**:
```json
{
  "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "text": "Hello! How can I help you?"
}
```

**Response** (201 Created):
```json
{
  "id": "c3d4e5f6-7890-4a1b-c3d4-e5f678901234",
  "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "from_operator": true,
  "text": "Hello! How can I help you?",
  "read": true,
  "telegram_message_id": 54321,
  "created_at": "2024-01-15T14:35:00Z"
}
```

**Errors**:
- `400 Bad Request` - empty text or conversation closed
- `404 Not Found` - conversation not found

### PATCH /api/messages/:id/read

Mark message as read.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (204 No Content)

### POST /api/messages/mark-read

Mark multiple messages as read.

**Headers**: `Authorization: Bearer <access_token>`

**Request**:
```json
{
  "message_ids": [
    "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890",
    "b2c3d4e5-f678-4901-b2c3-d4e5f6789012"
  ]
}
```

**Response** (204 No Content)

## Templates

### GET /api/templates

Get list of templates.

**Headers**: `Authorization: Bearer <access_token>`

**Query Parameters**:
- `category` (optional): filter by category
- `search` (optional): search by title/text

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "d4e5f678-9012-4b2c-d4e5-f67890123456",
      "title": "Greeting",
      "content": "Hello! How can I help you?",
      "category": "greeting",
      "usage_count": 45,
      "created_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": "e5f67890-1234-4c3d-e5f6-789012345678",
      "title": "Farewell",
      "content": "Thank you for contacting us! Have a good day!",
      "category": "farewell",
      "usage_count": 32,
      "created_at": "2024-01-01T10:01:00Z"
    }
  ]
}
```

### GET /api/templates/:id

Get template by ID.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "id": "d4e5f678-9012-4b2c-d4e5-f67890123456",
  "title": "Greeting",
  "content": "Hello! How can I help you?",
  "category": "greeting",
  "operator_id": "550e8400-e29b-41d4-a716-446655440000",
  "usage_count": 45,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z"
}
```

### POST /api/templates

Create new template.

**Headers**: `Authorization: Bearer <access_token>`

**Request**:
```json
{
  "title": "New Template",
  "content": "Template text",
  "category": "custom"
}
```

**Response** (201 Created):
```json
{
  "id": "f6789012-3456-4d4e-f678-901234567890",
  "title": "New Template",
  "content": "Template text",
  "category": "custom",
  "operator_id": "550e8400-e29b-41d4-a716-446655440000",
  "usage_count": 0,
  "created_at": "2024-01-15T15:00:00Z"
}
```

### PUT /api/templates/:id

Update template.

**Headers**: `Authorization: Bearer <access_token>`

**Request**:
```json
{
  "title": "Updated Template",
  "content": "New text",
  "category": "custom"
}
```

**Response** (200 OK):
```json
{
  "id": "f6789012-3456-4d4e-f678-901234567890",
  "title": "Updated Template",
  "content": "New text",
  "category": "custom",
  "updated_at": "2024-01-15T15:05:00Z"
}
```

### DELETE /api/templates/:id

Delete template.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (204 No Content)

## Statistics

### GET /api/stats/overview

General statistics for operator.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200 OK):
```json
{
  "active_conversations": 12,
  "waiting_conversations": 5,
  "closed_today": 23,
  "total_messages_today": 145,
  "response_time_avg_minutes": 3.5,
  "satisfaction_rate": 4.6
}
```

## WebSocket API

### Connection

**URL**: `ws://localhost:8080/ws`

**Authentication**: Query parameter `token=<jwt_token>`

**Example**:
```javascript
const socket = io('ws://localhost:8080', {
  auth: {
    token: localStorage.getItem('access_token')
  }
});
```

### Events from Server to Client

#### `connected`

Successful connection.

```json
{
  "operator_id": "550e8400-e29b-41d4-a716-446655440000",
  "connected_at": "2024-01-15T15:00:00Z"
}
```

#### `message.received`

New message from user.

```json
{
  "event": "message.received",
  "data": {
    "message": {
      "id": "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f67890",
      "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "from_operator": false,
      "text": "Hello! Need help",
      "read": false,
      "created_at": "2024-01-15T15:01:00Z"
    },
    "conversation": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "telegram_user": {
        "id": 123456789,
        "first_name": "John",
        "username": "johndoe"
      },
      "unread_count": 1
    }
  }
}
```

#### `message.sent`

Confirmation of message sent by operator.

```json
{
  "event": "message.sent",
  "data": {
    "message": {
      "id": "b2c3d4e5-f678-4901-b2c3-d4e5f6789012",
      "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "from_operator": true,
      "text": "Hello!",
      "telegram_message_id": 54321,
      "created_at": "2024-01-15T15:02:00Z"
    }
  }
}
```

#### `conversation.created`

New conversation created.

```json
{
  "event": "conversation.created",
  "data": {
    "conversation": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "telegram_user": {
        "id": 987654321,
        "first_name": "Alice",
        "username": "alice_w"
      },
      "status": "waiting",
      "created_at": "2024-01-15T15:00:00Z"
    }
  }
}
```

#### `conversation.updated`

Conversation updated (operator assigned, status changed).

```json
{
  "event": "conversation.updated",
  "data": {
    "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "operator_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "updated_at": "2024-01-15T15:03:00Z"
  }
}
```

#### `user.typing`

User is typing.

```json
{
  "event": "user.typing",
  "data": {
    "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "telegram_user_id": 123456789
  }
}
```

### Events from Client to Server

#### `operator.typing`

Operator is typing (notify other operators).

```json
{
  "event": "operator.typing",
  "data": {
    "conversation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }
}
```

#### `operator.online`

Operator online.

```json
{
  "event": "operator.online"
}
```

#### `operator.offline`

Operator offline (on disconnect).

```json
{
  "event": "operator.offline"
}
```

### Error Events

#### `error`

WebSocket error.

```json
{
  "event": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token"
  }
}
```

## HTTP Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - invalid request format |
| 401 | Unauthorized - authentication required |
| 403 | Forbidden - insufficient permissions |
| 404 | Not Found - resource not found |
| 422 | Unprocessable Entity - validation errors |
| 429 | Too Many Requests - rate limit exceeded |
| 500 | Internal Server Error - server error |

## Rate Limiting

- 100 requests/minute per IP
- 1000 requests/minute per authenticated user

**Response Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1642256400
```

## Usage Examples

### Rust (Backend)

```rust
use axum::{
    Router,
    routing::{get, post},
    extract::{State, Path, Query},
    Json,
};

#[derive(Deserialize)]
struct SendMessageRequest {
    conversation_id: Uuid,
    text: String,
}

async fn send_message(
    State(state): State<AppState>,
    Json(req): Json<SendMessageRequest>,
) -> Result<Json<Message>, ApiError> {
    // Create message
    let message = Message::new(
        Uuid::new_v4(),
        req.conversation_id,
        true,
        req.text,
        true,
        None,
    );

    // Save to DB
    let store = state.storehaus.get_store::<GenericStore<Message>>("messages")?;
    let saved = store.create(message, None).await?;

    // Send to Telegram
    state.bot.send_message(chat_id, &saved.text).await?;

    // Publish event via Watchtower
    let event = Event::new("message.sent", json!({ "message": saved }));
    state.watchtower.publish(event).await?;

    Ok(Json(saved))
}
```

### TypeScript (Frontend)

```typescript
import axios from 'axios';
import { io } from 'socket.io-client';

// HTTP API
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get conversations
const conversations = await api.get('/conversations');

// Send message
await api.post('/messages/send', {
  conversation_id: convId,
  text: 'Hello!'
});

// WebSocket
const socket = io('ws://localhost:8080', {
  auth: { token }
});

socket.on('message.received', (data) => {
  console.log('New message:', data.message);
  // Update UI
});

socket.emit('operator.typing', {
  conversation_id: convId
});
```
