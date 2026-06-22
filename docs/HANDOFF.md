# Pournogravy — Full Developer Handoff
**Prepared by:** Kristin Mitchell — Aethyx  
**Last Updated:** June 22, 2026 (WebP image conversion, QA a11y/SEO/CLS fixes, font render-blocking fix, priority images, Lighthouse baseline measurement)  
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
AI builder:  Claude (Cowork mode) — Lovable disconnected June 8, 2026
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
│   ├── Index.tsx              # Homepage — hero carousel, featured products, TICKER_ITEMS marquee, rotating quotes
│   ├── Shop.tsx               # Full catalog with sort/filter
│   ├── ProductDetail.tsx      # Product page (variants, colors, gallery, reviews, cart)
│   ├── Collections.tsx        # Curated product groupings
│   ├── About.tsx
│   ├── Contact.tsx            # Wired to Supabase (custom_requests, garment='contact-form')
│   ├── FAQ.tsx
│   ├── PrivacyPolicy.tsx      # /privacy
│   ├── TermsOfService.tsx     # /terms
│   ├── Checkout.tsx           # Embedded Stripe Payment Element
│   ├── CheckoutReturn.tsx     # Post-payment confirmation screen
│   ├── Account.tsx            # Auth user account page
│   ├── Login.tsx              # Customer login
│   ├── Blog.tsx               # /blog public listing page
│   ├── BlogPost.tsx           # /blog/:slug public post page
│   ├── ShipOrder.tsx          # /ship/:orderId — printer-facing tracking submission form (HMAC-verified token)
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
│       ├── Loyalty.tsx        # Pour Points — member table, tx history, manual adjustments
│       ├── Customers.tsx      # Customer lookup by email — stats, order history
│       ├── Subscribers.tsx    # Email subscriber list, CSV export, 8-week sparkline
│       ├── DiscountCodes.tsx  # Create/toggle/delete promo codes, usage tracking
│       ├── BlogAdmin.tsx      # Blog post CRUD (create/edit/delete, publish toggle, slug auto-gen, image URL)
│       ├── InvoiceTracker.tsx # Financial dashboard: profit margin, shipping collected, printer bill, mark-paid, CSV export
│       ├── EmailTemplates.tsx # Rich email editor: Visual/HTML/Preview/Plain Text tabs, variable chips, live preview, test send
│       ├── Content.tsx        # CMS editor — Home/Shop/About/Contact/FAQ tabs; edits site_content rows
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
│   ├── CartContext.tsx        # Cart: localStorage + debounced DB sync; merge on login
│   ├── SiteContentContext.tsx # CMS — loads all site_content rows; provides getValue(page, section, key, fallback)
│   └── WishlistContext.tsx    # Single shared wishlist instance — auth subscription + DB/localStorage
├── hooks/
│   ├── useAnalytics.ts        # Page-view + event tracking; auto-fires on route change
│   ├── useLoyalty.ts          # Pour Points balance, transactions, redeem()
│   ├── useProductRatings.ts   # Shared React Query cache for star ratings on cards
│   └── useWishlist.ts         # Re-exports from WishlistContext (do not add logic here)
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
CF Pages has "Pretty URLs" enabled. `/* /index.html 200` in `_redirects` creates an infinite redirect loop. SPA routing is handled by `404.html` (a copy of `index.html` produced by the build script: `cp dist/index.html dist/404.html`). CF Pages serves `404.html` for any unmatched path at HTTP 404 status, preserving the URL so React Router handles routing client-side. The HTTP 404 status is expected and correct for this pattern. Do not add a `_redirects` file. `wrangler.toml` does not exist in this repo.

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

### SIGNED_IN Auto-Refresh Spinner — Fixed (commit 4456f80) — DO NOT REGRESS
Supabase v2 fires `SIGNED_IN` during **automatic token refresh**, not just on explicit login. The original `onAuthStateChange` handler unconditionally called `setLoading(true)` on `SIGNED_IN`, causing a spurious spinner mid-session when navigating between admin and public pages.

