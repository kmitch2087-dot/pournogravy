-- Add product_group_id to products table for style/variant grouping
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_group_id UUID DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_products_group ON products(product_group_id);
