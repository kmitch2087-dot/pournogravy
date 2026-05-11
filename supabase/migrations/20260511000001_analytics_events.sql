-- Analytics event pipeline for Pournogravy
-- Tracks page views, cart interactions, and conversions.
-- Anon-accessible inserts so no auth required for tracking.
-- All reads restricted to admin only.

create table if not exists public.analytics_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,             -- 'page_view' | 'add_to_cart' | 'checkout_start' | 'purchase'
  page         text,                       -- pathname e.g. '/product/whiskey-plz-tee'
  product_id   text,                       -- product slug/id if applicable
  order_id     uuid,                       -- set on 'purchase' events
  revenue      numeric(10,2),             -- set on 'purchase' events (order total)
  session_id   text,                       -- anonymous session identifier
  user_id      uuid references auth.users(id) on delete set null,
  referrer     text,                       -- document.referrer
  user_agent   text,                       -- navigator.userAgent
  metadata     jsonb default '{}'::jsonb, -- flexible extra data
  created_at   timestamptz not null default now()
);

-- Index for dashboard queries (time-based aggregation)
create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_product_idx
  on public.analytics_events (product_id, event_type)
  where product_id is not null;

-- RLS: anyone can insert (anon tracking), only admins can read
alter table public.analytics_events enable row level security;

create policy "analytics insert anon"
  on public.analytics_events for insert
  with check (true);

create policy "analytics read admin"
  on public.analytics_events for select
  using (public.is_admin(auth.uid()));

-- Convenience view for the admin dashboard: last-30-day daily revenue
create or replace view public.analytics_daily_revenue as
  select
    date_trunc('day', created_at at time zone 'America/New_York') as day,
    coalesce(sum(revenue), 0)                                      as revenue,
    count(*)                                                       as purchases
  from public.analytics_events
  where event_type = 'purchase'
    and created_at >= now() - interval '30 days'
  group by 1
  order by 1;

-- Convenience view: funnel counts (last 30 days)
create or replace view public.analytics_funnel as
  select
    event_type,
    count(distinct session_id) as sessions
  from public.analytics_events
  where created_at >= now() - interval '30 days'
    and event_type in ('page_view','add_to_cart','checkout_start','purchase')
  group by event_type;

-- Convenience view: top products by views + cart adds (last 30 days)
create or replace view public.analytics_top_products as
  select
    product_id,
    count(*) filter (where event_type = 'page_view')    as views,
    count(*) filter (where event_type = 'add_to_cart')  as cart_adds,
    count(*) filter (where event_type = 'purchase')     as purchases
  from public.analytics_events
  where product_id is not null
    and created_at >= now() - interval '30 days'
  group by product_id
  order by views desc
  limit 20;