Fix: `loadedProfileIdRef` in `AuthContext` tracks the user ID whose profile is currently loaded. `setLoading(true)` is only called if the incoming `SIGNED_IN` user ID differs from the already-loaded user. Same-user token refreshes skip the spinner entirely.

```typescript
const loadedProfileIdRef = useRef<string | null>(null);

// In fetchProfile — after setProfile():
loadedProfileIdRef.current = result.data?.id ?? null;

// In SIGNED_IN handler:
if (loadedProfileIdRef.current !== newSession.user.id) {
  setLoading(true);  // only for genuinely new sign-in
}

// In SIGNED_OUT handler:
loadedProfileIdRef.current = null;
```

### SiteContent CMS — getValue() Pattern
`site_content` table stores page copy as rows with a `(page, section, key)` composite unique key. `SiteContentProvider` loads all rows once on mount and provides a `getValue(page, section, key, fallback)` helper. Public pages call `getValue()` with their current hardcoded strings as the fallback, so pages render correctly with an empty or partial DB.

Admin can edit live values at `/admin/content` (Home/Shop/About/Contact/FAQ tabs). The `FieldInput` and `SectionGroup` components in `src/components/admin/SiteEditor.tsx` are exported and reused by the Content admin page to avoid duplicating edit UI.

**DO NOT** add hardcoded copy to public pages without also adding a corresponding `getValue()` call and a seed row in a migration file. The pattern requires both.

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
`src/integrations/supabase/client.ts` — use this everywhere. A dead second client in `src/utils/supabase/` was deleted. `CustomGarmentRequestModal` had a stale import to `@/lib/supabase` (a path that never existed) — it was silently failing on all custom garment submissions until fixed May 15.

### WishlistContext — Do Not Revert to Per-Component Hook
`src/context/WishlistContext.tsx` is the single source of truth for wishlist state. `useWishlist.ts` simply re-exports from it. The wishlist was previously instantiated once per `ProductCard`, creating N simultaneous `onAuthStateChange` subscriptions and N Supabase queries on the Shop grid. The fix is load-bearing — do not move the logic back into the hook file.

### Contact Form — Stored in custom_requests
The Contact page form inserts into `custom_requests` with `garment = 'contact-form'` to distinguish general inquiries from garment requests. The admin can filter by garment type in the Custom Requests panel. If a dedicated `contact_submissions` table is ever added, migrate these rows and update `Contact.tsx`.

---

## 6. Database Schema

