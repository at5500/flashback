-- echo Database Indexes
-- Optimized indexes for performance
-- Run this after StoreHaus auto-migration

\c echo

-- ==============================================================================
-- TELEGRAM_USERS Table Indexes
-- ==============================================================================

-- Index for searching by Telegram user ID (primary key, already indexed by StoreHaus)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_users_id ON telegram_users(id);

-- Index for searching blocked users
CREATE INDEX IF NOT EXISTS idx_telegram_users_blocked
ON telegram_users(is_blocked)
WHERE is_blocked = true;

-- Index for full-text search on username
CREATE INDEX IF NOT EXISTS idx_telegram_users_username
ON telegram_users USING gin(username gin_trgm_ops);

-- Index for full-text search on first_name
CREATE INDEX IF NOT EXISTS idx_telegram_users_first_name
ON telegram_users USING gin(first_name gin_trgm_ops);

-- ==============================================================================
-- OPERATORS Table Indexes
-- ==============================================================================

-- Unique index for email (for login)
CREATE UNIQUE INDEX IF NOT EXISTS idx_operators_email
ON operators(email);

-- Index for active operators
CREATE INDEX IF NOT EXISTS idx_operators_active
ON operators(is_active)
WHERE is_active = true;

-- ==============================================================================
-- CONVERSATIONS Table Indexes
-- ==============================================================================

-- Index for finding conversations by Telegram user
CREATE INDEX IF NOT EXISTS idx_conversations_telegram_user
ON conversations(telegram_user_id);

-- Index for finding conversations by operator
CREATE INDEX IF NOT EXISTS idx_conversations_operator
ON conversations(assigned_operator_id)
WHERE assigned_operator_id IS NOT NULL;

-- Index for finding conversations by status
CREATE INDEX IF NOT EXISTS idx_conversations_status
ON conversations(status);

-- Composite index for operator dashboard (assigned operator + status)
CREATE INDEX IF NOT EXISTS idx_conversations_operator_status
ON conversations(assigned_operator_id, status)
WHERE assigned_operator_id IS NOT NULL;

-- Index for sorting by last message time
CREATE INDEX IF NOT EXISTS idx_conversations_last_message
ON conversations(last_message_at DESC NULLS LAST);

-- Composite index for unread conversations
CREATE INDEX IF NOT EXISTS idx_conversations_unread
ON conversations(unread_count, last_message_at DESC)
WHERE unread_count > 0;

-- ==============================================================================
-- MESSAGES Table Indexes
-- ==============================================================================

-- Index for finding messages by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id);

-- Composite index for conversation messages ordered by creation time
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, __created_at__);

-- Index for finding unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages(read, conversation_id)
WHERE read = false;

-- Index for operator messages
CREATE INDEX IF NOT EXISTS idx_messages_from_operator
ON messages(from_operator, conversation_id);

-- Index for messages with media
CREATE INDEX IF NOT EXISTS idx_messages_media
ON messages(media_type)
WHERE media_type IS NOT NULL;

-- Full-text search index on message content
CREATE INDEX IF NOT EXISTS idx_messages_content_search
ON messages USING gin(content gin_trgm_ops);

-- ==============================================================================
-- MESSAGE_TEMPLATES Table Indexes
-- ==============================================================================

-- Index for finding templates by category
CREATE INDEX IF NOT EXISTS idx_templates_category
ON message_templates(category)
WHERE category IS NOT NULL;

-- Index for searching template titles
CREATE INDEX IF NOT EXISTS idx_templates_title
ON message_templates USING gin(title gin_trgm_ops);

-- ==============================================================================
-- Analyze tables for query planner
-- ==============================================================================

ANALYZE telegram_users;
ANALYZE operators;
ANALYZE conversations;
ANALYZE messages;
ANALYZE message_templates;

-- ==============================================================================
-- Display index information
-- ==============================================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;