-- The REVOKE in 20260428153423 was too broad — it blocked authenticated users from
-- executing is_admin(), which broke every RLS policy that calls public.is_admin(auth.uid()).
-- Profiles returned null, making isAdmin always false on the frontend.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Ensure all admin-allowlist emails have is_admin=true in their existing profile rows
-- (covers accounts created before the trigger was in place).
UPDATE public.profiles
SET is_admin = true
WHERE lower(email) IN (
  'aopie91@gmail.com',
  'kristinmitchell@aethyx.space',
  'kmitch2087@gmail.com'
);
