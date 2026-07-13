# Printer Portal + Private Print-Files — Design Spec (2026-07-13)

## Goal
Lock down the sellable print-ready graphics (`print-files` bucket) behind authentication.
The printer (Up2ournecksinfabric LLC, `Up2ournecksinfabric@gmail.com`) gets a
password-protected portal with access to the **whole catalog** of print files as a
**backup** — the primary delivery remains the print files embedded as links in each
order email.

## Decisions (locked with client)
- Access model: **Supabase Auth account** (printer sets their own password).
- Order-email print links: **1-year signed URLs** (work on public or private bucket).
- Invite: **sent right after build/deploy**.
- Client handles in Supabase dashboard: flip `print-files` bucket to **private**;
  enable **leaked-password protection** (Pro-plan only — skip if on Free).

## Components

### 1. DB migration `printer_portal`
- `printer_allowlist (email text primary key, created_at timestamptz default now())`,
  RLS enabled, seeded with `up2ournecksinfabric@gmail.com` (lowercased).
- `public.is_printer(_user_id uuid) returns boolean` — SECURITY DEFINER, STABLE,
  `search_path=''`, mirrors `is_admin`: true when the user's `auth.users.email`
  (lowercased) is in `printer_allowlist`.
- Storage RLS on `print-files`: extend read to the printer. Replace the admin-only
  `Admin list print-files` SELECT policy (added earlier today) with
  `Printer/Admin read print-files`: `bucket_id='print-files' AND (is_printer(auth.uid()) OR is_admin(auth.uid()))`.
  Lets the printer `list()` + `createSignedUrl()` when the bucket is private.
- `printer_allowlist` readable by admins (for future management UI); not exposed to anon.

### 2. Edge function `printer-invite` (verify_jwt=false, admin-guarded)
- Auth: requires caller to be an admin (verify the caller's JWT via
  `supabase.auth.getUser(token)` + `is_admin`), OR a one-time `x-admin-secret`
  header matching a function secret. Never callable anonymously.
- Steps (service_role):
  1. Ensure `printer_allowlist` contains the target email.
  2. Ensure the auth user exists: look up by email; if missing, `admin.createUser`
     (email confirmed, no password) — printer will set their own.
  3. `admin.generateLink({ type: 'recovery', email, redirectTo: <SITE>/printer/set-password })`
     to get an `action_link` (recovery works for both new + existing users to set a password).
  4. Send a **branded Resend email** (reuse the send-notification HTML style) with a
     "Create your password" CTA → `action_link`.
- Returns `{ ok: true }`.

### 3. Branded invite email content
- Subject: "Your Pournogravy print-file portal access".
- Body (brand-styled, dark + yellow accents): CTA button "Create your password".
- Post-set-password confirmation copy (shown on `/printer/set-password` after success,
  and echoed in the email): *"This portal is a backup — you should receive the print
  files as links in each order email. If you have any issues, email
  kristinmitchell@aethyx.space. In the meantime you'll always have access to the whole
  catalog of graphics here."*

### 4. Frontend routes (React)
- `/printer/login` — `signInWithPassword`. On success → `/printer`.
- `/printer/set-password` — reads the recovery session from the URL, form to set a new
  password (`auth.updateUser({ password })`), then shows the backup message + button to
  the catalog.
- `/printer` — catalog. Lists all objects under `black/`, `white/`, `back/` (via
  `storage.list`), groups them (front designs vs back logos), and offers a secure
  download per file via `createSignedUrl` (short-lived, e.g. 1 hour, generated on click).
- `PrinterProtectedRoute` — waits on auth loading, requires a session + `is_printer`
  (RPC or a lightweight check); otherwise redirects to `/printer/login`. Modeled on the
  admin `ProtectedRoute` but keyed on `is_printer`, and MUST NOT regress the AuthContext
  single-`getSession` rule (reuse the existing AuthContext session; no new getSession).
- Register routes in `App.tsx` outside the admin tree.

### 5. Order-email delivery (signed URLs)
- `stripe-webhook`: replace public `STORAGE_BASE/...` front/back URLs with 1-year signed
  URLs via `supabase.storage.from('print-files').createSignedUrl(path, 31536000)`.
  Applies to the printer email design links AND the fulfillment CSV columns.
- `fulfillment-portal` and `resend-test-emails`: same signed-URL treatment where they
  emit print-file links.

### 6. Admin previews (avoid breakage when bucket is private)
- `admin/ProductEdit.tsx` (lines ~239-240 use `getPublicUrl`) → switch to
  `createSignedUrl` (admin has RLS read via `is_admin`).
- `admin/PrintFiles.tsx` already uses `list()` + likely `getPublicUrl`/signed → ensure
  it uses `createSignedUrl` for previews/downloads so it works on a private bucket.

## Work split
- **Claude:** items 1-6, deploy edge functions, commit, then invoke `printer-invite`
  to send the real invite to the printer.
- **Client (Supabase dashboard):** set `print-files` bucket to private; optionally
  enable leaked-password protection.

## Non-goals / YAGNI
- No admin UI to manage `printer_allowlist` (single printer; seed via migration).
- No multi-printer support, no per-order file scoping in the portal (whole catalog only).
- No change to the existing HMAC `/fulfillment` order portal (kept as-is).

## Risks
- Signed URLs work on public + private buckets, so there is no broken window between
  deploy and the client privatizing the bucket.
- `is_printer` must be executable by `authenticated` (needed for RLS + RPC) — same
  pattern/exposure as `is_admin` (acceptable, low-severity info surface).
- Recovery-link flow: `generateLink type=recovery` requires the email to exist; we
  create the user first, so it's reliable for the initial invite.

See project memory: [[project_security_hardening]], [[reference_print_file_resolution]].
