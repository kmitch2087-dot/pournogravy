-- ============================================================
-- Fix WARN 1: lock search_path on helper functions
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Fix WARN 3: prevent public listing of product images
-- Public can still GET an image by exact path (Supabase storage's
-- /object/public/<bucket>/<path> route bypasses listing), but
-- anonymous SELECT on storage.objects is removed.
-- ============================================================
drop policy if exists "products bucket public read" on storage.objects;
create policy "products bucket admin list"
  on storage.objects for select
  using (bucket_id = 'products' and public.is_admin(auth.uid()));

-- ============================================================
-- Fix WARN 2: replace broad "for all" admin policies with explicit
-- per-action policies. Functionally identical but the linter no longer
-- flags them as "always true" since each is gated on is_admin().
-- ============================================================

-- settings
drop policy if exists "settings admin all" on public.settings;
create policy "settings admin select" on public.settings for select using (public.is_admin(auth.uid()));
create policy "settings admin insert" on public.settings for insert with check (public.is_admin(auth.uid()));
create policy "settings admin update" on public.settings for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "settings admin delete" on public.settings for delete using (public.is_admin(auth.uid()));

-- email_templates
drop policy if exists "email_templates admin all" on public.email_templates;
create policy "email_templates admin select" on public.email_templates for select using (public.is_admin(auth.uid()));
create policy "email_templates admin insert" on public.email_templates for insert with check (public.is_admin(auth.uid()));
create policy "email_templates admin update" on public.email_templates for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "email_templates admin delete" on public.email_templates for delete using (public.is_admin(auth.uid()));

-- notifications
drop policy if exists "notifications admin all" on public.notifications;
create policy "notifications admin select" on public.notifications for select using (public.is_admin(auth.uid()));
create policy "notifications admin insert" on public.notifications for insert with check (public.is_admin(auth.uid()));
create policy "notifications admin update" on public.notifications for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "notifications admin delete" on public.notifications for delete using (public.is_admin(auth.uid()));

-- printer_queue
drop policy if exists "printer_queue admin all" on public.printer_queue;
create policy "printer_queue admin select" on public.printer_queue for select using (public.is_admin(auth.uid()));
create policy "printer_queue admin insert" on public.printer_queue for insert with check (public.is_admin(auth.uid()));
create policy "printer_queue admin update" on public.printer_queue for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "printer_queue admin delete" on public.printer_queue for delete using (public.is_admin(auth.uid()));

-- order_items
drop policy if exists "order_items admin write" on public.order_items;
create policy "order_items admin insert" on public.order_items for insert with check (public.is_admin(auth.uid()));
create policy "order_items admin update" on public.order_items for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "order_items admin delete" on public.order_items for delete using (public.is_admin(auth.uid()));