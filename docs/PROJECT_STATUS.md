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

### Edge Functions (Supabase)
- [x] `create-checkout` — creates Stripe PaymentIntent, server-side price + discount validation, returns `clientSecret`
- [x] `stripe-webhook` — handles `payment_intent.succeeded` + `checkout.session.completed`, marks order paid, queues printer_queue entry
- [x] `send-notification` — Resend-backed email dispatch with template system
- [x] `verify-email` — syntax check, disposable domain blocklist, MX lookup via Cloudflare DNS
- [x] `validate-discount` — validates promo codes against cart total (does NOT increment use_count until checkout)
- [x] `admin-contact` — admin-only; Opie sends a message to Kristin directly from the dashboard; branded email with reply-to
- [x] `notify-project-status` — sends project update email to Opie (aopie91@gmail.com); once-a-day rate limit

### Frontend — Public Pages
- [x] Homepage (hero carousel, INTRO_HOLD_MS intro image, glass card overlay, featured products, email capture, rotating quotes)
- [x] Shop (full catalog, published filter, sort)
- [x] Product detail (variants, colors, gallery, cart add, custom request modal, reviews display)
- [x] Collections
- [x] About
- [x] Contact
- [x] FAQ
- [x] 404
- [x] `/proposal` — Founding Client Offer page (wholesale/partnership pitch)

### Frontend — Admin Dashboard (`/admin`)
- [x] Admin Login
- [x] Dashboard (overview)
- [x] Products (list + edit)
- [x] Orders (real DB data, status management)
- [x] Custom Requests
- [x] Reviews (approval queue)
- [x] Settings
- [x] User Manual (`/admin/manual` — full operational guide for Opie)
- [x] **Project Status (`/admin/project-status` — this page; Notify Opie button)**
- [x] HelpPanel (? button in header — quick-reference slide-out)
- [x] ContactKristinModal — Opie can message Kristin directly; sends branded email

### Frontend — Components
- [x] Navbar (cart icon + count, responsive)
- [x] Cart drawer (right slide-out, guest + auth, discount code field)
- [x] Product card
- [x] Custom garment request modal
- [x] Footer
- [x] ProtectedRoute (admin gate with loading wait)
- [x] AdminLayout with mobile sidebar
- [x] SEO component (`react-helmet-async`) — applied to all 8 public pages
- [x] `og-default.jpg` Open Graph image
- [x] `sitemap.xml` + `robots.txt` in `public/`

### Auth & Cart
- [x] AuthContext — onAuthStateChange listener + race condition fix
- [x] Guest cart (session_id) + Auth cart (user_id)
- [x] Cart context (add / remove / update quantity / apply discount)
- [x] `useMergedProducts()` — merges static + DB products; DB takes precedence by slug

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
- [ ] Seed `email_templates` — insert `order_confirmation` + `custom_request` rows
- [ ] Create Supabase Storage `products` bucket with public read (ProductEdit image upload needs it)
- [ ] Switch Stripe to test mode for QA, then back to live before launch

### 🟡 Code Hygiene (Won't Break Anything, But Should Be Done)

- [ ] Delete `src/utils/supabase/` — dead second Supabase client, never used
- [ ] Delete `src/lib/fulfillment.ts` — dead code, misleadingly named
- [ ] Delete `wrangler.jsonc` — duplicate of `wrangler.toml`
- [ ] Fix `.env.local` — rename `VITE_SUPABASE_PUBLISHABLE_KEY` → `VITE_SUPABASE_ANON_KEY` for local dev
- [ ] Delete deprecated `main` branch from GitHub
- [ ] Delete 4 duplicate Lovable repos from GitHub (hash-suffixed repos)
- [ ] `npm audit fix` — 19 vulnerabilities (none critical)

### 🟢 Phase 3 Features

- [ ] Cloudflare Workers — proxy Supabase calls server-side (security hardening)
- [ ] Analytics — Cloudflare Web Analytics or Plausible
- [ ] Cart merge on login (guest → auth cart merge)
- [ ] Bundle size optimization (currently ~972KB; lazy-load routes for <500KB target)
- [ ] Email marketing integration (Klaviyo or Mailchimp) for captured emails
- [ ] Pour Points loyalty program
- [ ] Wishlist / Save for later
- [ ] Product search + filter by category
- [ ] International shipping config
- [ ] Wholesale portal (foundation exists at `/proposal`)

---

## 🚫 Known Issues

| Issue | Severity | Status | Fix |
|-------|---------|--------|-----|
| Fulfillment not wired | 🔴 Critical | Open | Select Printful/Printify, add API key to stripe-webhook |
| Email templates not seeded | 🔴 High | Open | INSERT rows for order_confirmation + custom_request |
| Storage bucket missing | 🔴 High | Open | Create `products` bucket in Supabase Storage |
| `src/utils/supabase/` dead code | 🟡 Medium | Open | Delete folder |
| `src/lib/fulfillment.ts` dead code | 🟡 Medium | Open | Delete file |
| `wrangler.jsonc` duplicate | 🟡 Medium | Open | Delete file |
| Local dev env var mismatch | 🟡 Medium | Open | Rename key in `.env.local` |
| 19 npm vulnerabilities | 🟡 Low | Open | `npm audit fix` |
| Bundle 972KB | 🟡 Low | Open | Lazy-load routes in App.tsx |

---

## Cloudflare Notes

⚠️ Active CF Pages project is **`pournogravydev`** — NOT `pournogravy` (that project has no git connection and is abandoned).

- Build command: `npm run build`
- Output dir: `dist`
- Repo: `kmitch2087-dot/pournogravy` → master branch
- Deploy time: ~2 min after push

---

*This document is updated at the end of each development session. Dates reflect system-recognized milestones across multiple AI development tools, not calendar hours worked.*
