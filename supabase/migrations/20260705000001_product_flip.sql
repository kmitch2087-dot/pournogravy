-- Add flip animation columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS flip_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flip_image_url text    DEFAULT NULL;
