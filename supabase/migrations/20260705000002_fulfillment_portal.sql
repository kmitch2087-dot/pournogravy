-- Fulfillment portal infrastructure
-- 1. Canonical order status guard (NOT VALID — won't reject legacy rows)
-- 2. Append-only status history audit column for printer_queue
-- 3. Action-links quick-tap placeholder in printer notification email

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_order_status'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT chk_order_status
      CHECK (status IN ('pending','paid','in_production','shipped','delivered','fulfilled','cancelled','refunded'))
      NOT VALID;
  END IF;
END $$;

ALTER TABLE printer_queue
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Insert {{action_links}} right after {{test_note}} in printer email
UPDATE public.email_templates
SET body_html = replace(body_html, '{{test_note}}', E'{{test_note}}\n{{action_links}}')
WHERE key = 'printer_notification'
  AND body_html NOT LIKE '%action_links%';
