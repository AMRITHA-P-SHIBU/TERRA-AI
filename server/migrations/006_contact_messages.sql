-- =====================================================
-- Migration 006: Contact Messages Table
-- Stores messages submitted via the public Contact form
-- on the HomePage, viewable by Super Admin.
-- =====================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin queries (newest first, unread first)
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_read ON contact_messages (is_read, created_at DESC);

