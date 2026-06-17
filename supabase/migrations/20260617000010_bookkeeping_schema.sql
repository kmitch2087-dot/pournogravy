-- supabase/migrations/20260617000010_bookkeeping_schema.sql

-- 1. Add cost_cents to products (default $12.00 = existing hardcoded value)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_cents int NOT NULL DEFAULT 1200;

-- 2. Monthly snapshots — one locked row per calendar month
CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  year              int         NOT NULL,
  month             int         NOT NULL CHECK (month BETWEEN 1 AND 12),
  revenue_cents     int         NOT NULL DEFAULT 0,
  refunds_cents     int         NOT NULL DEFAULT 0,
  cogs_cents        int         NOT NULL DEFAULT 0,
  expenses_cents    int         NOT NULL DEFAULT 0,
  stripe_fees_cents int         NOT NULL DEFAULT 0,
  net_profit_cents  int         GENERATED ALWAYS AS
                    (revenue_cents - refunds_cents - cogs_cents - expenses_cents) STORED,
  closed_at         timestamptz NOT NULL DEFAULT now(),
  amended_at        timestamptz,
  amendment_note    text,
  UNIQUE (year, month)
);

-- 3. Expenses ledger
CREATE TABLE IF NOT EXISTS public.expenses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date              date        NOT NULL,
  amount_cents      int         NOT NULL CHECK (amount_cents > 0),
  category          text        NOT NULL,
  description       text        NOT NULL,
  source            text        NOT NULL DEFAULT 'manual'
                                CHECK (source IN ('manual', 'stripe_auto')),
  receipt_url       text,
  stripe_charge_id  text        UNIQUE,  -- null for manual; dedup key for stripe_auto
  month_snapshot_id uuid        REFERENCES public.monthly_snapshots(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 4. RLS
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;

-- Admins can read both tables
CREATE POLICY "admin_read_snapshots" ON public.monthly_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "admin_read_expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can insert/update/delete manual expenses only
CREATE POLICY "admin_write_manual_expenses" ON public.expenses
  FOR ALL USING (
    source = 'manual' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can update amendment fields on snapshots
CREATE POLICY "admin_amend_snapshots" ON public.monthly_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Service role bypasses RLS (for edge functions) — no policy needed;
-- service role is exempt by default in Supabase.
