-- Schedule weekly refresh of shipping market rates (Sunday 2am UTC).
-- Fetches current USPS/FedEx rates from public sources and updates shipping_market_rates.
-- UPS rates flagged for manual review when effective_date is >300 days old.
-- On parse failure, sends alert email to kmitch2087@gmail.com.
select cron.schedule(
  'refresh-market-rates-weekly',
  '0 2 * * 0',
  $$
  select net.http_post(
    url := 'https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/refresh-market-rates',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdGprYXdjbXNmZ2p5aW1ubmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDY2MDksImV4cCI6MjA5MjI4MjYwOX0.Kb8hwzqCfdDdvpmXKWtSXW5m3wzC3_sBhML6bCJyRgY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
