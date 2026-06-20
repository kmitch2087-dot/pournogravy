-- A2: Orders delivery/review tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_email_sent_at timestamptz;

-- A3: Product reviews enhancements
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS reviewer_state text,
  ADD COLUMN IF NOT EXISTS verified_purchase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id);
