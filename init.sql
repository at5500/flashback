-- FlashBack Database Initialization Script
-- This script sets up PostgreSQL extensions required for the application

-- Enable pg_trgm extension for future full-text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;