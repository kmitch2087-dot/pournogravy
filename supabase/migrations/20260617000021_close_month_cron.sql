-- Schedules the close-month edge function to run at 00:05 on the 1st of each month.
-- The function closes the previous calendar month and writes a row to monthly_snapshots.
-- Idempotent — safe to run manually at any time.
select cron.schedule(
  'close-month-monthly',
  '5 0 1 * *',
  $$
  select net.http_post(
    url     := 'https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/close-month',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdGprYXdjbXNmZ2p5aW1ubmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDY2MDksImV4cCI6MjA5MjI4MjYwOX0.Kb8hwzqCfdDdvpmXKWtSXW5m3wzC3_sBhML6bCJyRgY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
