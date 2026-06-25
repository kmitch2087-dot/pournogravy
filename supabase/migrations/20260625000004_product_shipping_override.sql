-- Add shipping_override_cents to products table.
-- When set, this value overrides the standard shipping rate for that product.
-- If ALL items in a cart have this set, checkout uses max(shipping_override_cents) as shipping.
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_override_cents INTEGER DEFAULT NULL;
