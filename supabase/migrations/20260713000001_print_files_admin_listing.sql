-- Restrict print-files bucket enumeration to admins.
-- Before: "Public read print-files" granted SELECT on storage.objects to the
-- public role (anon + authenticated) for bucket_id='print-files', letting anyone
-- call storage.list() and enumerate every print-ready design (sellable IP).
--
-- Public bucket object URLs (/object/public/print-files/...) bypass storage RLS,
-- so the printer's fulfillment email links keep working after this change; only
-- the enumeration/list API is locked to admins (the admin Print Files page).
drop policy if exists "Public read print-files" on storage.objects;

create policy "Admin list print-files"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'print-files' and public.is_admin(auth.uid()));
