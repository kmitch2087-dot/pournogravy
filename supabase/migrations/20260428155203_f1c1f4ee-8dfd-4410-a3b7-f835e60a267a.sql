-- Tighten anonymous insert policy on custom_requests to require
-- a real-looking email and a non-empty phone number. Admins are unaffected.
DROP POLICY IF EXISTS "custom_requests insert anon" ON public.custom_requests;

CREATE POLICY "custom_requests insert anon"
ON public.custom_requests
FOR INSERT
TO public
WITH CHECK (
  length(btrim(name)) > 0
  AND length(btrim(garment)) > 0
  AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND length(btrim(email)) <= 255
  AND phone IS NOT NULL
  AND length(btrim(phone)) >= 7
  AND length(btrim(phone)) <= 32
);