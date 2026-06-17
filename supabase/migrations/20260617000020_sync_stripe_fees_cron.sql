-- Schedule daily sync of Stripe processing fees into the expenses table (02:00 UTC).
-- The sync-stripe-fees edge function fetches balance_transactions for the past 48 hours
-- and upserts rows with source='stripe_auto' and category='Merchant Fees — Stripe'.
-- Uses stripe_charge_id as the conflict key so reruns are idempotent.
select cron.schedule(
  'sync-stripe-fees-daily',
  '0 2 * * *',
  $$
  select net.http_post(
    url     := 'https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/sync-stripe-fees',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdGprYXdjbXNmZ2p5aW1ubmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDY2MDksImV4cCI6MjA5MjI4MjYwOX0.Kb8hwzqCfdDdvpmXKWtSXW5m3wzC3_sBhML6bCJyRgY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
