# Pournogravy Website — Project Instructions for Claude

## Project Overview
- **Client:** Adam "Opie" Oppenheimer — Pournogravy (bartender-themed apparel brand)
- **Developer/Agency:** Kristin Mitchell — Aethyx (Founder & Developer)
- **Live Site:** pournogravy.com (Cloudflare Pages project: `pournogravydev`, connected to kmitch2087-dot/pournogravy on GitHub)
- **Stage:** Launched soft; active build in progress; Stripe + Resend + fulfillment email wired

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend/DB:** Supabase (PostgreSQL, RLS, Auth, Edge Functions)
- **Payments:** Stripe (Checkout Sessions + Webhooks — edge functions built, secrets not yet set)
- **Email:** Resend (via send-notification Edge Function — API key not yet set)
- **Deployment:** Cloudflare Pages (`pournogravydev` project) → GitHub (master branch)
- **AI Builder:** Claude (Cowork mode) — Lovable disconnected 2026-06-08, Claude is now exclusive builder
- **Build command:** `npm run build` → output dir: `dist`

## ⚠️ CLOUDFLARE PROJECT NAME
The active CF Pages project is **`pournogravydev`** — NOT `pournogravy`. The project named `pournogravy` has no git connection and is abandoned.

## ⚠️ SPA ROUTING — DO NOT USE `_redirects`
CF Pages has "Pretty URLs" enabled by default, which rewrites `/index.html` → `/`.
This makes `/* /index.html 200` in `_redirects` an infinite loop — CF Pages explicitly
rejects it. We have confirmed this multiple times. **Do not add a `_redirects` file.**

SPA routing is handled by `404.html` (a copy of `index.html` produced by the build script:
`cp dist/index.html dist/404.html`). CF Pages serves `404.html` for any path that doesn't
match a static file, preserving the URL so React Router handles routing client-side.
The HTTP 404 status on SPA routes is expected and correct for this pattern.

## Session Protocol
- Update CLAUDE.md every ~30 minutes during active sessions with new findings:
  stack gotchas, file locations, config discoveries, what was just fixed/built/decided
- Do NOT follow deployment/routing advice from Claude.ai without reading actual repo files first
- Claude.ai has no filesystem access — it works from live bundle inspection and Supabase MCP only
- If Claude.ai and CLAUDE.md conflict on config (like `_redirects`), CLAUDE.md wins
- After each significant fix or build, note it here with the commit hash and what it addressed

### Recent significant commits
| Commit | What it fixed |
|--------|--------------|
| `540d6f8` / `e6f25bf` | **Brand assets** — new favicon + apple-touch-icon + social avatar (1024/512) + og image (1200×630), all cropped from the bartenders graphic (wordmark removed). `<link rel=icon>` added to index.html. |
| `8f4a8fb` / `7522833` | **Lovable removed** — dropped `lovable-tagger` (vite dev badge), deleted `bun.lock` + `.lovable/` + `docs/LOVABLE_PHASE2_PHASE3.md`, rewrote README, stripped Lovable URLs from Supabase auth allow-list. |
| `532263d` | **Printer portal + private print-files** — migration `20260713000002_printer_portal.sql` (printer_allowlist, `is_printer()`, storage RLS). `print-files` bucket set PRIVATE. `/printer` password-gated catalog (`src/pages/printer/*`). `printer-invite` edge fn (branded set-password email). stripe-webhook emits 1-yr signed URLs for print files. |
| `1720b93` | **DB security hardening** — migration `20260713000000_security_hardening.sql`: `analytics_daily_revenue`→security_invoker (was leaking revenue to anon); revoked `increment_loyalty_points`/`increment_discount_use` from anon/authenticated (privilege escalation); pinned search_path on 9 fns; `disputed` added to order-status constraint. |
| `645ba63` | **Print-file mapping complete** — added 5 slugs to stripe-webhook `PRINT_BASE` (lick_itself, shocker, logo_full_tag, tagline_without_logo, tea_please). All 27 products now resolve front prints for both colors. Back-logo black-box bug fixed (white-ink-on-transparent). |
| `5137b83` | **STRIPE WEBHOOK DIAGNOSTIC** — wrapped entire order-processing block (lines 193–487) in try-catch; logs full error + stack to `[stripe-webhook] PROCESSING ERROR`. Returns 200 even on error to stop Stripe retries. Deployed as v55. |
| `919fded` | **Fulfillment portal** — `src/pages/Fulfillment.tsx` (printer-facing order portal at `/fulfillment?t=<token>`); `supabase/functions/fulfillment-portal/index.ts` (HMAC-protected, verify_jwt:false, list/advance/note actions); `src/lib/orderStatus.ts` (canonical status constants); `src/lib/database.types.ts` updated (in_production/shipped/delivered added); `App.tsx` `/fulfillment` route added; `create-checkout` v39 adds `shipping_cents` to metadata; `stripe-webhook` loyalty default `?? false` + `action_links` HTML in printerVars; migration `20260705000002_fulfillment_portal.sql` applied |
| `e3631ce` | Reverted `decoding="sync"` on priority images — sync decoding blocks main thread; caused TBT spike 20ms → 107ms. All images use `decoding="async"` |
| `c772158` | Google Fonts CSS `@import` removed from `index.css`; consolidated into single `<link>` in `index.html` (eliminates render-blocking cascade delay). Added `priority` prop to ProductCard; first 3 cards get `loading="eager"` + `fetchPriority="high"` |
| `d44710a` | Logo CLS fix — `width="500"` `height="257"` on Navbar logo img. Shop sort select `aria-label="Sort products"` |
| `82fb6ff` | WebP image conversion — 80 product images + 5 UI images, 61MB → 7.3MB (88%). DB image URLs updated to .webp. ProductCard has `.webp`→`.png` onError fallback |
| `358a5cf` | QA accessibility/SEO/CLS fixes — MerchDrops SEO, carousel `inert` + 44×44px dot targets, Karen ticker CLS, heading order (Footer/Orders/CustomRequests `h4`→`p`) |

