# Pournogravy — Full Developer Handoff
**Prepared by:** Kristin Mitchell — Aethyx
**Last Updated:** April 29, 2026
**For:** Any developer picking up this project

---

> A developer with React/TypeScript/Supabase experience should be able to clone this repo and be fully productive within 30 minutes using this document.

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
10. [Feature Flags & Product Visibility](#10-feature-flags--product-visibility)
11. [Known Issues & Tech Debt](#11-known-issues--tech-debt)
12. [What's Not Built Yet](#12-whats-not-built-yet)
13. [Change Log](#13-change-log)

---

## 1. Repository & Access

| Resource | Location |
|----------|---------|
| GitHub repo | `github.com/kmitch2087-dot/pournogravy` (Public, master branch) |
| Live site | `pournogravy.com` |
| Cloudflare Pages dashboard | `dash.cloudflare.com` — project name: **`pournogravydev`** (NOT `pournogravy`) |
| Supabase project | `supabase.com` — project: Pournogravy |
| Lovable project | `pournogravy.lovable.app` |
| Domain registrar | Cloudflare (pournogravy.com DNS managed there) |

**Active branch:** `master` (GitHub default — Lovable syncs to this)
**Deprecated branch:** `main` (should be deleted — all work is on master)

⚠️ **CF Pages project note:** There are two CF Pages projects: `pournogravydev` (active, has GitHub connection, deploys on push) and `pournogravy` (abandoned, no git connection). Always work in `pournogravydev`.

### Duplicate Repos (Safe to Delete)
Lovable created these as isolated session repos — they are not connected to production:
- `kmitch2087-dot/pournogravy-6d00a2bf`
- `kmitch2087-dot/pournogravy-95895ac2`
- `kmitch2087-dot/pournogravy-c537ba60`
- `kmitch2087-dot/pournogravy-c8c50645`

---

## 2. Tech Stack at a Glance

```
Frontend:   React 18 + TypeScript + Vite 5 + Tailwind CSS + shadcn/ui + Framer Motion
Backend:    Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Payments:   Stripe (Checkout Sessions + Webhooks — edge functions built, secrets pending)
Email:      Resend (wired into send-notification edge function — API key pending)
Hosting:    Cloudflare Pages (global CDN, project: pournogravydev)
CI/CD:      GitHub master → Cloudflare Pages (auto-deploy on push)
AI builder: Lovable (bidirectional GitHub sync)
Testing:    Vitest
Package mgr: npm (bun.lock also present — either works)
```

---

## 3. Local Dev Setup

```bash
# Clone
git clone https://github.com/kmitch2087-dot/pournogravy.git
cd pournogravy
git checkout master

# Install deps
npm install

# Set up env vars
cp .env.example .env.local
# Edit .env.local — use EXACTLY this key name (not PUBLISHABLE_KEY):
# VITE_SUPABASE_URL=https://emtjkawcmsfgjyimnncf.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon key from Supabase project settings>

# Start dev server
npm run dev
# → http://localhost:8080
```

### ⚠️ Common Local Dev Gotcha
The `.env.local` that may exist on your machine uses `VITE_SUPABASE_PUBLISHABLE_KEY`. The integrations Supabase client (`src/integrations/supabase/client.ts`) reads `VITE_SUPABASE_ANON_KEY`. These must match or local dev will have a broken Supabase connection. Always use `VITE_SUPABASE_ANON_KEY`.

### Available Scripts
| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start Vite dev server (localhost:8080, HMR enabled) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint check |
| `npm run test` | Run Vitest test suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run download-images` | Node script to pull product images from Shopify CDN |

### ⚠️ Cloudflare Pages Build Command
The Cloudflare Pages project **must** have:
- **Build command:** `npm run build`
- **Build output directory:** `dist`

If set to `vite`, the deployment hangs and fails silently.

---

## 4. Project Structure

```
pournogravy/
├── src/
│   ├── pages/
│   │   ├── Index.tsx           # Homepage — hero carousel, featured products, email capture
│   │   ├── Shop.tsx            # Full product catalog
│   │   ├── ProductDetail.tsx   # Individual product page (variants, colors, cart)
│   │   ├── Collections.tsx     # Curated product groupings
│   │   ├── About.tsx           # Brand story
│   │   ├── Contact.tsx         # Contact form
│   │   ├── FAQ.tsx             # FAQ accordion
│   │   ├── Proposal.tsx        # (Internal) project proposal page
│   │   ├── NotFound.tsx        # 404
│   │   └── admin/
│   │       ├── Login.tsx       # Admin login form
│   │       ├── Dashboard.tsx   # Orders, custom requests, product counts
│   │       ├── Settings.tsx    # Site settings (requires settings row id=1 in DB)
│   │       └── ProductEdit.tsx # Product image upload (requires Supabase Storage bucket)
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CustomGarmentRequestModal.tsx
│   │   ├── NavLink.tsx
│   │   ├── admin/
│   │   │   ├── ProtectedRoute.tsx   # Checks loading → user → isAdmin
│   │   │   └── AdminLayout.tsx      # Admin nav shell
│   │   └── ui/                      # shadcn/ui (auto-generated, don't hand-edit)
│   ├── context/
│   │   ├── AuthContext.tsx     # Auth state + profile fetch + isAdmin
│   │   └── CartContext.tsx     # Cart state — guest (session_id) + auth (user_id)
│   ├── data/
│   │   └── products.ts         # ⭐ Static product data (source of truth until admin UI ships)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── utils.ts            # shadcn cn() helper
│   │   ├── productSource.ts    # useMergedProducts() — merges static + DB (DB wins by slug)
│   │   └── fulfillment.ts      # ⚠️ DEAD CODE — misleadingly named, not called by edge functions
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts       # ✅ Canonical Supabase singleton — use this everywhere
│   ├── utils/
│   │   └── supabase/           # ⚠️ DEAD CODE — second Supabase client (SSR-based), not used anywhere
│   │       ├── client.ts       # Should be deleted
│   │       └── env.ts          # Should be deleted
│   ├── App.tsx                 # Router setup (React Router v6)
│   ├── App.css
│   ├── index.css               # Tailwind directives + CSS custom properties
│   └── main.tsx                # Entry point — ThemeProvider wraps App here
├── public/
│   └── products/               # Product images (PNG) — served as static files
├── supabase/
│   ├── migrations/             # SQL migrations (run in order)
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_custom_requests.sql
│   │   └── [timestamp]_*.sql   # Additional migrations from Lovable sessions
│   └── functions/
│       ├── create-checkout/    # Stripe Checkout session creator
│       ├── stripe-webhook/     # Handles checkout.session.completed
│       ├── send-notification/  # Resend email dispatch with template system
│       └── verify-email/       # Public email validation endpoint
├── scripts/
│   └── download-shopify-images.mjs
├── .env.production             # ✅ Committed — bakes Supabase vars into CF Pages builds
├── .env.example                # Template for local dev
├── wrangler.toml               # SPA routing (not_found_handling = single-page-application)
├── wrangler.jsonc              # ⚠️ DUPLICATE — should be deleted
├── vite.config.ts
├── tailwind.config.ts
├── components.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 5. Key Architectural Decisions

### Products are static (not DB-driven yet)
All product data lives in `src/data/products.ts`. The Supabase `products` table exists. `useMergedProducts()` in `productSource.ts` merges them — DB entries win by slug. Public pages should use `useMergedProducts()`. CartContext currently only hydrates from the static file.

**Implication:** Adding products requires a code deploy unless admin UI is built. The `products` table and merge hook are ready; just need the admin product editor wired to DB writes.

### Why `.env.production` is committed
Vite bakes `import.meta.env.VITE_*` at build time. If the var isn't in `process.env` when `vite build` runs, it bakes as `undefined`. CF Pages injects dashboard vars, but Secrets are runtime-only (not available at build time). `.env.local` and `.env` are gitignored. `.env.production` is NOT gitignored and Vite always reads it for production builds — this guarantees the Supabase URL and anon key are present. The values are safe public client-side keys (anon key, not service_role key).

### Auth flow
`AuthContext` → `onAuthStateChange` fires → sets `loading = true` → calls `fetchProfile(userId)` → on resolve, sets profile + `loading = false`. `ProtectedRoute` checks: loading spinner → no user → not admin → render children. The `loading = true` before `fetchProfile` is critical — without it, `ProtectedRoute` evaluates `isAdmin` against an unfetched profile.

### Cart is hybrid (guest + auth)
Guest cart keyed by `session_id` UUID in localStorage. Auth cart keyed by `user_id`. Merging on login is partially implemented but not fully tested. Do not force login before adding to cart — kills conversion.

### Two Supabase clients exist (known tech debt)
- `src/integrations/supabase/client.ts` — correct singleton, used by auth + data + edge function calls
- `src/utils/supabase/client.ts` — dead SSR-based client, not imported by anything. Delete it.

Always use the integrations client.

### Lovable bidirectional sync
Lovable reads/writes to GitHub `master` branch. If you make local changes, push to `master` first. If Lovable made changes, `git pull` before editing locally. Lovable only previews the GitHub default branch — keep `master` as default in GitHub settings.

**Safe push workflow (Lovable → Production):**
See `docs/LOVABLE_PHASE2_PHASE3.md` for the full safe execution guide.

---

## 6. Database Schema

### `profiles`
```sql
id           uuid PK → auth.users.id
email        text
display_name text
is_admin     boolean DEFAULT false
created_at   timestamptz
updated_at   timestamptz
```
> `is_admin` is set by the `handle_new_user` trigger by consulting `admin_allowlist`.

### `admin_allowlist`
```sql
id         serial PK
email      text UNIQUE NOT NULL
created_at timestamptz
```
> Seeded with 3 admin emails. Add new admins here.

### `products`
```sql
id               uuid PK
slug             text UNIQUE NOT NULL
name             text NOT NULL
description      text
price_cents      integer (>= 0)
currency         text DEFAULT 'USD'
image_url        text
inventory_count  integer DEFAULT 0
is_active        boolean DEFAULT true
created_at       timestamptz
updated_at       timestamptz
```

### `cart_items`
```sql
id           uuid PK
user_id      uuid → auth.users (nullable)
session_id   text (nullable, UUID from localStorage)
product_id   uuid → products.id
quantity     integer (> 0)
created_at   timestamptz
updated_at   timestamptz
```
> Constraints: either user_id OR session_id must be set.

### `orders`
```sql
id                   uuid PK
user_id              uuid → auth.users (nullable)
email                text NOT NULL
status               text ('pending'|'paid'|'fulfilled'|'cancelled'|'refunded') DEFAULT 'pending'
subtotal_cents       integer
tax_cents            integer DEFAULT 0
shipping_cents       integer DEFAULT 0
total_cents          integer
payment_intent_id    text
shipping_name        text
shipping_address     jsonb
created_at           timestamptz
updated_at           timestamptz
```

### `order_items`
```sql
id          uuid PK
order_id    uuid → orders.id
product_id  uuid → products.id
quantity    integer
price_cents integer  -- snapshot at time of purchase
created_at  timestamptz
```

### `custom_requests`
```sql
id          uuid PK
name        text NOT NULL
email       text NOT NULL (validated with regex)
phone       text
garment     text NOT NULL
design_id   text (product slug)
design_name text
notes       text
status      text ('new'|'contacted'|'quoted'|'closed') DEFAULT 'new'
created_at  timestamptz
updated_at  timestamptz
```

### `settings`
```sql
id                  integer PK (must have row with id=1)
site_name           text
maintenance_mode    boolean
-- (additional config columns)
```
> ⚠️ MUST seed: `INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;`

### `email_templates`
```sql
id          uuid PK
name        text UNIQUE  -- e.g. 'order_confirmation', 'custom_request'
subject     text
body_html   text         -- supports {{variable}} substitution
created_at  timestamptz
```
> ⚠️ Must seed with at least 'order_confirmation' and 'custom_request' rows.

### `printer_queue`
```sql
id          uuid PK
order_id    uuid → orders.id
status      text ('pending'|'submitted'|'failed') DEFAULT 'pending'
payload     jsonb
created_at  timestamptz
```
> Written by stripe-webhook edge function when a fulfillment partner is configured.

### Row-Level Security Summary
| Table | Anon Read | Anon Write | Auth Read | Auth Write |
|-------|-----------|-----------|-----------|-----------|
| profiles | ❌ | ❌ | Own only | Own only |
| admin_allowlist | ❌ | ❌ | ❌ | ❌ (admin function) |
| products | ✅ (active only) | ❌ | ✅ | ❌ |
| cart_items | Own only | ✅ | Own only | ✅ |
| orders | ❌ | ❌ | Own only | ❌ (service_role) |
| order_items | Own (via orders) | ❌ | Own only | ❌ |
| custom_requests | ❌ | ✅ | ❌ | ✅ |
| settings | ✅ | ❌ | ✅ | admin only |
| email_templates | ❌ | ❌ | admin only | admin only |
| printer_queue | ❌ | ❌ | ❌ | service_role |

---

## 7. Supabase Edge Functions

All functions are in `supabase/functions/`. Deploy via `supabase functions deploy <name>`.

### `create-checkout`
Creates a Stripe Checkout Session. Validates prices server-side from DB (never trusts client). Creates a pending order in DB, then creates Stripe session with `metadata.order_id`. Requires `STRIPE_SECRET_KEY` in Supabase Edge Function secrets.

### `stripe-webhook`
Handles `checkout.session.completed`. Marks order as 'paid'. Stores shipping address from Stripe data. Calls `send-notification` to queue confirmation email. Inserts into `printer_queue` for fulfillment. Requires `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY`.

### `send-notification`
Fetches template by name from `email_templates` table. Substitutes `{{variable}}` placeholders. Dispatches via Resend if `RESEND_API_KEY` is set; otherwise saves with `status = 'queued_no_sender'`. Requires `RESEND_API_KEY`.

### `verify-email`
Public GET endpoint. Checks syntax, blocklist of disposable domains, detects common typos, does live MX lookup via Cloudflare DNS. Rate limited by IP. No secrets required.

### Required Secrets (set in Supabase Dashboard → Edge Functions → Secrets)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

---

## 8. Third-Party Services

| Service | Purpose | Where to Find Credentials |
|---------|---------|--------------------------|
| **Supabase** | Database, Auth, Storage, Edge Functions | supabase.com → Project Settings → API |
| **Cloudflare Pages** | Hosting / CDN (project: pournogravydev) | dash.cloudflare.com |
| **Cloudflare DNS** | Domain (pournogravy.com) | dash.cloudflare.com → Domains |
| **GitHub** | Source control | github.com/kmitch2087-dot/pournogravy |
| **Lovable** | AI dev platform | pournogravy.lovable.app |
| **Stripe** | Payment processing | ⚠️ Edge functions built — secrets not yet set |
| **Resend** | Transactional email | ⚠️ Wired — API key not yet set; verify opie@pournogravy.com as sender |
| **Fulfillment partner** | Order fulfillment | ⚠️ NOT YET SELECTED (Printful/Printify recommended) |

### Environment Variables
```bash
# In .env.production (committed) and .env.local (gitignored):
VITE_SUPABASE_URL=https://emtjkawcmsfgjyimnncf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>   # Use ANON_KEY, NOT PUBLISHABLE_KEY

# In Supabase Edge Function Secrets (NOT in any .env file):
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

---

## 9. Deployment

### How Deploys Work
1. Push to `master` on GitHub
2. CF Pages `pournogravydev` detects push via webhook
3. Runs `npm run build` — Vite reads `.env.production` (committed), bakes env vars into bundle
4. `dist/` deployed to Cloudflare global CDN
5. pournogravy.com updates within ~2 minutes

### Manual Deploy
CF Pages dashboard → pournogravydev → Deployments → Retry deployment.

### Rollback
CF Pages → Deployments → click any prior successful deployment → Rollback to this deployment. Zero downtime.

### Lovable → Production Safe Push Workflow
See `docs/LOVABLE_PHASE2_PHASE3.md` for step-by-step guide. Never let Lovable auto-push to master without reviewing the diff first.

---

## 10. Feature Flags & Product Visibility

Products are controlled in `src/data/products.ts`:
```typescript
{
  id: "product-slug",
  published: true,   // Shows in shop — omit or false to hide
  featured: true,    // Shows in hero carousel and featured row
}
```
Hero carousel only shows products that are both in `HERO_PRODUCT_IDS` (in `Index.tsx`) and have `published: true`.

---

## 11. Known Issues & Tech Debt

| Issue | Severity | Notes |
|-------|---------|-------|
| `.env.local` uses wrong key name | 🔴 High | Must be `VITE_SUPABASE_ANON_KEY` not `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Stripe secrets not set | 🔴 High | Payments don't process until secrets are in Supabase edge function env |
| settings table row missing | 🔴 High | Admin Settings page crashes without `id=1` row |
| Supabase Storage bucket missing | 🔴 High | Product image uploads fail without `products` bucket |
| email_templates not seeded | 🟡 Medium | send-notification function falls back to 'queued_no_sender' |
| Dead code: src/utils/supabase/ | 🟡 Medium | Second Supabase client never used — delete the whole folder |
| Dead code: src/lib/fulfillment.ts | 🟡 Medium | Not called by any edge function — delete |
| Two wrangler config files | 🟡 Medium | Delete wrangler.jsonc — wrangler.toml is correct |
| CartContext static-only hydration | 🟡 Medium | DB-only products dropped on page refresh |
| 972KB bundle (uncompressed) | 🟡 Medium | Lazy-load routes in App.tsx to split chunks |
| 19 npm vulnerabilities | 🟡 Medium | Run npm audit fix |
| main branch not deleted | 🟢 Low | Deprecated — delete from GitHub |
| Duplicate Lovable repos x4 | 🟢 Low | Safe to delete from GitHub |

---

## 12. What's Not Built Yet

1. **Admin product editor** (DB-backed) — static products.ts is current source of truth
2. **Email marketing integration** — email capture has no backend connection (Klaviyo/Mailchimp)
3. **Fulfillment partner** — Printful or Printify API wiring
4. **SEO** — no meta tags, Open Graph, sitemap, structured data
5. **Discount codes** — no promo code system
6. **Product reviews**
7. **Cart merge on login** — guest → auth cart merging (partially wired, not tested)
8. **Cloudflare Workers** — recommended for proxying Supabase calls server-side

---

## 13. Change Log

| Date | Change | Developer |
|------|--------|----------|
| April 2026 | Initial schema, products, cart, custom requests | Lovable + Aethyx |
| April 2026 | Men's/Women's variants + Black/Cream colors | Lovable + Aethyx |
| April 2026 | Hero carousel, featured products, email capture | Lovable + Aethyx |
| April 2026 | FAQ, About, Contact, Collections pages | Lovable + Aethyx |
| April 2026 | Admin dashboard, settings, product edit, login | Lovable + Aethyx |
| April 2026 | Stripe edge functions (create-checkout, stripe-webhook) | Lovable + Aethyx |
| April 2026 | Email edge functions (send-notification, verify-email) | Lovable + Aethyx |
| April 2026 | admin_allowlist table + handle_new_user trigger | Lovable + Aethyx |
| April 28, 2026 | CLAUDE.md + docs/ suite created | Aethyx |
| April 29, 2026 | Fixed black screen (.env.production committed) | Aethyx |
| April 29, 2026 | Fixed AuthContext race condition (loading flag) | Aethyx |
| April 29, 2026 | Full code audit — bugs, dead code, missing infra documented | Aethyx |
| April 29, 2026 | Updated all docs, Phase 2/3 prompts, dev curriculum | Aethyx |

---

*Maintained by Aethyx. Update Change Log and Known Issues at end of each session.*
