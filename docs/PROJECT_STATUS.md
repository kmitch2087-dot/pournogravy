# Pournogravy — Project Status (Kristin's Internal Tracker)
**Last Updated:** April 29, 2026
**Updated by:** Kristin Mitchell — Aethyx

> This doc is for Kristin only. Update it at the end of every session. It is the source of truth for what's done, what's in progress, and what's next.

---

## Current Phase
**Phase:** Post-launch (soft) / Active Build — Session 2 Complete
**Status:** Site is live at pournogravy.com. Black screen bug FIXED. Auth race condition FIXED. Admin login root cause IDENTIFIED (needs one SQL fix tomorrow). Stripe still not wired up.

---

## ✅ Completed Milestones

### Infrastructure
- [x] GitHub repo created (`kmitch2087-dot/pournogravy`, master branch)
- [x] Cloudflare Pages connected to GitHub (project: `pournogravydev`)
- [x] pournogravy.com domain configured
- [x] SSL/HTTPS active
- [x] Supabase project created and connected
- [x] `.env.production` committed — guarantees Vite reads Supabase vars at CF Pages build time
- [x] `wrangler.toml` SPA routing config (`not_found_handling = "single-page-application"`)

### Database
- [x] Migration 001 — products, cart_items, orders, order_items tables + RLS
- [x] Migration 002 — custom_requests table + RLS
- [x] Migration 003 — `is_admin()` SECURITY DEFINER function + profiles table + RLS
- [x] Migration 004 — admin_allowlist table seeded (kmitch2087@gmail.com, kristinmitchell@aethyx.space, aopie91@gmail.com)
- [x] `handle_new_user` trigger updated to consult allowlist instead of hardcoded emails
- [x] Row-Level Security policies on all tables
- [x] `set_updated_at` trigger function

### Frontend — Pages
- [x] Homepage (hero carousel, featured products, email capture, rotating quotes)
- [x] Shop page (full catalog, published filter)
- [x] Product detail page (variants, colors, gallery, cart add, custom request modal)
- [x] Collections page
- [x] About page
- [x] Contact page
- [x] FAQ page
- [x] 404 page
- [x] Admin Dashboard
- [x] Admin Settings page
- [x] Admin Product Edit page
- [x] Admin Login page

### Frontend — Components
- [x] Navbar with cart icon and count
- [x] Cart drawer (right slide-out)
- [x] Product card (image, name, price, humor)
- [x] Custom garment request modal
- [x] Footer
- [x] ProtectedRoute (admin gate)
- [x] AdminLayout

### Product Data
- [x] Product data structure (variants, colors, images, humor, badAdvice)
- [x] Men's / Women's fit variants on all products
- [x] Black / Cream color options on all products
- [x] Humor-forward copy on all products
- [x] Published + featured flags
- [x] `useMergedProducts()` hook (merges static + DB products, DB takes precedence by slug)

### Cart
- [x] Guest cart (session_id based)
- [x] Auth cart (user_id based)
- [x] Cart context with add/remove/update
- [x] Cart persists across sessions

### Edge Functions (Supabase)
- [x] `create-checkout` — Stripe Checkout session creator (server-side price validation)
- [x] `stripe-webhook` — handles checkout.session.completed, marks order paid, queues notification
- [x] `send-notification` — Resend-backed email dispatch with template system
- [x] `verify-email` — public endpoint, disposable domain blocklist, MX lookup via Cloudflare DNS

### Auth & Session
- [x] AuthContext with onAuthStateChange listener
- [x] Race condition FIX — `setLoading(true)` before fetchProfile, cleared in `.finally()`
- [x] ProtectedRoute correctly waits on `loading` before evaluating `isAdmin`

### Documentation
- [x] CLAUDE.md — session instructions and reminders
- [x] docs/EXECUTIVE_SUMMARY.md
- [x] docs/USER_MANUAL.md
- [x] docs/HANDOFF.md
- [x] docs/PROJECT_STATUS.md
- [x] docs/COST_ANALYSIS.md

---

