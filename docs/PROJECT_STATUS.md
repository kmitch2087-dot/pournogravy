# Pournogravy — Project Status
**Maintained by:** Kristin Mitchell — Aethyx  
**Live Site:** [pournogravy.com](https://pournogravy.com)  
**Repository:** [kmitch2087-dot/pournogravy](https://github.com/kmitch2087-dot/pournogravy)

> **Note on dates:** This project is built using multiple AI-assisted development tools (Lovable, Claude Code, Claude Cowork, and others). Entries in this log reflect updates recognized and logged by those systems — not necessarily the literal date the work was performed. Development often happens across tools simultaneously; the log captures progress milestones, not calendar hours.

---

## Current Phase
**Phase:** Post-launch (soft) — Active Build  
**Status:** Site is live. Real payment processing active. Admin dashboard fully operational. CF Email Worker **deployed** (via CF REST API) + both secrets set. Print files **74/74** uploaded to Supabase Storage. One manual step remaining: update CF email routing rule to point `opie@pournogravy.com → pournogravy-receive-email` worker.

---

## Session Log (Latest First)

| Date | Summary | Completed | Next Up |
|------|---------|-----------|---------| 
| June 11, 2026 | **Opie's full copy pass + product page overhaul.** DB: Updated all 24 products with Opie's exact `description`, `long_description`, `humor`, and `bad_advice` copy. Removed 3XL from all product sizes. Updated `site_content` — hero heading, CTA text ("OUR FULL MENU"), shop page heading/label; confirmed manifesto + superpowers + extras already matched spec. Marquee replaced with "Drink more, Bitch less, Tip big, Stay moist!" (repeated, seamless loop). Marked 29 `client_edit_requests` done + archived. Code: Fixed `productSource.ts` to read `long_description` (text[]) instead of `description_long` (Stripe jsonb); mapped `bad_advice` JSON array to `{ title: "", paragraphs }`. `ProductDetail.tsx` now uses `useMergedProducts()` — DB data overrides static. Layout: moved "My Name is Opie..." humor block above price; replaced old italic callout with yellow bordered box + `whitespace-pre-line` conversation rendering; removed white h3 title from Bad Bartender Advice box, enlarged paragraphs to `text-lg`. Index.tsx: badge delay reduced 1500ms → 800ms; glass headline top position fixed for mobile navbar clearance (`top-16`); hero section height reduced (`min-h-55vh` mobile); carousel images switched to `object-contain`; marquee copy updated. | All 9 spec parts complete; TypeScript clean | Push to GitHub; verify product pages show Opie's copy on live site; test marquee on mobile Safari |
| June 9, 2026 | **CF Worker deployed + print files completed.** Deployed `pournogravy-receive-email` CF Worker via CF REST API (bypassed broken wrangler auth entirely — used `PUT /accounts/{id}/workers/scripts/pournogravy-receive-email` multipart upload with esbuild-bundled ESM). Set both Worker secrets (`RECEIVE_EMAIL_SECRET`, `SUPABASE_URL`) via CF secrets API. Completed print file uploads: 74/74 PNGs in Supabase Storage `print-files` bucket (37 black + 37 white). Cleaned up: dropped temp anon upload + delete RLS policies, deleted 18 duplicate `black/black/` files, deleted test file. | CF Worker deployed, 74 print PNGs confirmed, temp policies dropped, dupes cleaned | **[Manual]** CF Dashboard → Email → Email Routing → update rule for `opie@pournogravy.com` → `pournogravy-receive-email`; place test order |
| June 8–9, 2026 | **Rich Email Templates page + CF Email Worker + send-notification param fixes.** Built `src/pages/admin/EmailTemplates.tsx` (~600 lines) — full-featured admin email editor replacing the old Settings tab. Features: left sidebar with template list + hover actions (duplicate/delete), editable template name, subject input, 4-tab editor (Visual/HTML/Preview/Plain Text), rich text toolbar (undo/redo, bold/italic/underline/strike, headings, text+bg color picker, align, lists, link, image, HR, remove format), click-to-insert `{{variable}}` chips, live sandboxed iframe preview with desktop/mobile toggle and per-variable fill inputs, auto-generate plain text from HTML, test email send via `send-notification` edge fn. All using `contenteditable` + `document.execCommand()` — no new npm packages. Fixed `send-notification` param mismatch (3 files: `Contact.tsx`, `CustomGarmentRequestModal.tsx`, `EmailTemplates.tsx` — changed `to`/`template_key` → `recipient`/`templateKey`). Built CF Email Worker in `cloudflare-workers/receive-email/` (postal-mime + HMAC auth + posts to Supabase `receive-email` fn). Redeployed `receive-email` Supabase edge fn with `verify_jwt: false` (was incorrectly `true` — would reject CF worker calls). Set `RECEIVE_EMAIL_SECRET` in Supabase secrets. Committed + pushed all changes (commit `dafb7a0..1429fd4`). | Rich Email Templates page, send-notification param fixes, CF Worker files created, receive-email edge fn redeployed (verify_jwt: false), RECEIVE_EMAIL_SECRET set in Supabase, all committed + pushed to GitHub | Deploy CF Worker, set Email Routing rule in CF Dashboard |
| June 8, 2026 | **Fulfillment email pipeline — fully wired.** Rotated + set all Supabase edge function secrets: `STRIPE_SECRET_KEY` (was truncated from prior session), `STRIPE_WEBHOOK_SIGNING_SECRET` (fixed doubled `whsec_` prefix), `RESEND_API_KEY`, `FULFILLMENT_SECRET` (new — signs printer tracking magic links). Confirmed Resend domain for pournogravy.com is verified for outbound sending (DKIM+SPF ✅; inbound MX fails due to GoDaddy conflict — non-blocking). Created `print-files` Supabase Storage bucket with public SELECT policy; uploaded 74 print-ready PNGs to `print-files/black/` and `print-files/white/` via supabase CLI retry loop. Updated `stripe-webhook` (v29): removed DB lookup for print_file_url, replaced with slug-based Supabase Storage URLs (`print-files/{color}/{slug}_{color}.png`); added `design_links` variable per order item in printer email; added CC copy of printer notification to `kmitch2087@gmail.com` for test review. Updated `printer_notification` email template with 🎨 Print Files section (pre-formatted with black+white URLs). Confirmed `submit-tracking` edge function already deployed (v2). Removed temp anon INSERT RLS policy from `print-files` bucket. Cleaned up 18 doubled-path files (`black/black/`). Created `products` Storage bucket (public read) for admin product image uploads. **Lovable disconnected** — Claude (Cowork) is now the exclusive builder. Updated CLAUDE.md. | Stripe/Resend/Fulfillment secrets set, print-files Storage bucket + 74 PNGs, stripe-webhook design URLs + CC, printer_notification template updated, submit-tracking confirmed, Lovable removed | Place test order; move opie@pournogravy.com off GoDaddy |
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
- [x] SPA routing via `404.html` (copy of `index.html`; CF Pages "Pretty URLs" enabled)
- [x] `.env.production` committed — Vite bakes Supabase vars into CF Pages build at compile time
- [x] All Supabase Edge Function secrets set (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, `RESEND_API_KEY`, `FULFILLMENT_SECRET`, `RECEIVE_EMAIL_SECRET`)

### Database (Supabase)
- [x] `products`, `cart_items`, `orders`, `order_items`, `custom_requests` tables + RLS
- [x] `profiles` + `admin_allowlist` + `settings` + `email_templates` + `printer_queue`
- [x] `product_reviews`, `discount_codes`, `wishlists`, `loyalty_accounts`, `loyalty_transactions`
- [x] `email_subscribers`, `analytics_events`, `site_content`, `client_edit_requests`
- [x] `inbox_messages` — inbound email storage (thread_id, kind, status, message_id uniqueness)
- [x] All SECURITY DEFINER functions + triggers + RLS policies
- [x] Products seeded (24 products, migration 20260504000003)
- [x] `site_content` seeded (~60 rows, migrations 20260522000001 + 20260525000001)

### Supabase Storage
- [x] `print-files` bucket — **74 PNGs** (37 black + 37 white), public read, temp policies cleaned up
- [x] `products` bucket — public read, for admin product image uploads
- [x] `drops` bucket — for merch drop flyer uploads

### Edge Functions (Supabase)
- [x] `create-checkout`, `stripe-webhook`, `submit-tracking`, `send-notification`, `verify-email`
- [x] `validate-discount`, `admin-contact`, `notify-project-status`, `redeem-points`, `track-event`
- [x] `receive-email` (v11) — inbound email webhook; `verify_jwt: false`; stores in `inbox_messages`; alerts aopie91@gmail.com via Resend

### Frontend — Public Pages
- [x] Homepage, Shop, Product detail, Collections, About, Contact, FAQ, 404, `/proposal`, `/wishlist`, `/privacy`, `/terms`

### Frontend — Admin Dashboard (`/admin`)
- [x] Login, Dashboard, Products, Orders, Custom Requests, Reviews, Settings
- [x] User Manual, Project Status, HelpPanel, ContactKristinModal
- [x] EditRequests, Analytics, Pour Points Loyalty, Customer Lookup, Email Subscribers, Discount Codes, Content
- [x] **Inbox (`/admin/inbox`)** — full inbox UI for `inbox_messages`
- [x] **Email Templates (`/admin/email-templates`)** — rich contenteditable editor, Visual/HTML/Preview/Plain Text tabs, toolbar, variable palette, live preview, test send

### CF Email Worker
- [x] `cloudflare-workers/receive-email/src/index.ts` — postal-mime parser → posts to `receive-email` Supabase fn
- [x] Worker **deployed** as `pournogravy-receive-email` via CF REST API
- [x] `RECEIVE_EMAIL_SECRET` + `SUPABASE_URL` set as Worker secrets
- [ ] **⚠️ ONE MANUAL STEP:** CF Dashboard → pournogravy.com → Email → Email Routing → Routing Rules → edit `opie@pournogravy.com` rule → change destination from `wild-mouse-2b64` → `pournogravy-receive-email`

---

## 📋 Remaining Backlog

### 🔴 Needs Manual Action

- [ ] **CF Email routing rule** — CF Dashboard → pournogravy.com → Email → Email Routing → Routing Rules → edit `opie@pournogravy.com` → change Worker from `wild-mouse-2b64` → `pournogravy-receive-email`
- [ ] **Place test order** — verify customer confirmation + printer email both land correctly
- [ ] Move `opie@pournogravy.com` off GoDaddy → Resend inbound (non-urgent, outbound works)

### 🟡 Code Hygiene

- [ ] Delete `src/utils/supabase/` — dead second Supabase client
- [ ] Fix `.env.local` — rename `VITE_SUPABASE_PUBLISHABLE_KEY` → `VITE_SUPABASE_ANON_KEY`
- [ ] Delete deprecated `main` branch from GitHub
- [ ] `npm audit fix` — 19 vulnerabilities (none critical)

### 🟢 Phase 3

- [ ] Cart merge on login (guest → auth)
- [ ] Email marketing integration (Klaviyo or Mailchimp)
- [ ] International shipping config
- [ ] Wholesale portal (foundation at `/proposal`)

---

## 🚫 Known Issues

| Issue | Severity | Status | Fix |
|-------|---------|--------|-----|
| CF email routing rule not updated | 🟡 Medium | Open | CF Dashboard → Email Routing → update rule (manual, 30 seconds) |
| Test order not placed | 🔴 High | Open | Place test order end-to-end |
| `src/utils/supabase/` dead code | 🟡 Medium | Open | Delete folder |
| Local dev env var mismatch | 🟡 Medium | Open | Rename key in `.env.local` |
| npm vulnerabilities | 🟡 Low | Open | `npm audit fix` |

---

## Cloudflare Notes

⚠️ Active CF Pages project is **`pournogravydev`** — NOT `pournogravy` (abandoned).

- Build command: `npm run build`
- Output dir: `dist`
- Repo: `kmitch2087-dot/pournogravy` → master branch

---

*Updated end of session June 9, 2026.*
