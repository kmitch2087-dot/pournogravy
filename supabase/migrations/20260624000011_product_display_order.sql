-- Add display_order to products table for admin drag-to-reorder
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