## ✅ ENV VARS — RESOLVED
`.env.production` is committed to the repo (not gitignored). It contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. This guarantees Vite bakes these into the CF Pages build. Do not move these to CF Pages "Secrets" — Secrets are runtime-only and not available at Vite build time.

## ⚠️ LOCAL DEV ENV VAR
The local `.env.local` file uses `VITE_SUPABASE_PUBLISHABLE_KEY`. The integrations client (`src/integrations/supabase/client.ts`) reads `VITE_SUPABASE_ANON_KEY`. These must match or local dev will have a broken Supabase connection. Remind Kristin to fix this if it hasn't been done.

## Branch Notes
- Active branch: `master`
- Old branch: `main` (should be deleted)
## Duplicate Repos (Safe to Delete)
Abandoned Lovable session repos with hash suffixes (pournogravy-6d00a2bf, pournogravy-95895ac2, pournogravy-c537ba60, pournogravy-c8c50645). Only `kmitch2087-dot/pournogravy` is the real repo.

---

## 🔁 SESSION START CHECKLIST — Do This Every Session
At the start of each new Cowork session on this project:

1. **Read** `docs/PROJECT_STATUS.md` — review current status, active tasks, blockers
2. **Check** for any open build issues or deployment failures
3. **Note** what changed since last session
4. **Check** if admin login is working (test at pournogravy.com/admin)
5. At the **end of every session**, update these docs:
   - `docs/PROJECT_STATUS.md` — update milestone status, completed tasks, new blockers
   - `docs/HANDOFF.md` — add any new services, schema changes, or architecture decisions
   - `docs/EXECUTIVE_SUMMARY.md` — update "Current Status" section if major features shipped

---

## Document Index (keep these current)
| File | Purpose | Update Frequency |
|------|---------|-----------------|
| `docs/EXECUTIVE_SUMMARY.md` | Client/investor-facing overview | When major features ship |
| `docs/USER_MANUAL.md` | Opie's reference guide for operating the site | When new features affect the admin/owner experience |
| `docs/HANDOFF.md` | Full technical dev handoff | Every session (add schema changes, new services, decisions) |
| `docs/PROJECT_STATUS.md` | Kristin's internal tracker | Every session |
| `docs/COST_ANALYSIS.md` | Market rate vs. actual cost | When scope changes significantly |
---

## Key Files to Know
- `src/data/products.ts` — ALL product data lives here (no DB sync yet). Add `published: true` to show in shop, `featured: true` for hero/featured row.
- `src/integrations/supabase/client.ts` — ✅ CANONICAL Supabase singleton. Use this everywhere. NOT `src/utils/supabase/client.ts` (dead code).
- `src/context/AuthContext.tsx` — Auth state with race condition FIX (setLoading(true) before fetchProfile). Do not regress this.
- `src/context/CartContext.tsx` — Cart state (guest + auth sessions)
- `src/lib/productSource.ts` — `useMergedProducts()` merges static + DB products. DB takes precedence by slug.
- `src/pages/admin/` — Admin dashboard pages (Login, Dashboard, Settings, ProductEdit)
- `src/components/admin/ProtectedRoute.tsx` — Checks loading → user → isAdmin. Must wait on loading.
- `supabase/migrations/` — All DB schema migrations (run in order)
- `supabase/functions/` — Edge functions: create-checkout, stripe-webhook, send-notification, verify-email
- `.env.production` — Committed. Contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

