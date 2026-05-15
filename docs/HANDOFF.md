# Pournogravy — Full Developer Handoff
**Prepared by:** Kristin Mitchell — Aethyx  
**Last Updated:** May 14, 2026  
**For:** Any developer (or Claude session) picking up this project

---

> A developer with React/TypeScript/Supabase experience should be able to clone this repo and be fully productive within 30 minutes using this document. Claude Desktop sessions: read this file + CLAUDE.md to get full context.

---

## Table of Contents
1. [Repository & Access](#1-repository--access)
2. [Tech Stack at a Glance](#2-tech-stack-at-a-glance)
3. [Local Dev Setup](#3-local-dev-setup)
4. [Project Structure](#4-project-structure)
5. [Key Architectural Decisions](#5-key-architectural-decisions)
6. [Database Schema](#6-database-schema)
7. [Supabase Edge Functions](#7-supabase-edge-functions)
8. [Third-Party Services](#8-third-party-services)
9. [Deployment](#9-deployment)
10. [Current Status & Backlog](#10-current-status--backlog)
11. [Change Log](#11-change-log)

---

## 1. Repository & Access

| Resource | Location |
|----------|---------|
| GitHub repo | `github.com/kmitch2087-dot/pournogravy` (Public, **master** branch) |
| Live site | `pournogravy.com` |
| Cloudflare Pages | `dash.cloudflare.com` — project: **`pournogravydev`** (NOT `pournogravy`) |
| Supabase project | `supabase.com` — project: Pournogravy (ID: `emtjkawcmsfgjyimnncf`) |
| Lovable project | `pournogravy.lovable.app` |
| Domain registrar | Cloudflare (pournogravy.com DNS managed there) |

**Active branch:** `master` (GitHub default — Lovable syncs here)  
**Deprecated:** `main` branch (should be deleted — all work is on master)

⚠️ **CF Pages:** Two projects exist — `pournogravydev` (active, GitHub-connected) and `pournogravy` (abandoned, no git). Always use `pournogravydev`.

**Admin allowlist (3 admins):** `kmitch2087@gmail.com`, `kristinmitchell@aethyx.space`, `aopie91@gmail.com`

---

## 2. Tech Stack at a Glance

```
Frontend:    React 18 + TypeScript + Vite 5 + Tailwind CSS + shadcn/ui + Framer Motion
Backend:     Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Payments:    Stripe (embedded Payment Element — PaymentIntents, NOT Checkout Sessions)
Email:       Resend (send-notification edge function + template system)
Hosting:     Cloudflare Pages (global CDN, project: pournogravydev)
CI/CD:       GitHub master → Cloudflare Pages (auto-deploy on push)
AI builder:  Lovable (bidirectional GitHub sync to master)
Testing:     Vitest
Package mgr: npm
```

---

## 3. Local Dev Setup

```bash
git clone https://github.com/kmitch2087-dot/pournogravy.git
cd pournogravy
git checkout master
npm install

# .env.local (gitignored) — use EXACTLY this key name:
# VITE_SUPABASE_URL=https://emtjkawcmsfgjyimnncf.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon key from Supabase project settings>
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

npm run dev   # → http://localhost:8080
```

⚠️ **Env var gotcha:** `.env.local` must use `VITE_SUPABASE_ANON_KEY` — NOT `VITE_SUPABASE_PUBLISHABLE_KEY`. The integrations client reads `ANON_KEY`.

| Script | What It Does |
|--------|-------------|
| `npm run dev` | Vite dev server (localhost:8080, HMR) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint |
| `npm run test` | Vitest once |
| `npm run test:watch` | Vitest watch mode |

---

## 4. Project Structure

```
src/
├── pages/
│   ├── Index.tsx              # Homepage — hero carousel, featured products, rotating quotes
│   ├── Shop.tsx               # Full catalog with sort/filter
│   ├── ProductDetail.tsx      # Product page (variants, colors, gallery, reviews, cart)
│   ├── Collections.tsx        # Curated product groupings
│   ├── About.tsx
│   ├── Contact.tsx
│   ├── FAQ.tsx
│   ├── Checkout.tsx           # Embedded Stripe Payment Element
│   ├── CheckoutReturn.tsx     # Post-payment confirmation screen
│   ├── Account.tsx            # Auth user account page
│   ├── Login.tsx              # Customer login
│   ├── Proposal.tsx           # Founding Client Offer / partnership pitch
│   ├── NotFound.tsx           # 404
│   └── admin/
│       ├── AdminLogin.tsx     # Admin login form
│       ├── Dashboard.tsx      # Orders/requests/stats overview
│       ├── Products.tsx       # Product list
│       ├── ProductEdit.tsx    # Product image upload (Supabase Storage)
│       ├── Orders.tsx         # Orders with status management
│       ├── CustomRequests.tsx # Garment inquiry queue
│       ├── Reviews.tsx        # Review approval queue
│       ├── MerchDrops.tsx     # Drop calendar + builder + ad placement
│       ├── EditRequests.tsx   # Split-view notes (Opie left / Kristin right)
│       ├── ProjectStatus.tsx  # 6-phase pipeline, stat cards, session log
│       ├── Inbox.tsx          # Admin inbox/messages
│       ├── Analytics.tsx      # Site analytics dashboard
│       ├── UserManual.tsx     # Full operational guide for Opie
│       └── Settings.tsx       # Site config (requires settings row id=1)
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── CartDrawer.tsx         # Right slide-out, discount code field, guest + auth
│   ├── ProductCard.tsx
│   ├── CustomGarmentRequestModal.tsx
│   └── admin/
│       ├── ProtectedRoute.tsx # loading → user → isAdmin guard
│       └── AdminLayout.tsx    # Admin nav shell with mobile sidebar
├── context/
│   ├── AuthContext.tsx        # Auth state — race condition fixed (see §5)
│   └── CartContext.tsx        # Hybrid guest (session_id) + auth (user_id) cart
├── data/
│   └── products.ts            # Static product data (DB takes precedence via useMergedProducts)
├── lib/
│   ├── utils.ts               # shadcn cn() helper
│   └── productSource.ts       # useMergedProducts() — merges static + DB (DB wins by slug)
├── integrations/
│   └── supabase/
│       ├── client.ts          # ✅ CANONICAL singleton — import this everywhere
│       └── types.ts           # Auto-generated types (do not hand-edit)
├── App.tsx                    # React Router v6 — ALL non-critical routes lazy-loaded
└── main.tsx                   # Entry — wraps App in ThemeProvider

supabase/
├── migrations/                # All SQL migrations (apply in order)
└── functions/                 # Edge functions (Deno) — deploy via Supabase CLI
    ├── create-checkout/       # Creates Stripe PaymentIntent
    ├── stripe-webhook/        # Handles payment_intent.succeeded
    ├── send-notification/     # Resend email with template substitution
    ├── send-reply/            # Admin reply to edit requests (email)
    ├── verify-email/          # Public email validation (syntax + MX)
    ├── validate-discount/     # Validates promo codes against cart total
    ├── admin-contact/         # Opie → Kristin direct message (admin only)
    ├── notify-project-status/ # Sends project update email to Opie (rate-limited 1/day)
    ├── process-merch-drops/   # Cron — auto-publishes drops, sends pre-shift email
    ├── receive-email/         # Handles inbound email routing (Cloudflare Email Worker)
    └── track-event/           # Analytics event ingestion
```

---

## 5. Key Architectural Decisions

### SPA Routing — DO NOT ADD `_redirects`
CF Pages has "Pretty URLs" enabled. `/* /index.html 200` in `_redirects` creates an infinite redirect loop. **SPA routing is handled by `wrangler.toml`:** `not_found_handling = "single-page-application"`. This serves any unmatched path as `index.html` at HTTP 200. Do not change this pattern.

### Why `.env.production` is Committed
Vite bakes `import.meta.env.VITE_*` at build time. CF Pages Dashboard Secrets are runtime-only — not available during `vite build`. `.env.production` contains the public Supabase URL and anon key (safe to commit — not service_role). This guarantees they are baked into the bundle during CF Pages CI.

### Auth Race Condition — Fixed (commit bcb371f) — DO NOT REGRESS
`INITIAL_SESSION` from `onAuthStateChange` raced against `getSession()`. Fix: **`INITIAL_SESSION` is never handled in `onAuthStateChange`**. `getSession()` is the sole init path.

```typescript
supabase.auth.onAuthStateChange((event, newSession) => {
  if (event === 'INITIAL_SESSION') return;  // CRITICAL — never handle here
  // handle SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED only
});

// Sole init path:
supabase.auth.getSession().then(({ data: { session } }) => { /* init */ });
```

`ProtectedRoute` must check `loading` BEFORE `isAdmin`. Hard failsafe: `setTimeout(() => setLoading(false), 8000)`.

### Stripe — Embedded Payment Element (NOT Checkout Sessions)
Flow: CartDrawer → `create-checkout` edge function → returns `clientSecret` (PaymentIntent) → `/checkout` renders Stripe Payment Element on-site → `/checkout/return` clears cart + shows confirmation.

**Webhook secret name in Supabase:** `STRIPE_WEBHOOK_SIGNING_SECRET` (NOT `STRIPE_WEBHOOK_SECRET`)

### Products — Static + DB Merge
All product data starts in `src/data/products.ts`. `useMergedProducts()` merges static + DB — DB entries win by slug. DB was seeded with all 24 products (migration `20260504000003`). Admin product editor is built (`/admin/products`, `/admin/products/:id`).

### Lazy Loading — All Non-Critical Routes
`App.tsx` lazy-loads all 28 admin + secondary pages via `React.lazy()` + Suspense. Only the public homepage routes are eagerly loaded. Bundle target < 500KB gzipped.

### Apollo Chrome Extension — Known Interference
The Apollo Chrome extension blocks `/rest/v1/profiles` requests. This causes `fetchProfile` timeouts on affected machines. `fetchProfile` timeout is set to 12 seconds (not the default 5) to defend against this. Do not reduce it.

### Canonical Supabase Client
`src/integrations/supabase/client.ts` — use this everywhere. A dead second client in `src/utils/supabase/` was deleted.

---

## 6. Database Schema

### Tables Summary
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with `is_admin` flag |
| `admin_allowlist` | 3 admin emails; `handle_new_user` trigger checks this |
| `products` | DB products (24 seeded; merged with static via `useMergedProducts`) |
| `cart_items` | Guest (session_id) + auth (user_id) carts |
| `orders` | Order records — written via service_role (Stripe webhook) |
| `order_items` | Line items per order |
| `custom_requests` | Custom garment inquiry form submissions |
| `product_reviews` | Customer reviews — admin approval queue |
| `discount_codes` | Promo codes — admin-managed, validated server-side |
| `settings` | Site config — **MUST have row with id=1** |
| `email_templates` | Resend templates — seeded with order_confirmation, custom_request, client_edit_request |
| `printer_queue` | Fulfillment queue — written by stripe-webhook |
| `inbox_messages` | Admin inbox for internal messages |
| `merch_drops` | Scheduled drop calendar — date, products, ads, flyers, marketing email |
| `edit_requests` | Client edit notes (Opie) + Kristin replies — threaded, mark-done, archive |
| `analytics_events` | Client-side event tracking (page views, add to cart, etc.) |

### Key Schema Details

**`products`**
```sql
id, slug (unique), name, description, price_cents, currency, image_url,
inventory_count, is_active, status ('draft'|'published'|'archived'), created_at, updated_at
```

**`orders`**
```sql
id, user_id, email, status ('pending'|'paid'|'fulfilled'|'cancelled'|'refunded'),
subtotal_cents, tax_cents, shipping_cents, total_cents,
payment_intent_id, shipping_name, shipping_address (jsonb), created_at, updated_at
```

**`discount_codes`**
```sql
id, code (unique), type ('percentage'|'fixed'), value, min_order_cents,
max_uses, use_count, is_active, expires_at, created_at
```

**`merch_drops`**
```sql
id, name, description, drop_date, ad_launch_date, product_ids (uuid[]),
flyer_url, tags (text[]), show_announcement_bar, show_hero_banner,
show_shop_banner, email_subject, email_body, status, created_at
```

### RLS Summary
| Table | Anon | Auth | Admin/Service |
|-------|------|------|--------------|
| profiles | ❌ | own only | admin read all |
| products | ✅ active | ✅ | full |
| cart_items | own (session) | own | full |
| orders | ❌ | own | service_role write |
| custom_requests | write only | ✅ | full |
| product_reviews | ✅ approved | own | full |
| discount_codes | ❌ | ❌ | full |
| settings | ✅ | ✅ | admin write |
| merch_drops | ✅ | ✅ | admin write |
| edit_requests | ❌ | ❌ | admin full |
| analytics_events | write | write | read |

---

## 7. Supabase Edge Functions

Deploy: `supabase functions deploy <name>`  
All functions live in `supabase/functions/`.

| Function | Purpose | Required Secrets |
|----------|---------|-----------------|
| `create-checkout` | Creates Stripe PaymentIntent, validates prices server-side | `STRIPE_SECRET_KEY` |
| `stripe-webhook` | Handles `payment_intent.succeeded` — marks order paid, queues printer | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET` |
| `send-notification` | Resend email dispatch with `{{variable}}` template substitution | `RESEND_API_KEY` |
| `send-reply` | Admin reply to edit_requests via email | `RESEND_API_KEY` |
| `verify-email` | Public — syntax, disposable blocklist, MX lookup (Cloudflare DNS) | None |
| `validate-discount` | Validates promo codes against cart total, returns discount amount | None |
| `admin-contact` | Opie → Kristin message from admin dashboard | `RESEND_API_KEY` |
| `notify-project-status` | Sends project update email to Opie, 1/day rate limit | `RESEND_API_KEY` |
| `process-merch-drops` | Cron — auto-publishes scheduled drops, sends pre-shift email | `RESEND_API_KEY` |
| `receive-email` | Handles inbound email from Cloudflare Email Worker routing | None |
| `track-event` | Ingests analytics events into `analytics_events` table | None |

### Required Secrets (all confirmed set in Supabase):
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SIGNING_SECRET
RESEND_API_KEY
```

---

## 8. Third-Party Services

| Service | Status | Notes |
|---------|--------|-------|
| **Supabase** | ✅ Active | DB, Auth, Edge Functions, Storage |
| **Cloudflare Pages** | ✅ Active | `pournogravydev` project, auto-deploys on master push |
| **Cloudflare DNS** | ✅ Active | `pournogravy.com` — DNS managed here |
| **Stripe** | ✅ Live payments active | `pk_live_*` + `sk_live_*` in use |
| **Resend** | ✅ Secrets set | `opie@pournogravy.com` sender domain — verify status in Resend dashboard |
| **GitHub** | ✅ Active | `kmitch2087-dot/pournogravy`, master branch |
| **Lovable** | ✅ Active | Syncs to GitHub master bidirectionally |
| **Fulfillment partner** | ❌ Not selected | Printful or Printify — must wire API key into stripe-webhook |
| **Cloudflare Email Worker** | ⚠️ Exists, no route | `wild-mouse-2b64` worker exists with no routing rule — needs a catch-all or specific route to `receive-email` edge function |

### Environment Variables
```bash
# .env.production (committed — baked by Vite at build time):
VITE_SUPABASE_URL=https://emtjkawcmsfgjyimnncf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# .env.local (gitignored — for local dev):
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...   ← must be ANON_KEY, not PUBLISHABLE_KEY
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Supabase Edge Function Secrets (NOT in any .env file):
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SIGNING_SECRET
RESEND_API_KEY
```

---

## 9. Deployment

### Auto Deploy (Normal)
Push to `master` → CF Pages `pournogravydev` detects → runs `npm run build` → deploys `dist/` → live in ~2 minutes.

### Manual Deploy
CF Pages dashboard → pournogravydev → Deployments → Retry deployment.

### Rollback
CF Pages → Deployments → any prior success → Rollback. Zero downtime.

### CF Pages Build Settings
| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 18+ |

---

## 10. Current Status & Backlog

**Site is LIVE. Real Stripe payments active. All core features built.**

### ❌ Before Marketing Push (external/manual tasks)
1. Select fulfillment partner (Printful or Printify), wire API key into `stripe-webhook` edge function
2. Verify `opie@pournogravy.com` as sender domain in Resend dashboard
3. Wire Cloudflare Email Worker `wild-mouse-2b64` — create routing rule → `receive-email` edge function
4. Wire `process-merch-drops` to a Supabase cron schedule

### 🟡 Code Housekeeping
- Delete `main` branch from GitHub (deprecated, use master)
- Delete 4 orphan Lovable repos from GitHub (`pournogravy-6d00a2bf`, `-95895ac2`, `-c537ba60`, `-c8c50645`)
- `npm audit fix` (some vulnerabilities remain)

### 🟢 Phase 3 Features (when ready)
- Cart merge on login (guest → auth)
- Email marketing integration (Klaviyo or Mailchimp)
- Product search + filter
- Wishlist / Save for later
- Pour Points loyalty program
- Bundle size continued optimization

---

## 11. Change Log

| Date | Change |
|------|--------|
| April 2026 | Initial schema, products, cart, custom requests, admin dashboard (Lovable + Aethyx) |
| April 2026 | Stripe edge functions, email edge functions, auth, Cloudflare deployment |
| April 28, 2026 | CLAUDE.md + full docs suite created |
| April 29, 2026 | Fixed black screen (.env.production committed) |
| April 29, 2026 | Fixed AuthContext race condition (INITIAL_SESSION never handled in onAuthStateChange) |
| April 29, 2026 | Fixed admin REVOKE bug (GRANT EXECUTE on is_admin()) |
| April 29, 2026 | Full code audit — documented bugs, dead code, missing infra |
| May 4, 2026 | Stripe embedded Payment Element (replaced hosted Checkout Session redirect) |
| May 4, 2026 | Seeded products table (24 products) — checkout was failing on empty DB |
| May 4, 2026 | All edge functions deployed; all secrets confirmed in Supabase |
| May 4, 2026 | Product reviews + discount codes tables + edge functions |
| May 4, 2026 | **Real payments live on pournogravy.com** |
| May 5, 2026 | Hero mobile fix (object-contain), navbar clearance |
| May 5, 2026 | User Manual integrated into admin dashboard (/admin/manual) |
| May 5, 2026 | HelpPanel (? button in admin header) + ContactKristinModal |
| May 5, 2026 | `admin-contact` edge function (Opie → Kristin email) |
| May 5, 2026 | Project Status admin page with Notify Opie button |
| May 6, 2026 | Full Merch Drop Calendar system — builder, ad placement, site-wide ad components |
| May 6, 2026 | `process-merch-drops` edge function (cron auto-publish + pre-shift email) |
| May 6, 2026 | Fulfillment routing settings in admin |
| May 9, 2026 | Diagnosed Apollo Chrome extension as fetchProfile timeout root cause |
| May 9, 2026 | Bumped fetchProfile timeout to 12s |
| May 9, 2026 | Stripped all debug console.log/warn from AuthContext |
| May 9, 2026 | Deleted dead code: `src/lib/fulfillment.ts`, `wrangler.jsonc` |
| May 9, 2026 | Lazy-loaded all 28 non-critical routes via React.lazy() + Suspense |
| May 9, 2026 | Homepage redesign (Opie's 8 client notes: headline, hero, marquee, quotes) |
| May 9, 2026 | Rebuilt EditRequests as split-view with mark-done, archive, reply threads |
| May 9, 2026 | Rebuilt ProjectStatus: stat cards, 6-phase pipeline, 5 tabs, 7 priority items |
| May 9, 2026 | Seeded Opie's 8 client notes into DB (migration 20260509000001) |
| May 11, 2026 | Analytics system — `analytics_events` table + `track-event` edge function + Analytics admin page |

---

*Maintained by Aethyx. Update this file at the end of each session.*
