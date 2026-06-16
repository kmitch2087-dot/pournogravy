ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT now();
