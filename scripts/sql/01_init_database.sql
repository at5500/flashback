-- echo Database Initialization Script
-- This script creates the database and extensions

-- Create database (run as postgres user)
-- Note: This will fail if database already exists, which is fine
CREATE DATABASE echo;

-- Connect to the database
\c echo

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search optimization

-- Grant permissions (adjust username as needed)
GRANT ALL PRIVILEGES ON DATABASE echo TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;