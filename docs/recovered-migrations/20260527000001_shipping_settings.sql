-- Add shipping configuration columns to settings table.
-- shipping_fee_cents: flat rate in cents (default $5.99).
-- free_shipping_threshold_cents: NULL means free shipping is disabled until Opie sets it in admin Settings.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS shipping_fee_cents int NOT NULL DEFAULT 599,
  ADD COLUMN IF NOT EXISTS free_shipping_threshold_cents int;
