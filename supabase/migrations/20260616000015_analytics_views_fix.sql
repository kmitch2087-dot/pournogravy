-- Fix analytics_daily_revenue to use orders table as the source of truth.
-- The original view read from analytics_events.purchase, but the stripe webhook
-- wasn't writing purchase events, so the view always returned empty rows.
-- Revenue view now uses orders directly; funnel still uses analytics_events
-- for web-behavior tracking (page_view, add_to_cart, checkout_start).
-- Must drop first because we're changing the view's source table (column types must match)
drop view if exists public.analytics_daily_revenue;
create view public.analytics_daily_revenue as
  select
    date_trunc('day', created_at at time zone 'America/New_York') as day,
    coalesce(sum((total_cents - coalesce(shipping_cents, 0))::numeric / 100), 0) as revenue,
    count(*) as purchases
  from public.orders
  where status in ('paid', 'in_production', 'fulfilled', 'shipped', 'delivered')
    and created_at >= now() - interval '30 days'
  group by 1
  order by 1;

-- Seed purchase analytics_events for existing orders so the funnel shows purchase counts.
-- The stripe webhook will handle new orders going forward.
insert into public.analytics_events (event_type, order_id, revenue, session_id, created_at)
select
  'purchase',
  id,
  (total_cents - coalesce(shipping_cents, 0))::numeric / 100,
  coalesce(stripe_session_id, 'seed-' || id::text),
  created_at
from public.orders
where status in ('paid', 'in_production', 'fulfilled', 'shipped', 'delivered')
  and id not in (
    select order_id from public.analytics_events
    where event_type = 'purchase' and order_id is not null
  );