## Dead Code (Do Not Use, Should Be Deleted)
- `src/utils/supabase/` — Second Supabase client (SSR-based). Not used by anything. Delete this folder.
- `src/lib/fulfillment.ts` — Misleadingly named. Not called by any edge function. Delete this file.
- `wrangler.jsonc` — Duplicate of wrangler.toml. Delete this file.

## Supabase Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with is_admin flag |
| `admin_allowlist` | Allowlist of admin emails (kmitch2087@gmail.com, kristinmitchell@aethyx.space, aopie91@gmail.com) |
| `products` | DB products (currently shadowed by static `products.ts`) |
| `cart_items` | Guest (session_id) + auth (user_id) carts |
| `orders` | Order records — writes via service_role (Stripe webhook) |
| `order_items` | Line items per order |
| `custom_requests` | Custom garment inquiry form submissions |
| `settings` | Site config — MUST have row with id=1 for Admin Settings page to work |
| `email_templates` | Resend templates — MUST seed 'order_confirmation' and 'custom_request' rows |
| `printer_queue` | Fulfillment queue — written by stripe-webhook edge function |

## Supabase Edge Functions
| Function | Purpose | Required Secrets |
|----------|---------|-----------------|
| `create-checkout` | Stripe Checkout session creator; v39 adds `shipping_cents` to metadata | STRIPE_SECRET_KEY ✅ |
| `stripe-webhook` | Handles payment.completed, marks order paid, sends printer + customer emails, awards Pour Points. **v55** wraps post-payment processing in try-catch + logs `[stripe-webhook] PROCESSING ERROR`. | STRIPE_SECRET_KEY ✅, STRIPE_WEBHOOK_SIGNING_SECRET ✅, FULFILLMENT_SECRET ✅ |
| `send-notification` | Resend email dispatch with template system | RESEND_API_KEY ✅ |
| `verify-email` | Email validation (syntax, disposable, MX lookup) | None |
| `submit-tracking` | Printer submits tracking number via magic link (HMAC verified) | FULFILLMENT_SECRET ✅ |
| `fulfillment-portal` | **v2** Printer-facing portal — HMAC-protected (verify_jwt:false). Portal token = HMAC("fulfillment-portal", FULFILLMENT_SECRET). Actions: list (all orders), advance (status + status_history), note. GET advance returns branded HTML confirmation (email tap-to-advance). | FULFILLMENT_SECRET ✅ |

