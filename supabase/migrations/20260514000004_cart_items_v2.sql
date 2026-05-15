-- Extend cart_items to support full line-item identity (size, variant, color)
-- and text-based product slugs (static products use text IDs, not UUIDs).

ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS product_slug TEXT;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT '';
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS variant_id TEXT;
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS color_id TEXT;

-- Allow null product_id so static-catalog items (text slug) can be stored
ALTER TABLE public.cart_items ALTER COLUMN product_id DROP NOT NULL;

-- Unique index for upsert / deduplication per auth user line item
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_line_unique
  ON public.cart_items (user_id, product_slug, size, COALESCE(variant_id, ''), COALESCE(color_id, ''))
  WHERE user_id IS NOT NULL AND product_slug IS NOT NULL;
