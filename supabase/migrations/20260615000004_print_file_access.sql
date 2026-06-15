create table if not exists public.file_access_log (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  file_path  text not null,
  accessed_at timestamptz not null default now()
);
alter table public.file_access_log enable row level security;
create policy "Admin read access log" on public.file_access_log for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Service insert access log" on public.file_access_log for insert with check (true);
