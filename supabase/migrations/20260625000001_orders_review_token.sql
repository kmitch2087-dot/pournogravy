-- Add review_token and review_submitted_at to orders for verified-purchase email flow
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_token UUID DEFAULT gen_random_uuid();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMPTZ DEFAULT NULL;
UPDATE orders SET review_token = gen_random_uuid() WHERE review_token IS NULL;
