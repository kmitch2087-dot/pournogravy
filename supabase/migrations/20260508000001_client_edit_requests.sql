-- Base client_edit_requests table.
-- Created directly in Supabase dashboard; this file backfills the local migration history.
-- The enhance migration (20260509000001) adds author/done/archived columns on top of this.

CREATE TABLE IF NOT EXISTS public.client_edit_requests (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text        NOT NULL,
  page_url   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_edit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edit_requests admin select" ON public.client_edit_requests;
CREATE POLICY "edit_requests admin select"
  ON public.client_edit_requests FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "edit_requests admin insert" ON public.client_edit_requests;
CREATE POLICY "edit_requests admin insert"
  ON public.client_edit_requests FOR INSERT
  WITH CHECK (is_admin(auth.uid()));
