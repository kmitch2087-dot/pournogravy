-- Pournogravy: initial schema
-- Run this in Supabase dashboard > SQL Editor (or via `supabase db push` if using CLI).
-- Safe to re-run (uses IF NOT EXISTS and idempotent policy drops).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Products
-- ============================================================
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  description      text,
  price_cents      integer not null check (price_cents >= 0),
  currency         text not null default 'USD',
  image_url        text,
  inventory_count  integer not null default 0 check (inventory_count >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (is_active) where is_active = true;

-- ============================================================
-- Cart items (supports logged-in users AND guest sessions)
-- ============================================================
create table if not exists public.cart_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,
  session_id   text,  -- for guest carts, client-generated UUID stored in localStorage
  product_id   uuid not null references public.products (id) on delete cascade,
  quantity     integer not null check (quantity > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- one line item per (user or session, product)
  constraint cart_items_owner_check check (user_id is not null or session_id is not null),
  constraint cart_items_unique_user_product unique nulls not distinct (user_id, product_id),
  constraint cart_items_unique_session_product unique nulls not distinct (session_id, product_id)
);

create index if not exists cart_items_user_idx on public.cart_items (user_id) where user_id is not null;
create index if not exists cart_items_session_idx on public.cart_items (session_id) where session_id is not null;

-- ============================================================
-- Orders
-- ============================================================
create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users (id) on delete set null,
  email                     text not null,
  status                    text not null default 'pending' check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  subtotal_cents            integer not null check (subtotal_cents >= 0),
  tax_cents                 integer not null default 0 check (tax_cents >= 0),
  shipping_cents            integer not null default 0 check (shipping_cents >= 0),
  total_cents               integer not null check (total_cents >= 0),
  currency                  text not null default 'USD',
  stripe_session_id         text unique,
  stripe_payment_intent_id  text unique,
  shipping_address          jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_status_idx on public.orders (status);

-- ============================================================
-- Order items (immutable snapshot of what was bought)
-- ============================================================
create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid not null references public.products (id) on delete restrict,
  product_snapshot  jsonb not null,  -- frozen name/price/image at purchase time
  quantity          integer not null check (quantity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  created_at        timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.products    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Products: anyone can read active products; only service_role writes (admin via dashboard or edge function).
drop policy if exists "products readable by anyone" on public.products;
create policy "products readable by anyone"
  on public.products for select
  using (is_active = true);

-- Cart items: users read/write their own (by user_id OR session_id in JWT claim).
-- For guest sessions we rely on the client passing session_id; enforce that session_id is set
-- OR user matches auth.uid().
drop policy if exists "cart_items select own" on public.cart_items;
create policy "cart_items select own"
  on public.cart_items for select
  using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and session_id is not null)
  );

drop policy if exists "cart_items insert own" on public.cart_items;
create policy "cart_items insert own"
  on public.cart_items for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and session_id is not null and user_id is null)
  );

drop policy if exists "cart_items update own" on public.cart_items;
create policy "cart_items update own"
  on public.cart_items for update
  using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and session_id is not null)
  );

drop policy if exists "cart_items delete own" on public.cart_items;
create policy "cart_items delete own"
  on public.cart_items for delete
  using (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and session_id is not null)
  );

-- Orders: users can only read their own orders. Writes happen through edge functions (service_role).
drop policy if exists "orders select own" on public.orders;
create policy "orders select own"
  on public.orders for select
  using (auth.uid() is not null and user_id = auth.uid());

-- Order items: readable if parent order is readable.
drop policy if exists "order_items select own" on public.order_items;
create policy "order_items select own"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- ============================================================
-- Seed a couple of products so the site shows something (optional — delete if you don't want test data)
-- ============================================================
insert into public.products (slug, name, description, price_cents, inventory_count)
values
  ('sample-product-1', 'Sample Product 1', 'Replace me with real product data.', 2500, 100),
  ('sample-product-2', 'Sample Product 2', 'Replace me with real product data.', 4500, 50)
on conflict (slug) do nothing;