## 🔴 FIRST THING TOMORROW — CRITICAL SQL FIX

Before touching ANYTHING else, run this in the Supabase SQL Editor:

```sql
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
```

**Why:** Migration `20260428153423` ran `REVOKE ALL ON FUNCTION public.is_admin(uuid)`. The profiles SELECT RLS policy calls `is_admin()` — when that call fails, `fetchProfile` returns nothing, `isAdmin` stays false, and admin login appears broken even though `is_admin = true` in the DB.

**How to get there:** supabase.com → Project: Pournogravy → SQL Editor → paste + run.

---

## 🔄 In Progress / This Session

| Task | Priority | Status | Notes |
|------|---------|--------|-------|
| Black screen bug (missing env vars) | 🔴 Critical | ✅ FIXED | Committed `.env.production`; push `7891e59` deployed |
| Auth race condition ("NOT ON THE LIST") | 🔴 Critical | ✅ FIXED | `setLoading(true)` in onAuthStateChange before fetchProfile |
| Admin REVOKE bug | 🔴 Critical | ⚠️ IDENTIFIED | Needs SQL fix above — NOT yet applied |
| Update all project docs | 🟡 Medium | ✅ DONE | This session |
| Phase 2 & 3 Lovable prompts | 🟡 Medium | ✅ DONE | See `docs/LOVABLE_PHASE2_PHASE3.md` |
| 3-day developer curriculum | 🟡 Medium | ✅ DONE | See `~/Desktop/PG_Dev_Curriculum/` |

---

## 📋 Backlog (Prioritized)

### 🔴 Must-Do Before ANY Marketing

1. **Run GRANT EXECUTE SQL fix** (admin login broken until this is done)
2. **Stripe secrets** — add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to Supabase Edge Function secrets (Dashboard → Edge Functions → Secrets)
3. **Resend API key** — add `RESEND_API_KEY` to Supabase Edge Function secrets; verify `opie@pournogravy.com` as a sender domain in Resend
4. **Stripe integration** — endpoint wiring is built; secrets just need to be set
5. **Fulfillment partner** — select Printful or Printify; wire API key into stripe-webhook edge function
6. **Seed settings table** — run: `INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;` (Admin Settings page breaks without row id=1)
7. **Seed email_templates table** — insert order confirmation + custom request templates (send-notification function needs these)
8. **Supabase Storage bucket** — create `products` bucket with public read in Supabase Storage (ProductEdit upload breaks without it)

### 🟡 High Priority (Before Soft Launch Promo)

- [ ] Delete `wrangler.jsonc` — `wrangler.toml` already handles SPA routing; having both can cause CF confusion
- [ ] Fix `.env.local` — change `VITE_SUPABASE_PUBLISHABLE_KEY` → `VITE_SUPABASE_ANON_KEY` so local dev matches prod
- [ ] Delete `src/utils/supabase/` folder — dead code (second Supabase client, never used)
- [ ] Delete `src/lib/fulfillment.ts` — dead code (misleadingly labeled; edge function has its own inline logic)
- [ ] SEO — meta tags, Open Graph images, sitemap.xml, robots.txt
- [ ] Admin dashboard — finish wiring real data (orders, products from DB)
- [ ] Email marketing — captured emails → Klaviyo or Mailchimp
- [ ] Cart merge on login (guest → auth cart merging)
- [ ] Fix CartContext — hydrate from DB products (currently static-only; DB-only products dropped on refresh)

### 🟢 Medium Priority

- [ ] Run `npm audit fix` — 19 vulnerabilities flagged
- [ ] Bundle size optimization — currently 972KB (target <500KB); lazy-load routes
- [ ] Discount / promo code system
- [ ] Product reviews
- [ ] Delete deprecated `main` branch from GitHub
- [ ] Delete 4 duplicate Lovable repos from GitHub
- [ ] Order confirmation email to customer (wired but needs Resend key + templates)

### ⚪ Nice to Have

