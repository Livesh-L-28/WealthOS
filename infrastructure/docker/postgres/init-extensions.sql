-- WealthOS PostgreSQL Initialization Script
-- Enables enterprise database extensions for UUID generation and cryptographic security

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Set client encoding and timezone to UTC
ALTER SYSTEM SET timezone TO 'UTC';
