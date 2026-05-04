create table if not exists public.discount_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  discount_type    text not null check (discount_type in ('percent', 'fixed_cents')),
  discount_value   integer not null check (discount_value > 0),
  min_order_cents  integer not null default 0 check (min_order_cents >= 0),
  max_uses         integer check (max_uses > 0),  -- null = unlimited
  use_count        integer not null default 0 check (use_count >= 0),
  expires_at       timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists discount_codes_code_idx on public.discount_codes (lower(code));

drop trigger if exists discount_codes_set_updated_at on public.discount_codes;
create trigger discount_codes_set_updated_at
  before update on public.discount_codes
  for each row execute function public.set_updated_at();

alter table public.discount_codes enable row level security;

-- Anon/auth can look up active, unexpired codes (edge function uses service role to write)
create policy "discount_codes select active"
  on public.discount_codes for select
  using (
    is_active = true
    and (expires_at is null or expires_at > now())
  );

-- Admin can manage all
create policy "discount_codes admin all"
  on public.discount_codes for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Atomic use_count increment — called by create-checkout edge function
create or replace function public.increment_discount_use(code_id uuid)
returns void
language sql
security definer
as $$
  update public.discount_codes set use_count = use_count + 1 where id = code_id;
$$;

-- Add discount tracking columns to orders
alter table public.orders
  add column if not exists discount_code_id uuid references public.discount_codes (id) on delete set null,
  add column if not exists discount_cents   integer not null default 0 check (discount_cents >= 0);
