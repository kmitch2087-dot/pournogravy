-- Printer portal: password-gated access to the print-files catalog.
-- The printer authenticates as a normal Supabase Auth user; an allowlist +
-- is_printer() grants them (and admins) read access to the private print-files bucket.

-- Allowlist of printer emails (lowercased). Single printer for now; seed inline.
create table if not exists public.printer_allowlist (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.printer_allowlist enable row level security;

-- Only admins can read the allowlist (future management UI). The printer never
-- queries it directly — is_printer() is SECURITY DEFINER and bypasses this RLS.
drop policy if exists "printer_allowlist admin read" on public.printer_allowlist;
create policy "printer_allowlist admin read"
  on public.printer_allowlist for select to authenticated
  using (public.is_admin(auth.uid()));

insert into public.printer_allowlist (email)
values ('up2ournecksinfabric@gmail.com')
on conflict (email) do nothing;

-- is_printer: true when the user's auth email is allowlisted.
-- Uses auth.users (not profiles) so it works even before a profile row exists.
create or replace function public.is_printer(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.printer_allowlist pa
    join auth.users u on lower(u.email) = pa.email
    where u.id = _user_id
  );
$$;

revoke execute on function public.is_printer(uuid) from public;
grant  execute on function public.is_printer(uuid) to authenticated, service_role;

-- Storage: let the printer (and admins) read/list the private print-files bucket.
-- Replaces the admin-only listing policy added earlier today.
drop policy if exists "Admin list print-files"          on storage.objects;
drop policy if exists "Printer and admin read print-files" on storage.objects;
create policy "Printer and admin read print-files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'print-files'
    and (public.is_printer(auth.uid()) or public.is_admin(auth.uid()))
  );