### Tables Summary
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with `is_admin` flag |
| `admin_allowlist` | 3 admin emails; `handle_new_user` trigger checks this |
| `products` | DB products (24 seeded; merged with static via `useMergedProducts`) |
| `cart_items` | Guest (session_id) + auth (user_id) carts — includes size, variant_id, color_id, product_slug |
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
| `analytics_events` | Client-side event tracking (page views, add to cart, purchases) |
| `site_content` | CMS page copy — `(page, section, key)` composite unique key + `value` + `default_value` + `value_type` + `sort_order`; ~60 rows seeded |
| `client_edit_requests` | Edit request notes from Opie — base table (migration 20260508000001); enhanced with author/done/archived cols (migration 20260509000001) |
| `wishlists` | User saved products — user_id + product_id (text slug), unique per pair |
| `loyalty_accounts` | Pour Points — points_balance, lifetime_points per user |
| `loyalty_transactions` | Point earn/redeem/adjustment history per user |
| `email_subscribers` | Homepage email capture — email + source, unique constraint |
| `fulfillment_vendors` | Vendor/printer contact directory — services[], turnaround, min_order_qty, file_formats[]; RLS admin-only |
| `order_archive` | Archived orders moved out of main orders table — same schema + archived_at timestamptz |

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
| edit_requests / client_edit_requests | ❌ | ❌ | admin full |
| site_content | ✅ read | ✅ read | admin write |
| analytics_events | write | write | read |
| wishlists | ❌ | own only | — |
| loyalty_accounts | ❌ | own only | admin read/write |
| loyalty_transactions | ❌ | own only | admin read/insert |
| email_subscribers | write | ❌ | admin read |

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
| `redeem-points` | Exchanges 100 Pour Points for a single-use $5 discount code; atomic deduction with optimistic concurrency | None |
| `abandoned-cart-reminder` | Cron-triggered — finds carts idle >2h with email, sends reminder via send-notification | `RESEND_API_KEY` |
| `refund-order` | Admin-callable — issues Stripe refund, updates order status to refunded, sends customer email | `STRIPE_SECRET_KEY`, `RESEND_API_KEY` |
| `archive-orders` | Admin or cron — moves fulfilled orders older than threshold to order_archive table | None |
| `blast-email` | Admin-callable — sends bulk email to all subscribers via send-notification loop | `RESEND_API_KEY` |
| `add-fulfillment-vendor` | Admin-callable — inserts to fulfillment_vendors, sends vendor_welcome email via send-notification | `RESEND_API_KEY` |

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
| **Lovable** | ❌ Disconnected | Disconnected June 8, 2026 — Claude (Cowork) is now exclusive builder |
| **Fulfillment partner** | ❌ Not selected | Printful or Printify — must wire API key into stripe-webhook |
| **Cloudflare Email Worker** | ⚠️ Worker deployed, routing pending | `pournogravy-receive-email` worker deployed. One manual step: CF Dashboard → Email → Email Routing → edit opie@pournogravy.com rule → change destination to pournogravy-receive-email |

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
- Email marketing integration (Klaviyo or Mailchimp) to activate subscriber list
- International shipping config
- Wholesale portal (foundation at `/proposal`)
- Vite 8 upgrade (`npm audit fix --force` — breaking change, defer to dedicated session)

---

## 11. Change Log

### June 22, 2026
- **QA audit report** — full audit generated: `~/Desktop/Pournogravy_QA_Report_2026-06-22.md`. Covers Lighthouse scores, accessibility, SEO, security (35 tables RLS checked), best practices, functional/routing, email/payments, analytics.
- **WebP image conversion** — 80 product images + 5 UI images converted via `cwebp`. 61MB → 7.3MB (88% reduction). All `.png`/`.jpg` product images now have `.webp` equivalents in `public/products/` and `public/`. ProductCard has `.webp`→`.png` `onError` fallback.
- **DB image URLs updated** — SQL UPDATE via Supabase MCP changed all 26 product rows from `.png`/`.jpg` to `.webp` (`unnest(images)` + `array_agg()` + `regexp_replace` pattern).
- **Accessibility fixes (4 parallel agents)**:
  - `MerchDrops.tsx` — added `<SEO>` component (title, description, url, imageAlt props)
  - `Index.tsx` — carousel slides get `inert=""` when inactive; dot buttons enlarged to `min-w-[44px] min-h-[44px]` (WCAG 2.5.5 touch target)
  - `Index.tsx` — Karen ticker img: `width="40"` `height="40"` (eliminates layout shift)
  - `Footer.tsx`, `admin/Orders.tsx`, `admin/CustomRequests.tsx` — sub-labels changed from `<h4>` to `<p>` (fixes heading order)
- **CLS fix — logo** — `Navbar.tsx` logo img: added `width="500"` `height="257"` (measured from WebP header)
- **Accessibility fix — sort select** — `Shop.tsx` sort `<select>`: added `aria-label="Sort products"`
- **Font render-blocking fix** — removed `@import url(...)` from `src/index.css`; all 4 font families (Bebas Neue, Inter, Permanent Marker, Space Grotesk) consolidated into a single `<link>` in `index.html`. Eliminates second render-blocking stylesheet caused by CSS @import cascade delay.
- **Priority images** — `ProductCard.tsx`: added `priority` prop (`loading`, `fetchPriority`). First 3 cards on Shop + Homepage get `loading="eager"` + `fetchPriority="high"` + `decoding="async"`.
- **`decoding="sync"` regression fixed** — reverted after TBT spiked from 20ms to 107ms. `decoding="async"` for all images.
- **Lighthouse baselines (5-run average)** — Homepage performance: **60**. Shop: **66**. TBT: 34ms avg. CLS: 0.0. LCP is 8–10s — structural SPA limitation (JS→React→Supabase→image chain). Cannot be improved without SSR rewrite.
- **`.gitignore`** — added `*.bak` and `*.bak2` to suppress build-file backups from git status.

