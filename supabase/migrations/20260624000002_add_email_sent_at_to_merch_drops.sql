-- Add email_sent_at column to merch_drops to track when the marketing email blast was sent.
-- NULL = not yet sent. Non-null = sent at that timestamp (idempotency guard).
ALTER TABLE merch_drops ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ DEFAULT NULL;