- [ ] Cloudflare Workers — proxy Supabase calls server-side (security hardening)
- [ ] Analytics (Cloudflare Web Analytics or Plausible)
- [ ] Wishlist / Save for later
- [ ] Product search / filter by category
- [ ] International shipping configuration
- [ ] Wholesale portal

---

## 🚫 Known Bugs & Blockers

| Bug | Severity | Root Cause | Fix |
|-----|---------|-----------|-----|
| Admin login not recognized | 🔴 Critical | Migration REVOKE'd `is_admin()` execute permission | `GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;` |
| Local dev Supabase client broken | 🔴 High | `.env.local` uses `VITE_SUPABASE_PUBLISHABLE_KEY`, client reads `VITE_SUPABASE_ANON_KEY` | Rename key in `.env.local` |
| Admin Settings page crashes | 🔴 High | `settings` table needs row with id=1 | `INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;` |
| Admin product image upload broken | 🔴 High | Supabase Storage `products` bucket doesn't exist | Create bucket in Supabase Storage |
| Cart drops DB-only products on refresh | 🟡 Medium | CartContext hydrates from static `products.ts` only | Update CartContext to use `useMergedProducts()` |
| Checkout doesn't process payments | 🔴 Critical | Stripe secrets not set in edge function env | Set secrets in Supabase Dashboard |
| Order emails not sending | 🟡 Medium | Resend API key not configured | Set `RESEND_API_KEY` secret |
| Two Supabase clients in codebase | 🟡 Medium | `src/utils/supabase/` is a dead second instance | Delete `src/utils/supabase/` |
| Two wrangler config files | 🟡 Medium | `wrangler.toml` + `wrangler.jsonc` both exist | Delete `wrangler.jsonc` |
| 19 npm vulnerabilities | 🟡 Medium | Outdated deps | `npm audit fix` |
| Bundle 972KB (uncompressed) | 🟡 Medium | No code splitting | Lazy-load routes in App.tsx |

---

## Session Log

| Date | Session Summary | Completed | Next Steps |
|------|----------------|-----------|-----------|
| April 28, 2026 | Diagnosed CF build command issue. Created full docs suite. | Doc suite created, CF issue diagnosed | Fix CF build command, start Stripe |
| April 29, 2026 (Session 2) | Fixed black screen (`.env.production`). Fixed auth race condition (AuthContext). Identified admin REVOKE bug. Full code audit (bugs, dead code, missing infra). Updated all docs. Created Phase 2/3 Lovable prompts. Created 3-day dev curriculum. | Black screen fixed, auth fixed, docs updated, curriculum created | **First: run GRANT EXECUTE SQL**. Then: Stripe secrets, Resend key, seed tables, Storage bucket |

---

## Cloudflare Project Notes

⚠️ **Active CF Pages project is `pournogravydev`** — this is the one with the GitHub connection and is what deploys to pournogravy.com. NOT the project named `pournogravy` (that one has no git connection and is abandoned).

Build settings for `pournogravydev`:
- Build command: `npm run build`
- Output directory: `dist`
- GitHub repo: `kmitch2087-dot/pournogravy` (master branch)

---

*Update the Session Log and Backlog at the end of every session.*
| May 4, 2026 (Session 3) | Phase 2 audit — all 4 prompts already built in code. Stripe checkout debugged and working. Switched from Stripe hosted checkout to embedded Payment Element (stay on site). Seeded products table. Deployed edge functions via Supabase CLI. Webhook configured for payment_intent.succeeded. Live Stripe key added to .env.production. | **Checkout live — real payments processing on pournogravy.com** | Verify orders flip to paid in DB. Confirm Resend emails sending. Add fulfillment partner. Phase 3. |
| May 5, 2026 (Session 4) | Hero bg image fix: object-contain on mobile (no more zoomed crop), navbar clearance fix (top-16). Claude Code integrated User Manual into admin dashboard — new /admin/manual page + HelpPanel (? button in header). All changes uncommitted pending push. | Hero fix committed, User Manual in admin | Push changes, verify mobile hero deploy, decide test vs live Stripe keys |