## Things Still Needing Configuration (Before Marketing)
1. ✅ Stripe secrets set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`
2. ✅ Resend API key set: `RESEND_API_KEY`
3. ✅ `FULFILLMENT_SECRET` set for printer tracking magic links
4. ⚠️ Verify `opie@pournogravy.com` as sender in Resend (DKIM/SPF done; move email off GoDaddy when ready)
5. ✅ Settings table seeded with id=1; fulfillment_provider='local_printer'; printer_email set
6. ✅ email_templates seeded: order_confirmation, printer_notification, custom_request
7. ✅ Supabase Storage `products` bucket created (public read)
8. ✅ Supabase Storage `print-files` bucket created; 74 PNGs uploading (black/ + white/)
9. ✅ CF email routing rule set — opie@pournogravy.com routes to pournogravy-receive-email Worker (done July 1, 2026)
10. ⚠️ Place test order to verify full fulfillment email flow

## 🚨 OPEN INCIDENT — Stripe Webhook 500 Errors (July 3, 2026)
Stripe reported 13 HTTP 500s from the webhook endpoint starting July 3, 2026 at 9:01 PM UTC. Two orders (`6ae0b971`, `11ae929e`) were marked "paid" in the DB but got NO printer_queue rows and NO emails sent. The webhook was throwing somewhere between the "paid" DB update and the `send-notification` calls — but the original code had no try-catch so there were zero logs.

**Fix applied (commit `5137b83`, stripe-webhook v55):** Wrapped the entire post-payment processing block in a try-catch that logs the full error + stack. Now returns HTTP 200 even on error (stops Stripe retries). The root cause is still unknown.

**What still needs to happen:**
1. **Check Supabase logs** → Edge Functions → stripe-webhook → Logs → search for `[stripe-webhook] PROCESSING ERROR`
2. **Read the error message** — identify the exact throw location
3. **Fix the root cause** — then redeploy
4. **Manually resend emails** for orders `6ae0b971` and `11ae929e` (both have no notification rows)

**Latent bug — ✅ FIXED July 13, 2026:** `chk_order_status` now includes `"disputed"` (migration `20260713000000_security_hardening.sql`).

## ⚠️ PRINT-FILES BUCKET IS PRIVATE (July 14, 2026)
`print-files` bucket is now **private** (`public=false`). Public object URLs return HTTP 400. Access paths:
- **Fulfillment:** stripe-webhook builds **1-year signed URLs** (`createSignedUrl`, 31536000s) for the printer email + CSV.
- **Printer portal:** authenticated printer (on `printer_allowlist`, `is_printer()`=true) reads via storage RLS + signed URLs at `/printer`.
- **Admin:** `is_admin` has storage RLS read; PrintFiles.tsx already uses signed URLs.
- Do NOT switch back to `getPublicUrl` for print-files — it will 404. Ink convention: `white/*_white.png`=white ink (dark shirts), `black/*_black.png`=black ink (light shirts). All 27 products mapped in stripe-webhook `PRINT_BASE`.

## Style Preferences
- Always look for the most credit-efficient approach
- Keep an eye out for missing best practices (edge functions, RLS gaps, performance) and flag proactively
- Do not mock databases in tests — use real Supabase connections
- Prefer editing existing files over creating new ones
- When flagging issues in the code, cross-reference with Kristin's curriculum so they can be incorporated into her learning

## Kristin's Learning Curriculum
A 3-day developer curriculum was created (April 29, 2026) and saved to:
`~/Desktop/PG_Dev_Curriculum/`

Files:
- `Day_1_How_The_Web_Works.md` — HTTP, DNS, Vite, env vars, how the black screen bug happened
- `Day_2_Auth_Database_Security.md` — JWTs, Supabase RLS, SECURITY DEFINER, the REVOKE bug, race conditions
- `Day_3_Payments_Email_Deployment.md` — Stripe Checkout flow, Edge Functions, Resend, Cloudflare Pages
- `Quiz.md` — 30-question quiz based on all three days

**When working with Kristin:** If you encounter a bug or concept covered in the curriculum, call it out and connect it to the relevant day/topic. This reinforces learning in context.

Topics covered:
- How HTTP and DNS work (why pournogravy.com resolves)
- What Vite does at build time vs. runtime (why env vars disappeared)
- How JWTs work (what the anon key actually is)
- What RLS is and how SECURITY DEFINER functions work
- What a race condition is (the auth loading bug)
- How Stripe Checkout Sessions work server-side
- What Edge Functions are and why they can't import frontend code
- How Cloudflare Pages builds and deploys

---

## Auth Architecture (Do Not Break)

### Why the spinner kept coming back (fixed permanently in bcb371f, 2026-05-06)

`onAuthStateChange(INITIAL_SESSION)` and `getSession()` raced against each other.
If `getSession()` resolved first (cleared `loading`), then `INITIAL_SESSION` fired late —
it re-set `loading=true` and could also call `setUser(null)` with a stale null session,
blocking admin access. This recurred after every deploy because timing shifted slightly.

### Correct pattern — DO NOT REGRESS

**Rule: `INITIAL_SESSION` is NEVER handled in `onAuthStateChange`. `getSession()` is the only init path.**

**Rule (added 2026-05-22 — DO NOT REGRESS): Only ONE `getSession()` call is allowed in the entire frontend codebase — in `AuthContext.tsx`. `CartContext`, `WishlistContext`, and every other context/hook must use `onAuthStateChange` with `INITIAL_SESSION` handled to get the initial auth state. Multiple concurrent `getSession()` calls contend for the Supabase JS v2 Web Lock and cause the spinner/login bug. This was the root cause of 5+ sessions of failed auth fixes.**

```typescript
// onAuthStateChange: post-init events ONLY
supabase.auth.onAuthStateChange((event, newSession) => {
  if (event === 'INITIAL_SESSION') return;  // ← CRITICAL — never handle this here

  setSession(newSession);
  setUser(newSession?.user ?? null);

  if (event === 'SIGNED_IN' && newSession?.user) {
    setLoading(true);
    fetchProfile(newSession.user.id);
  } else if (event === 'SIGNED_OUT') {
    setProfile(null);
    setLoading(false);
  }
  // TOKEN_REFRESHED: update session/user, no spinner
});

// getSession(): single authoritative init path
supabase.auth.getSession().then(({ data: { session: existing } }) => {
  setSession(existing);
  setUser(existing?.user ?? null);
  if (existing?.user) {
    fetchProfile(existing.user.id); // loading stays true; fetchProfile clears it in finally
  } else {
    setLoading(false);
  }
});

// Hard failsafe: loading can NEVER stay true longer than 8 seconds
const failsafe = setTimeout(() => setLoading(false), 8000);
```

`fetchProfile` also has its own 6-second timeout and always calls `setLoading(false)` in `finally`.

ProtectedRoute must check: `if (loading) return <spinner>` BEFORE checking `isAdmin`.
