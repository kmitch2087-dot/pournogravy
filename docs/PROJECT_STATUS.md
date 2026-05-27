# Pournogravy — Project Status
**Maintained by:** Kristin Mitchell — Aethyx  
**Live Site:** [pournogravy.com](https://pournogravy.com)  
**Repository:** [kmitch2087-dot/pournogravy](https://github.com/kmitch2087-dot/pournogravy)

> **Note on dates:** This project is built using multiple AI-assisted development tools (Lovable, Claude Code, Claude Cowork, and others). Entries in this log reflect updates recognized and logged by those systems — not necessarily the literal date the work was performed. Development often happens across tools simultaneously; the log captures progress milestones, not calendar hours.

---

## Current Phase
**Phase:** Post-launch (soft) — Active Build  
**Status:** Site is live. Real payment processing active. Admin dashboard fully operational with user manual, orders, reviews, discount codes, and direct contact to Kristin. Fulfillment partner selection pending.

---

## Session Log (Latest First)

| Date | Summary | Completed | Next Up |
|------|---------|-----------|---------|
| May 22–27, 2026 | **CMS wiring + /admin/content + auth spinner fix + migration sync.** Wired all 5 public pages (Index, About, Shop, Contact, FAQ) to `site_content` DB table — headlines, CTAs, FAQ Q&As, rotating quotes, and ticker items are now editable live with static hardcoded fallbacks guaranteeing zero visual change on empty DB. ~60 rows seeded via `20260525000001_site_content_expanded.sql`. New `/admin/content` admin tab added with Home/Shop/About/Contact/FAQ page tabs so Opie can edit site copy from the dashboard without developer involvement. **Auth fix:** Added `loadedProfileIdRef` to `AuthContext` so Supabase's `SIGNED_IN` auto-refresh event (which fires on token renewal, not just explicit login) no longer triggers a spurious loading spinner when navigating between the admin and public pages. **Migration sync:** Docker Desktop installed; `supabase db pull` working; migration history fully synced via `supabase migration repair`; missing `client_edit_requests` base table backfilled as `20260508000001`; all remote schema drift (Stripe Postgres sync, pgmq, pg_cron extensions) captured in `20260526231648_remote_schema.sql`. Account page orders/loyalty data now cached via React Query (no spinner on re-visit). | CMS wiring, `/admin/content` tab, auth spinner fix, Docker, db pull, migration backfill | Fulfillment partner; Resend domain verify |
| May 15, 2026 | **Homepage polish + full code audit.** Applied updated `Index.tsx` from Claude Desktop: `TICKER_ITEMS` constant with Opie's 4 Shopify marketing lines + existing quotes; marquee switched from Tailwind `animate-marquee` class to `marquee-scroll` CSS keyframe at 40s with pause-on-hover; marquee respects `prefers-reduced-motion` via CSS media query; hero slide top padding bumped to `pt-28 sm:pt-24 md:pt-28` so headline clears the fixed navbar on mobile. Created `.claude/shared/` communication bridge folder (Index, Footer, Navbar, DropAnnouncementBar, PATCH_INSTRUCTIONS.md) — committed to git. **Code audit pass (11 issues fixed):** `useWishlist` lifted to `WishlistContext` (was creating N auth subscriptions — one per card; now 1 shared instance for the whole app); Contact form wired to Supabase (was fake — submitted nothing); `CustomGarmentRequestModal` fixed dead import path (`@/lib/supabase` → correct client — all custom garment submissions were silently failing); Contact page Instagram + DMs links fixed from `"#"` to real Instagram URL; ProductCard wishlist heart always visible on mobile (was hover-only — touch users couldn't wishlist); cart thumbnail "PNG" text replaced with ShoppingBag icon; DropAnnouncementBar `truncate` → `line-clamp-2` on mobile; star rating touch targets enlarged; `FilterPill` `aria-pressed` added; `ProductDetail` SEO image null-guarded (`product.images?.[0] ?? product.image`); Privacy Policy + Terms of Service pages added to site and Footer. | Index.tsx marquee upgrade, mobile hero nav fix, `.claude/shared/` bridge, Privacy Policy, Terms of Service, Footer links, full audit pass (11 fixes across UX/a11y/perf/bugs) | Fulfillment partner selection; Resend domain verify; CF Email Worker routing rule; npm audit fix |
| May 14, 2026 | **Phase 3 feature sprint.** Shop search (URL-synced `?q=`) + sort (Featured/Price/A→Z). Wishlist system — `wishlists` table, `useWishlist` hook (auth = DB, guest = localStorage), heart toggle on ProductCard, `/wishlist` page, Navbar heart badge. Pour Points loyalty system — `loyalty_accounts` + `loyalty_transactions` tables, `increment_loyalty_points()` SECURITY DEFINER fn, `redeem-points` edge function (generates single-use $5 discount code, deducts 100 pts atomically), `useLoyalty` hook, Account page rewrite with animated balance + progress bar + transaction history, CheckoutReturn shows "+X Pour Points" for auth users. Admin Loyalty panel at `/admin/loyalty` — member table, expandable tx history, manual adjustment modal. Star ratings on ProductCard via shared `useProductRatings` React Query cache. Admin Customer Lookup at `/admin/customers` — email search, stats grid (orders/spend/loyalty/wishlist), expandable order history. Email Subscribers admin at `/admin/subscribers` — list + CSV export + 8-week sparkline. Homepage email capture now saves to `email_subscribers` table (deduplication handled). Organization JSON-LD structured data. Discount Codes admin page (`/admin/discount-codes`) — create/toggle/delete, usage progress bar, status badges. Analytics page and `track-event` edge function scaffolded. Page-view tracking via `useAnalytics` hook. 3 new migrations written. | Wishlist, Pour Points, Admin Loyalty, Customer Lookup, Subscribers, Discount Codes, Shop search/sort, Star ratings, JSON-LD, Analytics scaffolding | Run migrations (wishlists, pour_points, email_subscribers) in Supabase SQL Editor; push to GitHub; wire Stripe fulfillment partner |
| May 9–11, 2026 | **Hygiene + polish sprint.** Diagnosed Apollo Chrome extension as root cause of all fetchProfile timeouts (blocked `/rest/v1/profiles`). Bumped fetchProfile timeout to 12s. Stripped all 12 debug console.log/warn from AuthContext — only real errors remain. Deleted dead files: `src/lib/fulfillment.ts`, `wrangler.jsonc`. Lazy-loaded all non-critical routes in App.tsx (28 components) via `React.lazy()` + Suspense — bundle target <500KB. Added `client_edit_request` email template migration. Fixed VS Code lockfile warning (bun.lock vs package-lock.json). **Homepage redesign** (Opie's 8 client notes): headline rewritten, hero height mobile fix, object-fit mobile fix, button copy updated, marquee speed 20s → 14s, quotes expanded to 10 entries. **Rebuilt EditRequests** as two-column split view (Opie left / Kristin right) with mark-done, archive, inline reply threads, author attribution. **Rebuilt ProjectStatus** page with animated stat cards, 6-phase visual pipeline, 5 tabs (Opie's Tasks / Session Log / Backlog / Fulfillment / Cost), 7 priority action items for Opie. Seeded Opie's 8 client notes into DB (migration `20260509000001`). EIN guidance documented — goes in Stripe Business Details, not DNS. | Dead code deleted, debug logs stripped, lazy routing, homepage changes live, EditRequests rebuilt, ProjectStatus rebuilt, email template migration written | Push to GitHub, run migration in Supabase SQL Editor, delete src/utils/supabase/ + bun.lock from Terminal, npm audit fix from Terminal |
| May 6, 2026 | Built full **Merch Drop Calendar** system. New admin tab at `/admin/merch-drops` with month-grid calendar, click-to-view popups, and full drop builder. Drops include: name/description, scheduling (drop date + ad launch date), product picker with inline Quick Create, flyer/graphic upload to Supabase Storage (`drops` bucket), tag picker (stamp badge or red marker style), site ad placement toggles (announcement bar, hero banner, featured section, shop banner), and full marketing email builder. Site-wide advertisement components wired into public pages (DropAnnouncementBar, DropHeroBanner, DropShopBanner). `process-merch-drops` edge function auto-publishes drops and sends branded pre-shift-meeting email on schedule. Supabase migration `20260506000001_merch_drops.sql` written. TypeScript clean. | Merch Drop Calendar + Builder + Ad system + Email function | Deploy migration, wire process-merch-drops to a cron schedule, push to GitHub |
| May 5, 2026 | Hero mobile fix — `object-contain` so background image shows full on mobile; navbar clearance (`top-16`). Claude Code integrated User Manual into admin dashboard (`/admin/manual`), added HelpPanel (? button in header), ContactKristinModal, and `admin-contact` edge function so Opie can message Kristin directly from the dashboard. Project Status page added as admin tab with Notify Opie button. | Hero fix, User Manual in admin, Contact Kristin modal, Project Status admin tab | Push pending changes, verify mobile hero on live site, select fulfillment partner |
| May 4, 2026 | Phase 2 audit — all prompts already built in code. Stripe checkout debugged and live. Migrated from Stripe hosted redirect to embedded Payment Element (stays on site). Seeded products table (was empty, causing all checkout attempts to fail). Deployed all edge functions via Supabase CLI. Configured `payment_intent.succeeded` webhook. Added live Stripe publishable key to `.env.production`. Verified all secrets set in Supabase. | **Real payments processing on pournogravy.com.** Checkout end-to-end working. Secrets confirmed. | Verify orders flip to 'paid' in DB. Confirm Resend confirmation emails. Select fulfillment partner. |
| April 29, 2026 | Fixed black screen bug (missing `.env.production`). Fixed auth race condition (ProtectedRoute seeing `isAdmin=false` before profile loaded). Identified and fixed admin REVOKE bug. Full code audit — documented all bugs, dead code, missing infra. Updated all docs. Created Phase 2/3 Lovable prompts. Created 3-day developer curriculum (saved to Desktop). | Black screen fixed, auth fixed, GRANT EXECUTE applied, full docs suite created, curriculum created | Stripe secrets, Resend key, seed tables, Storage bucket |
| April 28, 2026 | Initial setup session. Diagnosed CF Pages build command issue. Connected GitHub → Cloudflare Pages (`pournogravydev`). Created full documentation suite. | CF deployment pipeline connected, docs created | Fix CF build command, start Stripe wiring |

---

## ✅ Completed — Full Feature Inventory

### Infrastructure & Deployment
- [x] GitHub repo (`kmitch2087-dot/pournogravy`, master branch)
- [x] Cloudflare Pages connected to GitHub (project: `pournogravydev`)
- [x] `pournogravy.com` domain + SSL active
- [x] SPA routing via `wrangler.toml` (`not_found_handling = "single-page-application"`)
- [x] `.env.production` committed — Vite bakes Supabase vars into CF Pages build at compile time
- [x] All Supabase Edge Function secrets set (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, `RESEND_API_KEY`)
- [x] `VITE_STRIPE_PUBLISHABLE_KEY` added to `.env.production`

### Database (Supabase)
- [x] `products` table + RLS
- [x] `cart_items` table + RLS (guest session_id + auth user_id)
- [x] `orders` + `order_items` tables + RLS
- [x] `custom_requests` table + RLS
- [x] `profiles` table + `is_admin` flag
- [x] `admin_allowlist` — seeded with kmitch2087@gmail.com, kristinmitchell@aethyx.space, aopie91@gmail.com
- [x] `settings` table — seeded with `id=1` row
- [x] `email_templates` table
- [x] `printer_queue` table (written by stripe-webhook on payment)
- [x] `product_reviews` table + RLS (migration 20260504000001)
- [x] `discount_codes` table + RLS (migration 20260504000002)
- [x] Products seeded into DB (all 24 products, migration 20260504000003)
- [x] `is_admin()` SECURITY DEFINER function + GRANT EXECUTE fix applied
- [x] `handle_new_user` trigger — auto-creates profile, checks allowlist for is_admin
- [x] `set_updated_at` trigger on all relevant tables
- [x] Row-Level Security on every table
- [x] `wishlists` table + RLS — migration 20260514000001
- [x] `loyalty_accounts` + `loyalty_transactions` tables + `increment_loyalty_points()` SECURITY DEFINER fn — migration 20260514000002
- [x] `email_subscribers` table + RLS — migration 20260514000003
- [x] `analytics_events` table + RLS — migration 20260511000001
- [x] `site_content` table — CMS page copy; `(page, section, key)` composite unique key + `value` + `default_value` + `value_type` + `sort_order`; ~60 rows seeded across all public pages — migrations 20260522000001 + 20260525000001
- [x] `client_edit_requests` base table — backfilled migration 20260508000001 (was created directly in Supabase dashboard; now tracked locally)

### Edge Functions (Supabase)
- [x] `create-checkout` — creates Stripe PaymentIntent, server-side price + discount validation, returns `clientSecret`
- [x] `stripe-webhook` — handles `payment_intent.succeeded` + `checkout.session.completed`, marks order paid, queues printer_queue entry, **awards Pour Points**
- [x] `send-notification` — Resend-backed email dispatch with template system
- [x] `verify-email` — syntax check, disposable domain blocklist, MX lookup via Cloudflare DNS
- [x] `validate-discount` — validates promo codes against cart total (does NOT increment use_count until checkout)
- [x] `admin-contact` — admin-only; Opie sends a message to Kristin directly from the dashboard; branded email with reply-to
- [x] `notify-project-status` — sends project update email to Opie (aopie91@gmail.com); once-a-day rate limit
- [x] `redeem-points` — exchanges 100 Pour Points for single-use $5 discount code; atomic deduction with optimistic concurrency
- [x] `track-event` — analytics event ingestion (page_view, add_to_cart, purchase, etc.)

### Frontend — Public Pages
- [x] Homepage (hero carousel, INTRO_HOLD_MS intro image, glass card overlay, featured products, email capture now DB-backed, rotating quotes, Organization JSON-LD, TICKER_ITEMS marquee with pause-on-hover + `prefers-reduced-motion`)
- [x] Shop (full catalog, published filter, URL-synced search `?q=`, sort: Featured/Price/A→Z `?sort=`)
- [x] Product detail (variants, colors, gallery, cart add, custom request modal, reviews display)
- [x] Collections
- [x] About
- [x] Contact (wired to Supabase — submits to `custom_requests` with `garment='contact-form'`; Instagram link live)
- [x] FAQ
- [x] 404
- [x] `/proposal` — Founding Client Offer page (wholesale/partnership pitch)
- [x] `/wishlist` — saved products page (auth = DB, guest = localStorage)
- [x] `/privacy` — Privacy Policy page
- [x] `/terms` — Terms of Service page

### Frontend — Admin Dashboard (`/admin`)
- [x] Admin Login
- [x] Dashboard (overview)
- [x] Products (list + edit)
- [x] Orders (real DB data, status management)
- [x] Custom Requests
- [x] Reviews (approval queue)
- [x] Settings
- [x] User Manual (`/admin/manual` — full operational guide for Opie)
- [x] **Project Status (`/admin/project-status` — Notify Opie button)**
- [x] HelpPanel (? button in header — quick-reference slide-out)
- [x] ContactKristinModal — Opie can message Kristin directly; sends branded email
- [x] **EditRequests (`/admin/edit-requests`)** — split-view notes system (Opie left / Kristin right), mark done, archive, inline reply threads, author-attributed messages, DB-backed with RLS
- [x] **Analytics (`/admin/analytics`)** — page views, events, top pages table
- [x] **Pour Points Loyalty (`/admin/loyalty`)** — member table, transaction history, manual adjustment modal
- [x] **Customer Lookup (`/admin/customers`)** — email search, stats grid (orders/spend/loyalty/wishlist), expandable order history
- [x] **Email Subscribers (`/admin/subscribers`)** — list, CSV export, 8-week sparkline
- [x] **Discount Codes (`/admin/discount-codes`)** — create/toggle/delete, usage progress bar, status badges (Active/Inactive/Expired/Exhausted)
- [x] **Content (`/admin/content`)** — Home/Shop/About/Contact/FAQ tabs; edit all public page copy live via `site_content` DB table (no deploy required)

### Frontend — Components
- [x] Navbar (cart icon + count, wishlist heart badge, responsive)
- [x] Cart drawer (right slide-out, guest + auth, discount code field)
- [x] Product card (wishlist heart toggle, star rating display)
- [x] Custom garment request modal
- [x] Footer
- [x] ProtectedRoute (admin gate with loading wait)
- [x] AdminLayout with mobile sidebar
- [x] SEO component (`react-helmet-async`) — applied to all public pages + JSON-LD support
- [x] `og-default.jpg` Open Graph image
- [x] `sitemap.xml` + `robots.txt` in `public/`

### Auth & Cart
- [x] AuthContext — onAuthStateChange listener + race condition fix
- [x] Guest cart (session_id) + Auth cart (user_id)
- [x] Cart context (add / remove / update quantity / apply discount)
- [x] `useMergedProducts()` — merges static + DB products; DB takes precedence by slug
- [x] `WishlistContext` — single shared auth subscription for entire app; `useWishlist` re-exports from context

### Payments
- [x] Stripe embedded Payment Element (stays on site, no redirect)
- [x] `Checkout.tsx` — branded dark/yellow page with Stripe Payment Element
- [x] `CheckoutReturn.tsx` — order confirmed screen, clears cart
- [x] Guest email capture at checkout
- [x] Discount code validation at checkout (server-side via `validate-discount`)

### SEO & Discoverability
- [x] Page titles, meta descriptions, Open Graph tags on all public pages
- [x] `sitemap.xml` (all public routes)
- [x] `robots.txt` with sitemap reference

### Documentation
- [x] `CLAUDE.md` — session instructions (project + global)
- [x] `docs/EXECUTIVE_SUMMARY.md` — client/investor-facing overview
- [x] `docs/USER_MANUAL.md` — Opie's operational guide
- [x] `docs/HANDOFF.md` — full technical dev handoff
- [x] `docs/PROJECT_STATUS.md` — this file
- [x] `docs/COST_ANALYSIS.md` — market rate vs. actual cost
- [x] `docs/LOVABLE_PHASE2_PHASE3.md` — Phase 2/3 Lovable prompt scripts
- [x] 3-day developer curriculum (`~/Desktop/PG_Dev_Curriculum/`) — Day 1 (Web/DNS/Vite), Day 2 (Auth/DB/Security), Day 3 (Payments/Email/Deploy) + Quiz

---

## 📋 Remaining Backlog

### 🔴 Before Real Customer Orders

- [ ] Select fulfillment partner (Printful or Printify) and wire API key into `stripe-webhook`
- [ ] Verify `opie@pournogravy.com` confirmed as sender domain in Resend (Resend → Domains)
- [x] Seed `email_templates` — `client_edit_request` row added (migration 20260509000002); `order_confirmation` was already seeded in original migration
- [ ] Create Supabase Storage `products` bucket with public read (ProductEdit image upload needs it)
- [ ] Switch Stripe to test mode for QA, then back to live before launch

### 🟡 Code Hygiene (Won't Break Anything, But Should Be Done)

- [ ] Delete `src/utils/supabase/` — dead second Supabase client, never used (confirmed still present)
- [x] Delete `src/lib/fulfillment.ts` — DELETED ✓
- [x] Delete `wrangler.jsonc` — DELETED ✓
- [ ] Fix `.env.local` — rename `VITE_SUPABASE_PUBLISHABLE_KEY` → `VITE_SUPABASE_ANON_KEY` for local dev
- [ ] Delete deprecated `main` branch from GitHub
- [ ] Delete 4 duplicate Lovable repos from GitHub (hash-suffixed repos)
- [ ] `npm audit fix` — 19 vulnerabilities (none critical)

### 🟢 Phase 3 Features

- [ ] Cloudflare Workers — proxy Supabase calls server-side (security hardening)
- [x] Analytics — `track-event` edge fn + `analytics_events` table + Admin Analytics page
- [x] CMS content editing — all public page copy editable from `/admin/content` via `site_content` table
- [ ] Cart merge on login (guest → auth cart merge)
- [x] Bundle size optimization — all non-critical routes lazy-loaded via React.lazy() + Suspense
- [ ] Email marketing integration (Klaviyo or Mailchimp) for captured emails
- [x] Pour Points loyalty program (earn on purchase, redeem for $5 discount codes)
- [x] Wishlist / Save for later (heart toggle on cards, `/wishlist` page)
- [x] Product search + filter (URL-synced `?q=` + `?sort=` in Shop)
- [ ] International shipping config
- [ ] Wholesale portal (foundation exists at `/proposal`)

---

## 🚫 Known Issues

| Issue | Severity | Status | Fix |
|-------|---------|--------|-----|
| Fulfillment not wired | 🔴 Critical | Open | Select Printful/Printify, add API key to stripe-webhook |
| Email templates not seeded | 🟡 Medium | Partial — needs db push | `order_confirmation` was already seeded. `client_edit_request` migration written (20260509000002) — push to Supabase |
| Storage bucket missing | 🔴 High | Open | Create `products` bucket in Supabase Storage |
| `src/utils/supabase/` dead code | 🟡 Medium | Open | Delete folder |
| `src/lib/fulfillment.ts` dead code | 🟡 Medium | ✅ Resolved | Deleted |
| `wrangler.jsonc` duplicate | 🟡 Medium | ✅ Resolved | Deleted |
| Local dev env var mismatch | 🟡 Medium | Open | Rename key in `.env.local` |
| 5 npm vulnerabilities | 🟡 Low | Needs Terminal | Run `npm audit fix` from Terminal in project root. Note: esbuild/Vite moderate vuln requires `--force` (Vite 8 upgrade) — dev-server-only risk, safe to defer. |
| Bundle ~972KB | 🟡 Low | ✅ Resolved | Lazy-loaded 28 routes via React.lazy() + Suspense |
| Auth spinner on Supabase token refresh | 🟡 Medium | ✅ Resolved | `loadedProfileIdRef` in AuthContext guards `setLoading(true)` — only sets loading on SIGNED_IN if it's a different user than the already-loaded profile (commit 4456f80) |

---

## Cloudflare Notes

⚠️ Active CF Pages project is **`pournogravydev`** — NOT `pournogravy` (that project has no git connection and is abandoned).

- Build command: `npm run build`
- Output dir: `dist`
- Repo: `kmitch2087-dot/pournogravy` → master branch
- Deploy time: ~2 min after push

---

*This document is updated at the end of each development session. Dates reflect system-recognized milestones across multiple AI development tools, not calendar hours worked.*
