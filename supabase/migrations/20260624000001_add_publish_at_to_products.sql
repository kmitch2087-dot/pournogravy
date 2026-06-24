-- Add publish_at column to products for scheduled go-live support.
-- When set and is_active = false, process-merch-drops will flip the product live at that time.
-- Cleared automatically when product is published (manually or via scheduler).
ALTER TABLE products ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ DEFAULT NULL;
