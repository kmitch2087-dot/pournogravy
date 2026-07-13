-- Security hardening — addresses Supabase security advisors (2026-07-13)
-- 1) SECURITY DEFINER view leaked daily revenue to anon
-- 2) Privilege-escalation: anon/authenticated could call increment_loyalty_points /
--    increment_discount_use directly (self-award points, inflate discount usage)
-- 3) search_path pinned on flagged functions (prevents search_path injection)
-- All callers verified server-side (service_role) or self-authorizing before changing grants.

------------------------------------------------------------------------------
-- 1. analytics_daily_revenue: stop leaking revenue to anonymous visitors
--    Switch to security_invoker so the caller's RLS on public.orders applies.
--    orders SELECT policy = own-rows OR is_admin(auth.uid()); anon -> no rows.
------------------------------------------------------------------------------
alter view public.analytics_daily_revenue set (security_invoker = on);
revoke all    on public.analytics_daily_revenue from anon;
grant  select on public.analytics_daily_revenue to authenticated, service_role;

------------------------------------------------------------------------------
-- 2. Lock privilege-sensitive RPCs to server-side callers (service_role) only.
--    increment_loyalty_points  -> called only by stripe-webhook
--    increment_discount_use    -> called only by create-checkout
------------------------------------------------------------------------------
revoke execute on function public.increment_loyalty_points(uuid, integer, uuid) from public, anon, authenticated;
grant  execute on function public.increment_loyalty_points(uuid, integer, uuid) to service_role;

revoke execute on function public.increment_discount_use(uuid) from public, anon, authenticated;
grant  execute on function public.increment_discount_use(uuid) to service_role;

------------------------------------------------------------------------------
-- 3. search_path hardening on functions with mutable search_path.
--    Bodies that reference only pg_catalog builtins or already schema-qualified
--    objects can simply pin search_path to empty.
------------------------------------------------------------------------------
alter function public.set_updated_at()                 set search_path = '';
alter function public.set_loyalty_updated_at()         set search_path = '';
alter function public.increment_discount_use(uuid)     set search_path = '';
alter function stripe.set_updated_at()                 set search_path = '';
alter function stripe.set_updated_at_metadata()        set search_path = '';
alter function stripe.check_rate_limit(text, integer, integer) set search_path = '';

-- These three referenced unqualified tables; recreate with schema-qualified refs
-- so an empty search_path is safe.
create or replace function public.increment_sponsor_click(sponsor_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.sponsors set click_count = click_count + 1 where id = sponsor_id;
$$;

create or replace function public.increment_sponsor_impression(sponsor_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.sponsors set impression_count = impression_count + 1 where id = sponsor_id;
$$;

create or replace function public.set_primary_shipping_address(p_address_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid;
begin
  select user_id into v_user_id from public.shipping_addresses where id = p_address_id;
  if v_user_id is null then raise exception 'Address not found'; end if;
  if v_user_id is distinct from auth.uid() then raise exception 'Not authorized'; end if;
  update public.shipping_addresses set is_primary = false where user_id = v_user_id;
  update public.shipping_addresses set is_primary = true, last_used_at = now() where id = p_address_id;
end;
$$;

-- set_primary_shipping_address self-authorizes; anon has no addresses. Authenticated only.
revoke execute on function public.set_primary_shipping_address(uuid) from public, anon;
grant  execute on function public.set_primary_shipping_address(uuid) to authenticated;
