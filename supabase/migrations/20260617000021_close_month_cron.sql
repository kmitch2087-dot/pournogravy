-- Schedules the close-month edge function to run at 00:05 on the 1st of each month.
-- The function closes the previous calendar month and writes a row to monthly_snapshots.
-- Idempotent — safe to run manually at any time.
select cron.schedule(
  'close-month-monthly',
  '5 0 1 * *',
  $$
  select net.http_post(
    url     := 'https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/close-month',
    headers := json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