### June 15, 2026
- **Shipping pipeline complete**: stripe-webhook captures shipping_cents, writes to orders table. Printer invoice now includes print cost + shipping pass-through with clear "TOTAL TO INVOICE US" total. Customer shipped email has clickable tracking URL.
- **New edge function**: `resend-printer-notification` — admin-callable, requires is_admin JWT, regenerates HMAC magic link and re-sends printer notification email.
- **Orders admin overhaul**: shipping address formatted (no raw JSON), one-click Mark as Shipped flow, Resend Printer Email button.
- **InvoiceTracker**: 9-column CSV (Gross Total, Shipping pass-through, Net Revenue, Print Cost, Printer Invoice, Printer Paid). Printer bill totals now include shipping.
- **Bug fixes**: easter egg column name (value→text), loyalty threshold hardcoded 100 (now reads from loyalty_rules), PrintFiles slug mismatch (now lists from Storage), double points direct toggle.
- **Storage**: logo_back_white.png + logo_back_black.png uploaded to print-files bucket.
- **Loyalty**: useLoyalty hook now fetches redemption_threshold from loyalty_rules; Account.tsx progress bar uses live value.

| Date | Change |
|------|--------|
| June 8, 2026 | All Stripe/Resend/Fulfillment secrets rotated and set; stripe-webhook updated with slug-based print file URLs; Lovable disconnected |
| June 8–9, 2026 | Email Templates admin page built (/admin/email-templates); send-notification param fix; CF Email Worker source created; receive-email redeployed (verify_jwt: false) |
| June 9, 2026 | CF Worker pournogravy-receive-email deployed via CF REST API; 74/74 print PNGs confirmed; temp policies cleaned |
| June 11, 2026 | InvoiceTracker financial dashboard (/admin/invoices); printer_paid_at migration; all 4 email templates branded; printer test email sent |
| June 15, 2026 | Blog system documented (Blog, BlogPost, BlogAdmin, ShipOrder pages); HANDOFF brought current |
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
| May 14, 2026 | Shop search (URL-synced `?q=`) + sort: Featured / Price Low→High / Price High→Low / A→Z |
| May 14, 2026 | Wishlist system — `wishlists` table + `useWishlist` hook (auth=DB, guest=localStorage) + heart toggle on ProductCard + `/wishlist` page + Navbar badge |
| May 14, 2026 | Star ratings on ProductCard via shared `useProductRatings` React Query cache (one fetch for all cards) |
| May 14, 2026 | Pour Points loyalty — `loyalty_accounts` + `loyalty_transactions` tables + `increment_loyalty_points()` SECURITY DEFINER fn + `redeem-points` edge function + `useLoyalty` hook + Account page rewrite + CheckoutReturn "+X Pour Points" banner |
| May 14, 2026 | Admin Loyalty panel (`/admin/loyalty`) — member table, expandable tx history, manual adjustment modal |
| May 14, 2026 | Admin Customer Lookup (`/admin/customers`) — email search, stats grid, expandable order history |
| May 14, 2026 | Admin Email Subscribers (`/admin/subscribers`) — list, CSV export, 8-week sparkline |
| May 14, 2026 | Admin Discount Codes (`/admin/discount-codes`) — create/toggle/delete, usage progress bar, status badges |
| May 14, 2026 | Homepage email capture wired to `email_subscribers` table (dedup on 23505 conflict error) |
| May 14, 2026 | Organization JSON-LD on homepage; Product JSON-LD already on ProductDetail (schema.org rich results) |
| May 14, 2026 | Cart merge — CartContext rewritten with DB sync; `cart_items` extended with size/variant_id/color_id/product_slug; guest cart survives login + cross-device sync |
| May 14, 2026 | `products` Storage bucket created (public read, admin write) — product image uploads now work |
| May 15, 2026 | Homepage marquee: switched from Tailwind `animate-marquee` to `marquee-scroll` CSS keyframe (40s); TICKER_ITEMS adds Opie's 4 Shopify copy lines; pause-on-hover; `prefers-reduced-motion` CSS media query stops animation |
| May 15, 2026 | Hero slide top padding: `pt-24 sm:pt-20 md:pt-24` → `pt-28 sm:pt-24 md:pt-28` — clears fixed navbar on mobile |
| May 15, 2026 | Privacy Policy (`/privacy`) and Terms of Service (`/terms`) pages added; Footer updated with links in Info column and bottom bar |
| May 15, 2026 | `.claude/shared/` communication bridge folder added to git (Index, Footer, Navbar, DropAnnouncementBar, PATCH_INSTRUCTIONS.md) for Claude Desktop ↔ Claude Code coordination |
| May 15, 2026 | `useWishlist` lifted to `WishlistContext` — eliminated N auth subscriptions (was one per ProductCard) |
| May 15, 2026 | Contact form wired to Supabase — was fake/cosmetic-only; now inserts to `custom_requests` |
| May 15, 2026 | `CustomGarmentRequestModal` fixed dead import path — all custom garment submissions were silently failing |
| May 15, 2026 | Contact page Instagram + DMs links fixed from `"#"` to real Instagram URL |
| May 15, 2026 | ProductCard wishlist heart: always visible on mobile, hover-only on desktop |
| May 15, 2026 | Cart thumbnail "PNG" text replaced with ShoppingBag icon |
| May 15, 2026 | DropAnnouncementBar: `truncate` → `line-clamp-2 sm:line-clamp-1` (mobile teaser no longer cut off) |
| May 15, 2026 | Star rating buttons: `p-0.5` → `p-2` touch targets + `aria-label` added |
| May 15, 2026 | FilterPill buttons: `aria-pressed` added for screen reader active state |
| May 15, 2026 | ProductDetail SEO image: `product.images[0]` → `product.images?.[0] ?? product.image` (null guard) |
| May 22, 2026 | Auth fix: `loadedProfileIdRef` prevents spurious loading spinner on Supabase `SIGNED_IN` auto-refresh (token renewal fires SIGNED_IN — was causing mid-session spinner navigating admin ↔ public pages) — commit 4456f80 |
| May 25, 2026 | Full CMS wiring — all 5 public pages (Index, About, Shop, Contact, FAQ) use `getValue()` from `SiteContentContext` for all meaningful copy (headlines, CTAs, FAQ Q&As, quotes, ticker items) with static fallbacks |
| May 25, 2026 | `site_content` seed migration `20260525000001_site_content_expanded.sql` — ~60 rows seeded and applied to Supabase |
| May 25, 2026 | New admin Content tab (`/admin/content`) — Home/Shop/About/Contact/FAQ tabs; edits `site_content` rows live; uses exported `SectionGroup`/`FieldInput` from `SiteEditor.tsx` |
| May 26, 2026 | Docker Desktop installed; `supabase db pull` working; migration history synced via `supabase migration repair` |
| May 26, 2026 | `client_edit_requests` base table backfilled as migration `20260508000001_client_edit_requests.sql` (was created directly in Supabase dashboard without a local file) |
| May 26, 2026 | Remote schema drift captured as `20260526231648_remote_schema.sql` (1,631 lines — Stripe Postgres sync, pgmq, pg_cron, index_advisor extensions; updated RLS policies) |

---

*Maintained by Aethyx. Update this file at the end of each session.*
