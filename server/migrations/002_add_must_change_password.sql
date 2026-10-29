-- ====================================================================
-- Migration: 002_add_must_change_password.sql
-- Terra AI: Flag new accounts for mandatory first-login password update
-- ====================================================================

-- 1. Add must_change_password column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 2. Performance index on must_change_password
CREATE INDEX IF NOT EXISTS idx_users_must_change_password ON users(must_change_password);

