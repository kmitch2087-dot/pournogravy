# Pournogravy — Full Developer Handoff
**Prepared by:** Kristin Mitchell — Aethyx
**Last Updated:** April 28, 2026
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
7. [Third-Party Services](#7-third-party-services)
8. [Deployment](#8-deployment)
9. [Feature Flags & Product Visibility](#9-feature-flags--product-visibility)
10. [Known Issues & Tech Debt](#10-known-issues--tech-debt)
11. [What's Not Built Yet](#11-whats-not-built-yet)
12. [Change Log](#12-change-log)

---

## 1. Repository & Access

| Resource | Location |
|----------|---------|
| GitHub repo | `github.com/kmitch2087-dot/pournogravy` (Public) |
| Live site | `pournogravy.com` |
| Cloudflare Pages dashboard | `dash.cloudflare.com` — account: Vibeshiftstudios@pro... |
| Supabase project | `supabase.com` — project: Pournogravy |
| Lovable project | `pournogravy.lovable.app` |
| Domain registrar | Cloudflare (pournogravy.com DNS managed there) |

**Active branch:** `master` (GitHub default — Lovable syncs to this)
**Deprecated branch:** `main` (should be deleted — all work is on master)

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
Backend:    Supabase (PostgreSQL + Auth + Storage)
Hosting:    Cloudflare Pages (global CDN)
CI/CD:      GitHub → Cloudflare Pages (auto-deploy on master push)
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

# Set up env vars (copy example and fill in Supabase keys)
cp .env.example .env.local
# Fill in: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
# → http://localhost:8080
```

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

If it's set to `vite` (dev server), the deployment will hang for 4+ minutes and fail silently. Verify this in Cloudflare Pages → Settings → Builds & deployments.

---

## 4. Project Structure

```
pournogravy/
├── src/
│   ├── pages/              # Route-level components
│   │   ├── Index.tsx       # Homepage — hero carousel, featured products, email capture
│   │   ├── Shop.tsx        # Full product catalog
│   │   ├── ProductDetail.tsx  # Individual product page (variants, colors, cart)
│   │   ├── Collections.tsx # Curated product groupings
│   │   ├── About.tsx       # Brand story
│   │   ├── Contact.tsx     # Contact form
│   │   ├── FAQ.tsx         # FAQ accordion
│   │   ├── Proposal.tsx    # (Internal) project proposal page
│   │   └── NotFound.tsx    # 404
│   ├── components/
│   │   ├── Navbar.tsx      # Top nav with cart icon
│   │   ├── Footer.tsx      # Site footer
│   │   ├── CartDrawer.tsx  # Right-side cart slide-out
│   │   ├── ProductCard.tsx # Product grid card
│   │   ├── CustomGarmentRequestModal.tsx  # Custom order request form
│   │   ├── NavLink.tsx     # Animated nav link component
│   │   └── ui/             # shadcn/ui components (auto-generated, don't hand-edit)
│   ├── context/
│   │   └── CartContext.tsx # Cart state — guest (session_id) + auth (user_id)
│   ├── data/
│   │   └── products.ts     # ⭐ ALL product data (static, not DB-driven yet)
│   ├── hooks/
│   │   ├── use-mobile.tsx  # Responsive breakpoint hook
│   │   └── use-toast.ts    # Toast notification hook
│   ├── lib/
│   │   └── utils.ts        # shadcn utility (cn() helper)
│   ├── assets/             # Static assets bundled with Vite
│   ├── App.tsx             # Router setup (React Router v6)
│   ├── App.css             # Global styles (minimal — Tailwind handles most)
│   ├── index.css           # Tailwind directives + CSS custom properties
│   └── main.tsx            # Entry point
├── public/
│   └── products/           # Product images (PNG) — served as static files
├── supabase/
│   └── migrations/         # SQL migrations (run in order)
│       ├── 001_initial_schema.sql
│       └── 002_custom_requests.sql
├── scripts/
│   └── download-shopify-images.mjs  # One-time image scraper
├── .env.example            # Required env var template
├── vite.config.ts          # Vite config (port 8080, @/ alias, lovable-tagger in dev)
├── tailwind.config.ts      # Tailwind config with shadcn theme
├── components.json         # shadcn/ui config
├── tsconfig.json           # TypeScript config
└── vitest.config.ts        # Test config
```

---

## 5. Key Architectural Decisions

### Products are static, not DB-driven
All product data lives in `src/data/products.ts`. The Supabase `products` table exists but is not currently read by the frontend. The static file approach was chosen for speed during MVP — no network request needed to render products.

**Implication:** Adding or editing products requires a code change + deploy. The roadmap includes an admin dashboard that will eventually make the Supabase `products` table the source of truth.

### Cart is hybrid (guest + auth)
`CartContext.tsx` supports two cart modes simultaneously:
- **Guest:** cart keyed by `session_id` (UUID stored in localStorage)
- **Auth:** cart keyed by `user_id` (Supabase Auth JWT)

When a guest logs in, cart merging is handled at the context level. This is the correct approach for e-commerce — forcing login before adding to cart kills conversion.

### No payment processing yet
The cart and order pipeline (Supabase `orders` + `order_items` tables) are built, but Stripe is not wired up. The checkout flow does not process payments. This is the top priority before any marketing spend.

### Lovable bidirectional sync
The project uses Lovable for AI-assisted development. Lovable reads from and writes to the GitHub `master` branch. If you make changes locally, push to `master` — they'll appear in Lovable automatically. If Lovable makes changes, do a `git pull` before your next local edit.

**Important:** Lovable will only build/preview the GitHub default branch. Keep `master` as the default branch in GitHub settings.

---

## 6. Database Schema

All migrations are in `supabase/migrations/`. Run them in order via the Supabase SQL Editor or `supabase db push`.

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
> Currently not used by the frontend (products.ts is the source of truth).

### `cart_items`
```sql
id           uuid PK
user_id      uuid → auth.users (nullable, for auth users)
session_id   text (nullable, for guests — UUID from localStorage)
product_id   uuid → products.id
quantity     integer (> 0)
created_at   timestamptz
updated_at   timestamptz
-- Constraints: either user_id or session_id must be set (not both null)
-- Unique: (user_id, product_id) and (session_id, product_id) separately
```

### `orders`
```sql
id                  uuid PK
user_id             uuid → auth.users (nullable)
email               text NOT NULL
status              text ('pending'|'paid'|'fulfilled'|'cancelled'|'refunded') DEFAULT 'pending'
subtotal_cents      integer
tax_cents           integer DEFAULT 0
shipping_cents      integer DEFAULT 0
total_cents         integer
-- (+ shipping address fields, payment_intent_id, etc.)
created_at          timestamptz
updated_at          timestamptz
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
phone       text (optional)
garment     text NOT NULL (what type of garment they want)
design_id   text (product slug from products.ts)
design_name text (snapshot of product name)
notes       text
status      text ('new'|'contacted'|'quoted'|'closed') DEFAULT 'new'
created_at  timestamptz
updated_at  timestamptz
```

### Row-Level Security Summary
| Table | Anon Read | Anon Write | Auth Read | Auth Write |
|-------|-----------|-----------|-----------|-----------|
| products | ✅ (active only) | ❌ | ✅ | ❌ |
| cart_items | Own only | ✅ | Own only | ✅ |
| orders | ❌ | ❌ | Own only | ❌ (service_role) |
| order_items | Own (via orders) | ❌ | Own only | ❌ |
| custom_requests | ❌ | ✅ | ❌ | ✅ |

---

## 7. Third-Party Services

| Service | Purpose | Where to Find Credentials |
|---------|---------|--------------------------|
| **Supabase** | Database, Auth, Storage | supabase.com → Project Settings → API |
| **Cloudflare Pages** | Hosting / CDN | dash.cloudflare.com |
| **Cloudflare DNS** | Domain (pournogravy.com) | dash.cloudflare.com → Domains |
| **GitHub** | Source control | github.com/kmitch2087-dot/pournogravy |
| **Lovable** | AI dev platform | pournogravy.lovable.app |
| **Stripe** | Payment processing | ⚠️ NOT YET CONNECTED — top roadmap priority |
| **Fulfillment partner** | Order fulfillment | ⚠️ NOT YET SELECTED (Printful/Printify recommended) |

### Environment Variables
```bash
VITE_SUPABASE_URL=         # From Supabase project settings
VITE_SUPABASE_ANON_KEY=    # From Supabase project settings (anon/public key)
```
> Do NOT commit `.env.local` to git. It's in `.gitignore`.

---

## 8. Deployment

### How Deploys Work
1. Push to `master` on GitHub
2. Cloudflare Pages detects the push via webhook
3. Cloudflare runs `npm run build` → produces `dist/`
4. `dist/` is deployed to Cloudflare's global CDN
5. pournogravy.com updates within ~2 minutes

### Manual Deploy Trigger
In Cloudflare Pages dashboard → pournogravy → Deployments → click **Retry deployment** or **Create deployment**.

### ⚠️ Build Command Issue (Active)
As of April 2026, the Cloudflare Pages build command may be misconfigured. If you see the build log showing Vite dev server output (`localhost:8080`) instead of a production build, the command is set to `vite` instead of `npm run build`. Fix in: Cloudflare Pages → Settings → Builds & deployments → Build command.

### Rollback
In Cloudflare Pages → Deployments → click any previous successful deployment → **Rollback to this deployment**. Zero-downtime, instant.

---

## 9. Feature Flags & Product Visibility

Products are controlled entirely in `src/data/products.ts`:

```typescript
{
  id: "product-slug",
  name: "Product Name",
  published: true,   // Shows in shop — omit or set false to hide
  featured: true,    // Shows in hero carousel and featured row
  ...
}
```

- Products without `published: true` are invisible to customers
- Products with `featured: true` appear in the hero carousel (order controlled by `HERO_PRODUCT_IDS` in `Index.tsx`) and the featured products row
- The hero carousel only shows products that are both in `HERO_PRODUCT_IDS` and have `published: true`

---

## 10. Known Issues & Tech Debt

| Issue | Severity | Notes |
|-------|---------|-------|
| Cloudflare build command misconfigured | 🔴 High | Set to `vite` instead of `npm run build` — prevents reliable production deploys |
| Stripe not connected | 🔴 High | Cart and order pipeline exist but payments don't process |
| Products are static (not DB-driven) | 🟡 Medium | Owner cannot add products without a code deploy |
| No admin dashboard | 🟡 Medium | Owner manages everything through Supabase SQL UI |
| No email marketing integration | 🟡 Medium | Email capture on homepage has no backend connection |
| No fulfillment partner | 🟡 Medium | Orders can be recorded but not automatically fulfilled |
| `main` branch not deleted | 🟢 Low | Deprecated branch still exists on GitHub — should be cleaned up |
| Duplicate Lovable repos | 🟢 Low | 4 private repos with hash suffixes — safe to delete |
| No Wrangler config | 🟢 Low | Fine for now; needed if Cloudflare Workers are added later |

---

## 11. What's Not Built Yet

Refer to `docs/EXECUTIVE_SUMMARY.md` → Section 5 (Future Roadmap) for the full prioritized list. Key missing pieces:

1. **Stripe payment processing** — #1 priority before any marketing
2. **Admin dashboard** — product management UI for the owner
3. **Email marketing** — Klaviyo/Mailchimp integration for the captured email list
4. **Fulfillment integration** — Printful or Printify API connection
5. **SEO** — meta tags, Open Graph images, sitemap, structured data
6. **Discount codes** — promotional code support
7. **Cloudflare Workers** — recommended for proxying Supabase calls server-side (hides service key from client bundle)

---

## 12. Change Log

| Date | Change | Developer |
|------|--------|----------|
| April 2026 | Initial schema, products, cart, custom requests | Lovable + Aethyx |
| April 2026 | Men's/Women's variants + Black/Cream colors | Lovable + Aethyx |
| April 2026 | Hero carousel, featured products, email capture | Lovable + Aethyx |
| April 2026 | FAQ, About, Contact, Collections pages | Lovable + Aethyx |
| April 2026 | Cloudflare Pages deployment, pournogravy.com domain | Aethyx |
| April 28, 2026 | CLAUDE.md + docs/ suite created | Aethyx |

---

*Document maintained by Aethyx. Update the Change Log and Known Issues sections at the end of each development session.*
