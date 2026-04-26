-- Pournogravy: custom garment requests
-- Run in Supabase dashboard > SQL Editor (or `supabase db push`).
-- Safe to re-run.

-- ============================================================
-- Custom garment requests
-- Anonymous form submissions from product pages — users asking
-- for an existing design printed on a different garment (hoodie,
-- speedo, tank, etc.). The owner reviews these in the dashboard
-- and follows up with a quote + mockup.
-- ============================================================
create table if not exists public.custom_requests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (length(trim(name)) > 0),
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text,
  garment         text not null check (length(trim(garment)) > 0),
  design_id       text,        -- product id from src/data/products.ts (slug-style string, not a uuid)
  design_name     text,        -- snapshot of the product name at time of request
  notes           text,
  status          text not null default 'new'
                     check (status in ('new','contacted','quoted','closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists custom_requests_status_idx
  on public.custom_requests (status);
create index if not exists custom_requests_created_idx
  on public.custom_requests (created_at desc);

-- updated_at trigger (reuse the function from 001_initial_schema.sql)
drop trigger if exists custom_requests_set_updated_at on public.custom_requests;
create trigger custom_requests_set_updated_at before update on public.custom_requests
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.custom_requests enable row level security;

-- Anyone (including anonymous) can submit a request.
drop policy if exists "custom_requests insert anon" on public.custom_requests;
create policy "custom_requests insert anon"
  on public.custom_requests for insert
  with check (true);

-- Nobody reads via the public API. Owner views in the Supabase dashboard
-- (service_role bypasses RLS). When an admin UI is built, swap this for
-- a policy keyed off auth.uid() = owner id.
-- (No select policy = no rows visible to anon/authenticated clients.)
