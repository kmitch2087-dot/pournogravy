ALTER TABLE products
  ADD COLUMN IF NOT EXISTS long_description text[],
  ADD COLUMN IF NOT EXISTS bad_advice jsonb;
