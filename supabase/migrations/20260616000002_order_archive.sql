-- Archive table for completed/refunded orders older than 30 days.
-- Mirrors the orders schema exactly, plus an archived_at timestamp.
CREATE TABLE IF NOT EXISTS order_archive (
  LIKE orders INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT now()
);

-- Admins can read archived orders
ALTER TABLE public.order_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_archive admin read" ON public.order_archive;
CREATE POLICY "order_archive admin read"
  ON public.order_archive FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
