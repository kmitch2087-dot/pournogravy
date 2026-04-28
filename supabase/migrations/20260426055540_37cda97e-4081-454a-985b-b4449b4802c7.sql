-- ============================================================
-- 1. profiles + is_admin helper (created first so other policies can use it)
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Security definer helper — avoids recursive RLS on profiles
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = _user_id), false);
$$;

-- Auto-create profile on signup; auto-promote kmitch2087@gmail.com to admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    case when lower(new.email) = 'kmitch2087@gmail.com' then true else false end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles admin insert"
  on public.profiles for insert
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- 2. Extend products
-- ============================================================
alter table public.products
  add column if not exists description_long jsonb,
  add column if not exists humor             text,
  add column if not exists bad_advice        jsonb,
  add column if not exists category          text,
  add column if not exists sizes             text[] not null default '{}',
  add column if not exists variants          jsonb not null default '[]'::jsonb,
  add column if not exists colors            jsonb not null default '[]'::jsonb,
  add column if not exists images            text[] not null default '{}',
  add column if not exists badge             text,
  add column if not exists featured          boolean not null default false,
  add column if not exists published         boolean not null default true,
  add column if not exists drop_date         timestamptz,
  add column if not exists fit_type          text not null default 'unisex',
  add column if not exists status            text not null default 'published'
    check (status in ('draft','published','scheduled'));

create index if not exists products_status_idx on public.products(status);
create index if not exists products_featured_idx on public.products(featured) where featured = true;

drop policy if exists "products readable by anyone" on public.products;
create policy "products readable published or admin"
  on public.products for select
  using (
    (status = 'published' and is_active = true)
    or (status = 'scheduled' and drop_date is not null and drop_date <= now() and is_active = true)
    or public.is_admin(auth.uid())
  );

drop policy if exists "products admin insert" on public.products;
create policy "products admin insert"
  on public.products for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "products admin update" on public.products;
create policy "products admin update"
  on public.products for update
  using (public.is_admin(auth.uid()));

drop policy if exists "products admin delete" on public.products;
create policy "products admin delete"
  on public.products for delete
  using (public.is_admin(auth.uid()));

-- ============================================================
-- 3. Extend orders
-- ============================================================
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add column if not exists tracking_number  text,
  add column if not exists tracking_carrier text check (tracking_carrier in ('USPS','UPS','FedEx','DHL') or tracking_carrier is null),
  add column if not exists customer_notes   text;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending','paid','new','in_production','shipped','delivered','fulfilled','cancelled','refunded'));

