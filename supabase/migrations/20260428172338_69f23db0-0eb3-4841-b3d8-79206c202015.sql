-- Create an admin allowlist table to remove hardcoded emails from migration history
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage the allowlist
DROP POLICY IF EXISTS "admin_allowlist admin select" ON public.admin_allowlist;
CREATE POLICY "admin_allowlist admin select"
  ON public.admin_allowlist FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_allowlist admin insert" ON public.admin_allowlist;
CREATE POLICY "admin_allowlist admin insert"
  ON public.admin_allowlist FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_allowlist admin delete" ON public.admin_allowlist;
CREATE POLICY "admin_allowlist admin delete"
  ON public.admin_allowlist FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Seed current admin emails into the allowlist (one-time, mirrors existing privileged users)
INSERT INTO public.admin_allowlist (email) VALUES
  ('aopie91@gmail.com'),
  ('kristinmitchell@aethyx.space'),
  ('kmitch2087@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Replace handle_new_user to consult the allowlist instead of hardcoding emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    exists (
      select 1 from public.admin_allowlist
      where lower(email) = lower(new.email)
    )
  )
  on conflict (id) do update
    set is_admin = excluded.is_admin or public.profiles.is_admin,
        email = excluded.email;
  return new;
end;
$function$;
