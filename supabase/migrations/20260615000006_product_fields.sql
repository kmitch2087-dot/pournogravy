-- ============================================================
-- Product fields expansion
-- Adds new columns needed for category filtering, fulfillment_type,
-- back image, and explicit focus_x/focus_y int columns.
--
-- Already exists from prior migrations (all safe with IF NOT EXISTS):
--   humor, category, sizes, colors, badge, featured  (20260426055540)
--   long_description, bad_advice                     (20260521000001)
--   went_live_at, thumbnail_focal_x/y, print_file_url (20260528050127)
--   fulfillment_route                                  (20260506000002)
--
-- New in this migration:
--   fulfillment_type  (new column, separate from fulfillment_route)
--   back_image_url
--   focus_x / focus_y (int aliases — thumbnail_focal_x/y already exist as smallint)
-- ============================================================

ALTER TABLE public.products
  -- category: already added in 20260426055540 without NOT NULL/check constraint
  -- Re-add safely with IF NOT EXISTS; the check/default are added below
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS fulfillment_type  text,
  ADD COLUMN IF NOT EXISTS back_image_url    text,
  -- long_description, bad_advice already exist from 20260521000001
  ADD COLUMN IF NOT EXISTS long_description  text[],
  ADD COLUMN IF NOT EXISTS bad_advice        jsonb,
  -- humor, badge, featured already exist from 20260426055540
  ADD COLUMN IF NOT EXISTS humor             text,
  ADD COLUMN IF NOT EXISTS badge             text,
  ADD COLUMN IF NOT EXISTS featured          boolean NOT NULL DEFAULT false,
  -- went_live_at already exists from 20260528050127
  ADD COLUMN IF NOT EXISTS went_live_at      timestamptz,
  -- colors, sizes already exist from 20260426055540
  ADD COLUMN IF NOT EXISTS colors            jsonb,
  ADD COLUMN IF NOT EXISTS sizes             text[],
  -- focus_x / focus_y as explicit int aliases (thumbnail_focal_x/y are smallint)
  ADD COLUMN IF NOT EXISTS focus_x           int DEFAULT 40,
  ADD COLUMN IF NOT EXISTS focus_y           int DEFAULT 50;

-- Set default + constraint on category if not already present
-- (safe to run multiple times — DO UPDATE NOTHING on conflict)
UPDATE public.products SET category = 'apparel' WHERE category IS NULL OR category NOT IN ('apparel', 'accessories');

ALTER TABLE public.products
  ALTER COLUMN category SET DEFAULT 'apparel';

-- Add check constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_category_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_check
      CHECK (category IN ('apparel', 'accessories'));
  END IF;
END $$;

-- Set default + constraint on fulfillment_type
UPDATE public.products SET fulfillment_type = 'printer' WHERE fulfillment_type IS NULL;

ALTER TABLE public.products
  ALTER COLUMN fulfillment_type SET DEFAULT 'printer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_fulfillment_type_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_fulfillment_type_check
      CHECK (fulfillment_type IN ('none', 'self', 'printer', 'printful', 'printify'));
  END IF;
END $$;
