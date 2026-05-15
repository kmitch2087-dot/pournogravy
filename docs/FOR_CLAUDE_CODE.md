# Pournogravy — Claude Briefing Document
**Use this file to onboard any Claude session (Desktop, Code, or Cowork) on this project.**  
**Last Updated:** May 14, 2026

---

## What This Project Is

**pournogravy.com** — a real, live e-commerce site for Adam "Opie" Oppenheimer's bartender-themed apparel brand. Built and managed by Kristin Mitchell (Aethyx). Real customers, real Stripe payments, real orders. Not a demo.

- **Repo:** github.com/kmitch2087-dot/pournogravy (master branch)
- **Cloudflare Pages project:** `pournogravydev` (NOT `pournogravy`)
- **Supabase project ID:** `emtjkawcmsfgjyimnncf`
- **Admin allowlist:** kmitch2087@gmail.com, kristinmitchell@aethyx.space, aopie91@gmail.com (Opie)

---

## Current Status (May 14, 2026)

**The site is fully built and live with real payments.** This is NOT in early development.

### What IS Built
- Full public storefront (shop, product pages, cart, checkout, collections, about, contact, FAQ)
- Embedded Stripe Payment Element (PaymentIntents — NOT hosted Checkout Sessions)
- Supabase auth with admin vs. customer role separation
- Full admin dashboard with 14 pages:
  - Dashboard, Products, Orders, Custom Requests, Reviews
  - Merch Drops calendar (schedule drops with ad placement, flyers, marketing emails)
  - Edit Requests (split-view client notes with reply threads)
  - Project Status (6-phase pipeline, stat cards, Notify Opie email)
  - Inbox, Analytics, User Manual, Settings
- 11 Supabase Edge Functions (all deployed, all secrets set):
  `create-checkout`, `stripe-webhook`, `send-notification`, `send-reply`,
  `verify-email`, `validate-discount`, `admin-contact`, `notify-project-status`,
  `process-merch-drops`, `receive-email`, `track-event`
- 17 database tables with full RLS
- Analytics event tracking
- Discount codes system
- Product reviews with admin approval
- Lazy-loaded routes (28 components via React.lazy)

### What Is NOT Done Yet (before marketing)
1. Fulfillment partner selection (Printful or Printify) — must wire API key into stripe-webhook
2. Resend sender domain verification for opie@pournogravy.com
3. Cloudflare Email Worker `wild-mouse-2b64` needs a routing rule → receive-email edge function
4. process-merch-drops needs to be wired to a Supabase cron schedule

---

## Tech Stack

```
Frontend:   React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
Backend:    Supabase (PostgreSQL + Auth + Edge Functions + Storage)
Payments:   Stripe (embedded PaymentIntent flow)
Email:      Resend
Hosting:    Cloudflare Pages (auto-deploy on push to master)
```

---

## Critical Architecture — Do Not Break

### SPA Routing
`wrangler.toml` handles SPA routing: `not_found_handling = "single-page-application"`.  
**DO NOT add a `_redirects` file** — CF Pages Pretty URLs make `/* /index.html 200` an infinite redirect loop. This has been confirmed multiple times.

### Auth Race Condition Fix (commit bcb371f)
`INITIAL_SESSION` is **NEVER** handled in `onAuthStateChange`. `getSession()` is the sole init path. ProtectedRoute must check `loading` before `isAdmin`. fetchProfile timeout = 12s (Apollo Chrome extension blocks /rest/v1/profiles on some machines).

### Stripe Flow
PaymentIntent (NOT Checkout Sessions). Webhook secret key name in Supabase = `STRIPE_WEBHOOK_SIGNING_SECRET`.

### Env Vars
`.env.production` is committed to the repo — Vite needs public keys at build time and CF Pages Secrets are runtime-only. This is intentional.

### Supabase Client
Only `src/integrations/supabase/client.ts`. A dead second client in `src/utils/supabase/` was deleted.

---

## Key Files

| File | What It Is |
|------|-----------|
| `CLAUDE.md` | Full project instructions for Claude Code — read this |
| `docs/HANDOFF.md` | Complete technical handoff (updated May 14) |
| `docs/PROJECT_STATUS.md` | Session log, backlog, completed features |
| `src/context/AuthContext.tsx` | Auth — race condition fix lives here, do not regress |
| `src/App.tsx` | Router — all 28 non-critical routes lazy-loaded |
| `src/data/products.ts` | Static product data (merged with DB via useMergedProducts) |
| `src/integrations/supabase/client.ts` | Canonical Supabase singleton |
| `supabase/functions/` | All 11 edge functions |
| `supabase/migrations/` | All DB migrations (last: 20260511000001_analytics_events.sql) |

---

## Pending Claude Code / Cowork Notes

### ⚠️ Cloudflare Email Worker — Needs Investigation
A Cloudflare Email Worker named `wild-mouse-2b64` exists in the account but has no routing rule.
- It handles inbound email to @pournogravy.com
- No routing rule = no emails arrive
- The `receive-email` edge function is built and deployed
- Next step: create a routing rule in CF Email Routing → point catch-all → this worker → forward to receive-email

---

*To get full project context in any Claude session: read this file + `CLAUDE.md` + `docs/PROJECT_STATUS.md`.*
