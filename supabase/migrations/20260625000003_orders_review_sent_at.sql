-- Add review_sent_at to orders for tracking when admin sent the review request email
-- Also add unique constraint on review_token to prevent duplicate sends

ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'orders' AND constraint_name = 'orders_review_token_unique'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_review_token_unique UNIQUE (review_token);
  END IF;
END $$;
