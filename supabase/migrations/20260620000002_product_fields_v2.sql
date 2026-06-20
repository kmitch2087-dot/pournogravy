-- A1: Add new product fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS flip_images text[],
  ADD COLUMN IF NOT EXISTS shirt_color text,
  ADD COLUMN IF NOT EXISTS shirt_color_notes text,
  ADD COLUMN IF NOT EXISTS print_color text,
  ADD COLUMN IF NOT EXISTS print_color_notes text,
  ADD COLUMN IF NOT EXISTS front_print_file_url text,
  ADD COLUMN IF NOT EXISTS section_visibility jsonb NOT NULL DEFAULT '{
    "humor": true,
    "description": true,
    "longDescription": true,
    "badAdvice": true
  }'::jsonb;