drop policy if exists "orders select own" on public.orders;
create policy "orders select own or admin"
  on public.orders for select
  using ((auth.uid() is not null and user_id = auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update"
  on public.orders for update
  using (public.is_admin(auth.uid()));

drop policy if exists "orders admin insert" on public.orders;
create policy "orders admin insert"
  on public.orders for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "order_items select own" on public.order_items;
create policy "order_items select own or admin"
  on public.order_items for select
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  );

drop policy if exists "order_items admin write" on public.order_items;
create policy "order_items admin write"
  on public.order_items for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- 4. Extend custom_requests
-- ============================================================
alter table public.custom_requests drop constraint if exists custom_requests_status_check;
alter table public.custom_requests
  add column if not exists internal_notes text;

alter table public.custom_requests
  add constraint custom_requests_status_check
  check (status in ('new','contacted','quoted','approved','in_production','delivered','declined','closed'));

drop policy if exists "custom_requests admin select" on public.custom_requests;
create policy "custom_requests admin select"
  on public.custom_requests for select
  using (public.is_admin(auth.uid()));

drop policy if exists "custom_requests admin update" on public.custom_requests;
create policy "custom_requests admin update"
  on public.custom_requests for update
  using (public.is_admin(auth.uid()));

drop policy if exists "custom_requests admin delete" on public.custom_requests;
create policy "custom_requests admin delete"
  on public.custom_requests for delete
  using (public.is_admin(auth.uid()));

-- ============================================================
-- 5. settings (single-row)
-- ============================================================
create table if not exists public.settings (
  id                    int primary key default 1 check (id = 1),
  fulfillment_provider  text not null default 'local_printer' check (fulfillment_provider in ('local_printer','pod_provider')),
  printer_email         text,
  business_name         text not null default 'POURnogravy',
  support_email         text not null default 'opie@pournogravy.com',
  from_email            text not null default 'opie@pournogravy.com',
  from_name             text not null default 'POURnogravy',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.settings enable row level security;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

drop policy if exists "settings admin all" on public.settings;
create policy "settings admin all"
  on public.settings for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- 6. email_templates
-- ============================================================
create table if not exists public.email_templates (
  key         text primary key,
  name        text not null,
  subject     text not null,
  body_html   text not null,
  body_text   text not null,
  description text,
  variables   text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.email_templates enable row level security;

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

drop policy if exists "email_templates admin all" on public.email_templates;
create policy "email_templates admin all"
  on public.email_templates for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

insert into public.email_templates (key, name, subject, body_html, body_text, description, variables) values
  ('order_confirmation',
   'Order confirmation',
   'Order confirmed — {{order_number}}',
   '<h1>Thanks {{customer_name}}!</h1><p>Your order {{order_number}} for ${{order_total}} is in. We''ll send tracking when it ships.</p>',
   'Thanks {{customer_name}}! Your order {{order_number}} for ${{order_total}} is in. We''ll send tracking when it ships.',
   'Sent right after a successful Stripe payment.',
   ARRAY['customer_name','order_number','order_total','order_items']),
  ('order_shipped',
   'Order shipped',
   'Your order {{order_number}} is on its way',
   '<h1>It''s out the door, {{customer_name}}.</h1><p>Tracking: {{tracking_carrier}} {{tracking_number}}</p>',
   'It''s out the door, {{customer_name}}. Tracking: {{tracking_carrier}} {{tracking_number}}',
   'Sent when an order is marked shipped in admin.',
   ARRAY['customer_name','order_number','tracking_carrier','tracking_number']),
  ('custom_request_reply',
   'Custom request reply',
   'Re: Your custom request',
   '<p>Hey {{customer_name}},</p><p>{{message}}</p><p>— POURnogravy</p>',
   'Hey {{customer_name}}, {{message}} — POURnogravy',
   'Sent when admin replies to a custom garment request.',
   ARRAY['customer_name','message']),
  ('printer_notification',
   'Printer notification',
   'NEW JOB — Order {{order_number}}',
   '<h1>New print job</h1><p>Order: {{order_number}}<br/>Customer: {{customer_name}} ({{customer_email}})</p><pre>{{order_items}}</pre><p>Ship to: {{shipping_address}}</p>',
   'New print job. Order: {{order_number}}. Customer: {{customer_name}} ({{customer_email}}). Items: {{order_items}}. Ship to: {{shipping_address}}',
   'Sent to printer email when a new local-printer order arrives.',
   ARRAY['order_number','customer_name','customer_email','order_items','shipping_address'])
on conflict (key) do nothing;

-- ============================================================
-- 7. notifications
-- ============================================================
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  template_key  text references public.email_templates(key) on delete set null,
  type          text not null,
  recipient     text not null,
  subject       text not null,
  body_html     text not null,
  body_text     text not null,
  status        text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  error         text,
  attempts      int not null default 0,
  related_kind  text,
  related_id    uuid,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists notifications_status_idx on public.notifications(status);
create index if not exists notifications_created_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

drop policy if exists "notifications admin all" on public.notifications;
create policy "notifications admin all"
  on public.notifications for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- 8. printer_queue
-- ============================================================
create table if not exists public.printer_queue (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  status        text not null default 'queued' check (status in ('queued','printed','shipped','cancelled')),
  payload       jsonb not null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists printer_queue_status_idx on public.printer_queue(status);
create index if not exists printer_queue_order_idx on public.printer_queue(order_id);

alter table public.printer_queue enable row level security;

drop trigger if exists printer_queue_set_updated_at on public.printer_queue;
create trigger printer_queue_set_updated_at before update on public.printer_queue
  for each row execute function public.set_updated_at();

drop policy if exists "printer_queue admin all" on public.printer_queue;
create policy "printer_queue admin all"
  on public.printer_queue for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================
-- 9. Storage bucket for product images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "products bucket public read" on storage.objects;
create policy "products bucket public read"
  on storage.objects for select
  using (bucket_id = 'products');

drop policy if exists "products bucket admin write" on storage.objects;
create policy "products bucket admin write"
  on storage.objects for insert
  with check (bucket_id = 'products' and public.is_admin(auth.uid()));

drop policy if exists "products bucket admin update" on storage.objects;
create policy "products bucket admin update"
  on storage.objects for update
  using (bucket_id = 'products' and public.is_admin(auth.uid()));

drop policy if exists "products bucket admin delete" on storage.objects;
create policy "products bucket admin delete"
  on storage.objects for delete
  using (bucket_id = 'products' and public.is_admin(auth.uid()));