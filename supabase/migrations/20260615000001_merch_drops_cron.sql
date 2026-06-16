-- Schedule process-merch-drops to run nightly at 2am UTC
-- Requires pg_cron and pg_net extensions (enabled in Supabase by default on Pro)
select cron.schedule(
  'process-merch-drops-nightly',
  '0 2 * * *',
  $$
  select net.http_post(
    url := 'https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/process-merch-drops',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdGprYXdjbXNmZ2p5aW1ubmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDY2MDksImV4cCI6MjA5MjI4MjYwOX0.Kb8hwzqCfdDdvpmXKWtSXW5m3wzC3_sBhML6bCJyRgY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
