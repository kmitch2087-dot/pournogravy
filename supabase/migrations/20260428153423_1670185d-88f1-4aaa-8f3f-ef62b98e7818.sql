
-- 1) Prevent privilege escalation on profiles
DROP POLICY IF EXISTS "profiles update own or admin" ON public.profiles;

CREATE POLICY "profiles update own non-admin fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "profiles admin update any"
ON public.profiles
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 2) Tighten cart_items anonymous access — restrict anon to inserts only
DROP POLICY IF EXISTS "cart_items select own" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items update own" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items delete own" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items insert own" ON public.cart_items;

CREATE POLICY "cart_items select own auth"
ON public.cart_items
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "cart_items insert auth or anon"
ON public.cart_items
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "cart_items update own auth"
ON public.cart_items
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "cart_items delete own auth"
ON public.cart_items
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 3) Lock down SECURITY DEFINER helper functions from public API execution
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
