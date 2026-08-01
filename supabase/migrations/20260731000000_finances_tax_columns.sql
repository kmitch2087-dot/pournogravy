-- supabase/migrations/20260731000000_finances_tax_columns.sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_tax_calculation_id text;

ALTER TABLE public.monthly_snapshots
  ADD COLUMN IF NOT EXISTS tax_collected_cents int NOT NULL DEFAULT 0;
