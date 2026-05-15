-- Pour Points loyalty system
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance  INT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points      INT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('earned_purchase','redeemed','admin_adjustment','expired')),
  description TEXT,
  order_id    UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyalty_accounts_user_idx ON public.loyalty_accounts (user_id);
CREATE INDEX IF NOT EXISTS loyalty_tx_user_idx ON public.loyalty_transactions (user_id, created_at DESC);

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_accounts_own" ON public.loyalty_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "loyalty_tx_own" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_loyalty_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER loyalty_accounts_updated_at
  BEFORE UPDATE ON public.loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_loyalty_updated_at();
