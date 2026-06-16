alter table public.custom_requests
  add column if not exists archived_at timestamptz default null;
