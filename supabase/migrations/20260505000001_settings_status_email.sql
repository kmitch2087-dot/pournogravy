-- Add last_status_email_at to settings for notify-project-status rate limiting
alter table public.settings
  add column if not exists last_status_email_at timestamptz;
