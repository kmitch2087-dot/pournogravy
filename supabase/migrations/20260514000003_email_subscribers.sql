CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  source     TEXT NOT NULL DEFAULT 'homepage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscribers_insert_anon"
  ON public.email_subscribers FOR INSERT WITH CHECK (true);

CREATE POLICY "subscribers_admin_read"
  ON public.email_subscribers FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS email_subscribers_created_idx ON public.email_subscribers (created_at DESC);
