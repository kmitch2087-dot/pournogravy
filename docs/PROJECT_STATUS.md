# Pournogravy — Project Status
**Maintained by:** Kristin Mitchell — Aethyx  
**Live Site:** [pournogravy.com](https://pournogravy.com)  
**Repository:** [kmitch2087-dot/pournogravy](https://github.com/kmitch2087-dot/pournogravy)

> **Note on dates:** This project is built using multiple AI-assisted development tools (Lovable, Claude Code, Claude Cowork, and others). Entries in this log reflect updates recognized and logged by those systems — not necessarily the literal date the work was performed. Development often happens across tools simultaneously; the log captures progress milestones, not calendar hours.

---

## Current Phase
**Phase:** Post-launch (soft) — Active Build  
**Status:** Site is live. Real payment processing active. Admin dashboard fully operational. CF Email Worker deployed + routing rule set. Resend domain verified. Print files 74/74 uploaded. Full email pipeline operational. Remaining: place live test order + Opie to enter product costs in Bookkeeping.

---

## Session Log (Latest First)

| Date | Summary | Completed | Next Up |
|------|---------|-----------|---------| 
| June 29, 2026 | **Back logo storage, CMS-editable legal pages, product image SEO rename, Stripe analytics.** (1) **Test order setup (Task 1):** Generated 800×800 mock image and 4500×5400 print file for Sample Product 2 (`a2b2cd83`); uploaded to `products` and `print-files` Storage buckets; configured product with price_cents=100, shipping_override=1. (2) **Terms/Privacy CMS-editable (Task 2):** `TermsOfService.tsx` and `PrivacyPolicy.tsx` refactored to use `useSiteContent()` with full HTML fallbacks — both pages now editable from the SiteEditor panel without a deploy. `site_content` rows seeded for both pages; `"html"` added to `value_type` union type in SiteContentContext; `PATH_TO_PAGE` in SiteEditor extended with `/terms` and `/privacy`. Commit `00f22b3`. (3) **Product image SEO rename (Task 3):** Added 4 new product detail images from Desktop screenshots (converted via Python Pillow). SEO-renamed all 24 active product images to `[concept]-bartender-[category]-[n].webp` pattern (48 new files, originals kept). All 52 files committed `4077788`. Supabase DB `image_url` and `images[]` updated via MCP to match new filenames. (4) **Back logo storage (Task 4):** Confirmed `stripe-webhook` already had complete `backLogoForColor()` logic + `designLinks` assembly with auto-matched back URL per garment color (dark→white ink, light→black ink). Uploaded `logo_back_white.png` and `logo_back_black.png` from Desktop to Supabase Storage `print-files/back/` — the exact paths the webhook references. Temp RLS policies used for upload, then dropped. Files verified publicly accessible. (5) **Stripe analytics (Task 5):** Added `buildLineItemName()` helper to `create-checkout` edge function — formats `"F Off Karen — Black / L"`. PaymentIntent now gets `description` (human-readable item list, shows in Stripe dashboard) and `metadata` with `order_id`, `item_count`, and compact JSON `items` array (product_id, name, color, size, qty). Deployed as v37. Commit `10593db`. | Terms/Privacy CMS-editable, product images SEO-renamed + DB updated, back logo PNGs live in Storage, Stripe PaymentIntent analytics improved | Place live test order end-to-end; Opie: enter product costs in Bookkeeping |
| June 22, 2026 | **QA audit + WebP conversion + performance optimizations.** Generated full QA audit report (`Pournogravy_QA_Report_2026-06-22.md` on Desktop). Ran 4 parallel sub-agents to fix a11y + SEO issues: MerchDrops page SEO meta tags added (`<SEO>` component); carousel `inert=""` attribute wired + dot buttons enlarged to 44×44px WCAG touch targets; Karen ticker img got explicit `width="40"` `height="40"` (eliminates CLS); Footer/admin Orders/CustomRequests `<h4>` tags changed to `<p>` (fixes heading order). Converted all product + UI images to WebP: 80 product images + 5 UI images, 61MB → 7.3MB (88% reduction); DB product image URLs updated to .webp via SQL UPDATE (unnest pattern). Fixed logo CLS — added `width="500"` `height="257"` to Navbar logo img. Added `aria-label="Sort products"` to shop sort select. Removed Google Fonts CSS `@import` from `index.css`; moved all 4 families into a single combined `<link>` in `index.html` (eliminates second render-blocking stylesheet). Added `priority` prop to ProductCard — first 3 cards on Shop + Homepage get `loading="eager"` + `fetchPriority="high"`. Reverted `decoding="sync"` (was blocking main thread; caused TBT spike 20ms → 107ms). Lighthouse investigation: shop page scored 0 on live site (CF Pages returns HTTP 404 for SPA routes — must run against local `vite preview`). 5-run Lighthouse averages: **Homepage 60, Shop 66**; TBT 34ms avg, CLS 0.0. LCP bottleneck (8–10s) is a structural SPA limitation (JS load → React render → Supabase fetch → image chain) — would require SSR rewrite (Next.js/Remix) to fix meaningfully. Added `*.bak` to `.gitignore`. | QA audit done, WebP conversion done, all a11y + SEO + CLS + font fixes shipped, Lighthouse baselines measured | LCP noted as SPA-structural, no fix without SSR. Place live test order. |
| June 20, 2026 | **Product page overhaul + drag-and-drop copy editor.** Removed hardcoded "Bartender Apparel" label and "MY NAME IS OPIE..." humor box from all product pages. Moved price + selectors to bottom purchase zone. Made gallery sticky on desktop. Added prev/next product navigation arrows (fixed, transparent). Discovered all product changes to `products.ts` were being silently overridden by DB rows — root cause of "nothing changing" across many deploys. Fixed DB rows directly via Supabase MCP for service bartender (humor cleared, longDescription updated with HTML bold yellow "SERVICE BARTENDER:" label, bad_advice populated, subheading set) and keg tee (humor set to one-liner, bad_advice populated). Added optional `subheading` field to Product interface — renders as yellow italic below h1. Added `section_order` column to `products` DB table. Built drag-and-drop copy section reordering in admin ProductEdit — four bordered sections (Humor/Zinger, Short Description, Long Description, Bad Bartender Advice) each with GripVertical handle; order saved to `section_order` in DB and applied on product page render. Added `_headers` file to prevent HTML caching on CF Pages. Fixed `useMergedProducts` merge to preserve `subheading` and `sectionOrder` from static data. | Product page layout overhauled, DB as source of truth confirmed, drag-and-drop copy editor shipped | Verify drag-and-drop on live admin; fix remaining products whose DB `humor` field contains dialogue instead of one-liner (check all published products) |
| June 17, 2026 | **Security fixes, dead code audit, full Bookkeeping Module shipped (11 tasks).** Security: fixed payment intent ID verification bypass in `refund-order`, path traversal in `get-print-file`, hardcoded fallback password removed, timing attack fixed with HMAC constant-time compare. Dead links: removed broken `/merch-drops` footer link, fixed `to:` → `recipient:` in `refund-order` and `refresh-market-rates` edge functions. Missing email templates seeded: `abandoned_cart`, `vendor_welcome`, `admin_alert`. **Bookkeeping Module** (branch `claude/optimistic-pasteur-2c8e14`, 16 commits): DB schema (monthly_snapshots, expenses, products.cost_cents), Financials page fixes (year selector, refund netting, monthly_snapshots for past years), Bookkeeping nav + 5 routes, Products COGS editor, Expenses ledger, sync-stripe-fees edge function (daily cron), close-month edge function (monthly cron), Bookkeeping Overview (monthly grid + amendment drawer), generate-report edge function (CSV + HTML output), Reports page (period selector + download), Tax Packet page (ZIP export with all files). All 11 tasks reviewed; 3 blocking integration bugs found and fixed at final review (order_items schema, Reports format param, close-month cron auth). Branch ready to merge. | Security fixes, email template seeds, Bookkeeping Module 11 tasks complete | Merge branch + push to CF Pages; run bookkeeping migrations in Supabase; deploy 3 new edge functions (sync-stripe-fees, close-month, generate-report) |
| June 16, 2026 | **Parallel 7-agent build: ~30 features in flight.** Fulfillment Partners UI added to admin Settings — vendor table, Set as Active, Add New Vendor Sheet with full intake form (services, turnaround, min qty, file formats, notes), `add-fulfillment-vendor` edge function sends vendor_welcome email via send-notification. Migrations: `20260616000010_fulfillment_vendors.sql`, `20260616000010b_vendor_welcome_template.sql`. Other agents: abandoned-cart-reminder, refund-order, archive-orders, blast-email edge functions; order_archive table; abandoned cart last_updated_at column; additional UI features. | Fulfillment Partners panel, vendor edge function, migrations | Run migrations in Supabase; deploy add-fulfillment-vendor edge function |
| June 16, 2026 | **Blog posts, homepage reviews, custom request archive, shipping rates.** Blog: seeded 3 published posts in DB — `/blog` page now shows content. Homepage: added "WHAT THE BAR SAYS" reviews section (3-col grid, star rating, truncated body, author, product name) — seeded 3 bartender-voice reviews with `is_approved=true`. Admin Custom Requests: full overhaul — added `archived_at` column to `custom_requests`; added tabs (Active / Done / Archived with counts); per-row "Mark Done" (→ status='completed') and "Archive" (→ archived_at=now()) buttons; Archived tab has "Unarchive" button. Shipping: added `shipping_standard_cents` (default 799), `shipping_express_cents` (default 1499) columns to settings; Settings.tsx Shipping tab now has Standard + Express inputs; CartDrawer shows live shipping estimate ("SHIPPING: $X.XX" or "FREE") from settings with React Query; Shop page shows "🚚 Free shipping on orders over $X" banner. 4 migrations applied (006–009). Build passes clean. | Blog seeded, homepage reviews, custom requests archive + tabs, shipping rates editable + displayed | Deploy to CF Pages; approve Supabase MCP in session settings to allow future SQL via MCP |
| June 15, 2026 | **Shipping overhaul:** stripe-webhook now captures shipping_cents from Stripe session. Printer cost summary shows print cost + shipping as separate lines with "TOTAL TO INVOICE US". Loyalty points now awarded on subtotal only (excludes shipping). New `resend-printer-notification` edge function (admin-callable, regenerates HMAC magic link). Orders.tsx: shipping address formatted cleanly, one-click "Mark as Shipped & Notify Customer", Resend Printer Email button, clickable tracking URL in customer email. InvoiceTracker: printer bill totals include shipping pass-through, CSV expanded to 9 columns. **Bug fixes:** ProductCard easter egg column was `value` but table uses `text` — DB eggs now load correctly. useLoyalty hook hardcoded `100` threshold — now reads from loyalty_rules table. PrintFiles page slug mismatch fixed — now lists files directly from Supabase Storage. Double points toggle: "Activate Now" button writes directly to DB. **Logo uploads:** logo_back_white.png and logo_back_black.png uploaded to Supabase Storage print-files bucket. | Shipping pipeline complete, printer invoice with shipping pass-through, one-click Mark as Shipped, bug fixes (easter egg column, loyalty threshold, PrintFiles slugs, double points toggle), back logo PNGs uploaded | Place test order to verify full fulfillment email flow; CF email routing rule (manual) |
| June 11, 2026 | **Financial dashboard + printer cost tracking + branded emails.** DB: Added `printer_paid_at` (timestamptz) to `printer_queue` for order-level payment tracking. Updated `printer_notification` email template to include amber cost box: "$12/item × N items = $X — please invoice us for this amount when shipped." Rebuilt `InvoiceTracker.tsx` as auto-calculated financial dashboard with 3 sections: (1) Profit Margin — revenue (total−shipping), printer cost, gross profit, margin %, all-time + this-week; (2) Shipping Collected — all-time + this-week, restarts Sunday; (3) Printer Bill — unpaid order list, "Mark All Paid" batch button (sets printer_paid_at on printer_queue), CSV export, collapsible paid history. Print Report button (window.print + @media print isolation). Revenue uses actual collected amount (total_cents − shipping_cents) not pre-discount subtotal. Branded all customer-facing email templates with dark theme (black/yellow), POURnogravy logo header (pournogravy.com/logo.webp), Opie's bartender voice, and branded footer ("DRINK MORE. BITCH LESS. TIP BIG. STAY MOIST."). Templates updated: order_confirmation, order_shipped, custom_request_reply, printer_notification. Sent live printer test email (order ACEF8BD5) to all 4 recipients with TEST banner, CSV attachment, and real HMAC tracking link. | Financial dashboard shipped, printer cost emails wired, all 4 email templates branded | Verify live site /admin/invoices; test mark-as-paid on ACEF8BD5 test order; CF email routing rule (manual) |
| June 11, 2026 | **Opie's full copy pass + product page overhaul.** DB: Updated all 24 products with Opie's exact `description`, `long_description`, `humor`, and `bad_advice` copy. Removed 3XL from all product sizes. Updated `site_content` — hero heading, CTA text ("OUR FULL MENU"), shop page heading/label; confirmed manifesto + superpowers + extras already matched spec. Marquee replaced with "Drink more, Bitch less, Tip big, Stay moist!" (repeated, seamless loop). Marked 29 `client_edit_requests` done + archived. Code: Fixed `productSource.ts` to read `long_description` (text[]) instead of `description_long` (Stripe jsonb); mapped `bad_advice` JSON array to `{ title: "", paragraphs }`. `ProductDetail.tsx` now uses `useMergedProducts()` — DB data overrides static. Layout: moved "My Name is Opie..." humor block above price; replaced old italic callout with yellow bordered box + `whitespace-pre-line` conversation rendering; removed white h3 title from Bad Bartender Advice box, enlarged paragraphs to `text-lg`. Index.tsx: badge delay reduced 1500ms → 800ms; glass headline top position fixed for mobile navbar clearance (`top-16`); hero section height reduced (`min-h-55vh` mobile); carousel images switched to `object-contain`; marquee copy updated. | All 9 spec parts complete; TypeScript clean | Push to GitHub; verify product pages show Opie's copy on live site; test marquee on mobile Safari |
| June 9, 2026 | **CF Worker deployed + print files completed.** Deployed `pournogravy-receive-email` CF Worker via CF REST API (bypassed broken wrangler auth entirely — used `PUT /accounts/{id}/workers/scripts/pournogravy-receive-email` multipart upload with esbuild-bundled ESM). Set both Worker secrets (`RECEIVE_EMAIL_SECRET`, `SUPABASE_URL`) via CF secrets API. Completed print file uploads: 74/74 PNGs in Supabase Storage `print-files` bucket (37 black + 37 white). Cleaned up: dropped temp anon upload + delete RLS policies, deleted 18 duplicate `black/black/` files, deleted test file. | CF Worker deployed, 74 print PNGs confirmed, temp policies dropped, dupes cleaned | **[Manual]** CF Dashboard → Email → Email Routing → update rule for `opie@pournogravy.com` → `pournogravy-receive-email`; place test order |
| June 8–9, 2026 | **Rich Email Templates page + CF Email Worker + send-notification param fixes.** Built `src/pages/admin/EmailTemplates.tsx` (~600 lines) — full-featured admin email editor replacing the old Settings tab. Features: left sidebar with template list + hover actions (duplicate/delete), editable template name, subject input, 4-tab editor (Visual/HTML/Preview/Plain Text), rich text toolbar (undo/redo, bold/italic/underline/strike, headings, text+bg color picker, align, lists, link, image, HR, remove format), click-to-insert `{{variable}}` chips, live sandboxed iframe preview with desktop/mobile toggle and per-variable fill inputs, auto-generate plain text from HTML, test email send via `send-notification` edge fn. All using `contenteditable` + `document.execCommand()` — no new npm packages. Fixed `send-notification` param mismatch (3 files: `Contact.tsx`, `CustomGarmentRequestModal.tsx`, `EmailTemplates.tsx` — changed `to`/`template_key` → `recipient`/`templateKey`). Built CF Email Worker in `cloudflare-workers/receive-email/` (postal-mime + HMAC auth + posts to Supabase `receive-email` fn). Redeployed `receive-email` Supabase edge fn with `verify_jwt: false` (was incorrectly `true` — would reject CF worker calls). Set `RECEIVE_EMAIL_SECRET` in Supabase secrets. Committed + pushed all changes (commit `dafb7a0..1429fd4`). | Rich Email Templates page, send-notification param fixes, CF Worker files created, receive-email edge fn redeployed (verify_jwt: false), RECEIVE_EMAIL_SECRET set in Supabase, all committed + pushed to GitHub | Deploy CF Worker, set Email Routing rule in CF Dashboard |
| June 8, 2026 | **Fulfillment email pipeline — fully wired.** Rotated + set all Supabase edge function secrets: `STRIPE_SECRET_KEY` (was truncated from prior session), `STRIPE_WEBHOOK_SIGNING_SECRET` (fixed doubled `whsec_` prefix), `RESEND_API_KEY`, `FULFILLMENT_SECRET` (new — signs printer tracking magic links). Confirmed Resend domain for pournogravy.com is verified for outbound sending (DKIM+SPF ✅; inbound MX fails due to GoDaddy conflict — non-blocking). Created `print-files` Supabase Storage bucket with public SELECT policy; uploaded 74 print-ready PNGs to `print-files/black/` and `print-files/white/` via supabase CLI retry loop. Updated `stripe-webhook` (v29): removed DB lookup for print_file_url, replaced with slug-based Supabase Storage URLs (`print-files/{color}/{slug}_{color}.png`); added `design_links` variable per order item in printer email; added CC copy of printer notification to `kmitch2087@gmail.com` for test review. Updated `printer_notification` email template with 🎨 Print Files section (pre-formatted with black+white URLs). Confirmed `submit-tracking` edge function already deployed (v2). Removed temp anon INSERT RLS policy from `print-files` bucket. Cleaned up 18 doubled-path files (`black/black/`). Created `products` Storage bucket (public read) for admin product image uploads. **Lovable disconnected** — Claude (Cowork) is now the exclusive builder. Updated CLAUDE.md. | Stripe/Resend/Fulfillment secrets set, print-files Storage bucket + 74 PNGs, stripe-webhook design URLs + CC, printer_notification template updated, submit-tracking confirmed, Lovable removed | Place test order; move opie@pournogravy.com off GoDaddy |
| May 22–27, 2026 | **CMS wiring + /admin/content + auth spinner fix + migration sync.** Wired all 5 public pages (Index, About, Shop, Contact, FAQ) to `site_content` DB table — headlines, CTAs, FAQ Q&As, rotating quotes, and ticker items are now editable live with static hardcoded fallbacks guaranteeing zero visual change on empty DB. ~60 rows seeded via `20260525000001_site_content_expanded.sql`. New `/admin/content` admin tab added with Home/Shop/About/Contact/FAQ page tabs so Opie can edit site copy from the dashboard without developer involvement. **Auth fix:** Added `loadedProfileIdRef` to `AuthContext` so Supabase's `SIGNED_IN` auto-refresh event (which fires on token renewal, not just explicit login) no longer triggers a spurious loading spinner when navigating between the admin and public pages. **Migration sync:** Docker Desktop installed; `supabase db pull` working; migration history fully synced via `supabase migration repair`; missing `client_edit_requests` base table backfilled as `20260508000001`; all remote schema drift (Stripe Postgres sync, pgmq, pg_cron extensions) captured in `20260526231648_remote_schema.sql`. Account page orders/loyalty data now cached via React Query (no spinner on re-visit). | CMS wiring, `/admin/content` tab, auth spinner fix, Docker, db pull, migration backfill | Fulfillment partner; Resend domain verify |

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
- [x] `product_reviews` (3 approved reviews seeded), `discount_codes`, `wishlists`, `loyalty_accounts`, `loyalty_transactions`
- [x] `email_subscribers`, `analytics_events`, `site_content`, `client_edit_requests`
- [x] `inbox_messages` — inbound email storage (thread_id, kind, status, message_id uniqueness)
- [x] `blog_posts` — title, slug, excerpt, content, featured_image_url, tags[], published, published_at, created_by; RLS (public read published, admin full access); updated_at trigger; **3 posts seeded**
- [x] `printer_queue` — `printer_paid_at` column added (migration 20260611222803)
- [x] `fulfillment_vendors` — vendor contact directory with services, turnaround, file formats (migration 20260616000010)
- [x] All SECURITY DEFINER functions + triggers + RLS policies
- [x] Products seeded (24 products, migration 20260504000003)
- [x] `site_content` seeded (~60 rows, migrations 20260522000001 + 20260525000001)
- [x] `email_templates` — `vendor_welcome` template seeded (migration 20260616000010b)
- [x] `monthly_snapshots` — locked monthly P&L snapshots; auto-closed by cron on 1st of month (migration 20260617000010)
- [x] `expenses` — manual + Stripe auto-synced expenses (migration 20260617000010)

### Supabase Storage
- [x] `print-files` bucket — **74 PNGs** (37 black + 37 white), public read, temp policies cleaned up
- [x] `products` bucket — public read, for admin product image uploads
- [x] `drops` bucket — for merch drop flyer uploads

### Edge Functions (Supabase)
- [x] `create-checkout`, `stripe-webhook`, `submit-tracking`, `send-notification`, `verify-email`
- [x] `validate-discount`, `admin-contact`, `notify-project-status`, `redeem-points`, `track-event`
- [x] `receive-email` (v11) — inbound email webhook; `verify_jwt: false`; stores in `inbox_messages`; alerts aopie91@gmail.com via Resend
- [x] `add-fulfillment-vendor` — inserts to fulfillment_vendors, sends vendor_welcome email
- [x] `sync-stripe-fees` — daily cron (02:00 UTC) syncs Stripe processing fees into expenses table (migration 20260617000020)
- [x] `close-month` — monthly cron (00:05 on 1st) auto-closes books into monthly_snapshots (migration 20260617000021)
- [x] `generate-report` — HTTP-callable; returns CSV or HTML for 5 report types (pl_statement, order_summary, expense_detail, sales_by_product, stripe_fee_summary)

### Frontend — Public Pages
- [x] Homepage, Shop, Product detail, Collections, About, Contact, FAQ, 404, `/proposal`, `/wishlist`, `/privacy`, `/terms`
- [x] **Blog** — `/blog` public post listing page (`Blog.tsx`)
- [x] **Blog post** — `/blog/:slug` individual post page (`BlogPost.tsx`)
- [x] **Ship order** — `/ship/:orderId` printer-facing tracking submission form; HMAC-verified token (`ShipOrder.tsx`)

### Frontend — Admin Dashboard (`/admin`)
- [x] Login, Dashboard, Products, Orders, Custom Requests, Reviews, Settings
- [x] User Manual, Project Status, HelpPanel, ContactKristinModal
- [x] EditRequests, Analytics, Pour Points Loyalty, Customer Lookup, Email Subscribers, Discount Codes, Content
- [x] **Inbox (`/admin/inbox`)** — full inbox UI for `inbox_messages`
- [x] **Email Templates (`/admin/email-templates`)** — rich contenteditable editor, Visual/HTML/Preview/Plain Text tabs, toolbar, variable palette, live preview, test send; all 4 templates branded (dark theme, POURnogravy logo, Opie's voice, branded footer)
- [x] **Invoice Tracker (`/admin/invoices`)** — auto-calculated financial dashboard: Profit Margin (revenue, printer cost, gross profit, margin %), Shipping Collected, Printer Bill (unpaid list, Mark All Paid, CSV export, paid history)
- [x] **Blog Admin (`/admin/blog`)** — blog post CRUD: create/edit/delete, publish toggle, slug auto-gen, image URL, tag management
- [x] **Fulfillment Partners panel** (Settings → Fulfillment tab) — vendor table, Set as Active, Add New Vendor sheet with full intake form
- [x] **Financials page** — year selector (2024–present), refund netting (gross revenue → refunds → net), historical data from monthly_snapshots
- [x] **Bookkeeping section** (`/admin/bookkeeping/*`) — 5 sub-pages:
  - Overview: monthly grid with Open/Closed/Amended status, amendment drawer, annual summary cards
  - Expenses: manual expense entry + Stripe auto-sync ledger with lock badges and filters
  - Products (COGS): inline cost editor, margin badges sorted ascending
  - Reports: period/type/format selectors, CSV download + print-to-PDF
  - Tax Packet: year-end ZIP export (P&L HTML + 4 CSVs + summary + README)

### CF Email Worker
- [x] `cloudflare-workers/receive-email/src/index.ts` — postal-mime parser → posts to `receive-email` Supabase fn
- [x] Worker **deployed** as `pournogravy-receive-email` via CF REST API
- [x] `RECEIVE_EMAIL_SECRET` + `SUPABASE_URL` set as Worker secrets
- [ ] **⚠️ ONE MANUAL STEP:** CF Dashboard → pournogravy.com → Email → Email Routing → Routing Rules → edit `opie@pournogravy.com` rule → change destination from `wild-mouse-2b64` → `pournogravy-receive-email`

---

## 📋 Remaining Backlog

### 🔴 Blocking — Manual Steps Before Going Live

> ⛔ **BLOCKING: Resend domain verification** — until pournogravy.com is verified in Resend, order confirmation emails will not send. DKIM/SPF records are already in Cloudflare DNS — may be a one-click confirm.

- [x] **Resend domain verify** — ✅ Verified June 16, 2026
- [x] **CF Email routing rule** — ✅ Set June 16, 2026 (`opie@pournogravy.com` → `pournogravy-receive-email` worker)
- [ ] **Place test order** — verify customer confirmation + printer email both land correctly end-to-end
- [x] **Opie: product costs** — ✅ Confirmed correct June 29, 2026

### ✅ Dev Work — All Done (June 17, 2026)
- [x] All bookkeeping migrations applied (`20260617000010`, `000020`, `000021`, `000030`, `000001`, `000002`, `000003`)
- [x] `add-fulfillment-vendor`, `sync-stripe-fees`, `close-month`, `generate-report` all deployed
- [x] Dead code removed: `src/utils/supabase/`, `src/lib/fulfillment.ts`, `wrangler.jsonc`
- [x] `main` branch deleted from GitHub
- [x] `npm audit fix` run — down to 2 remaining (require `--force`, skipping to avoid breaking changes)
- [x] ProjectStatus.tsx updated — progress bars corrected, stale backlog/issues removed, Apollo/Stripe EIN removed

### 🟢 Phase 3 (Post-Launch)

- [ ] Cart merge on login (guest → auth)
- [ ] Email marketing integration (Klaviyo or Mailchimp)
- [ ] International shipping config
- [ ] Wholesale portal (foundation at `/proposal`)
- [ ] Printify/Printful API integration (optional — local printer model fully operational)

---

## Fulfillment Status

**Decided:** Local printer (email-based). Settings table wired. Vendor management UI added 2026-06-16.

- `fulfillment_provider` in settings table controls routing
- `printer_email` in settings table is where order notifications go
- Fulfillment Partners panel (Settings → Fulfillment tab) lets Kristin/Opie manage vendors and switch active printer without a code deploy

---

## 👤 Opie's Action Items (Migrated from Dashboard)

These items require Opie's hands — not developer work. Migrated from the in-app dashboard to this doc for tracking.

| Priority | Task | Detail |
|----------|------|--------|
| ~~CRITICAL~~ | ✅ Resend Domain Verified | Done June 16, 2026. pournogravy.com is verified and ready to send emails. |
| ~~HIGH~~ | ✅ Product costs entered | All product costs confirmed correct in Bookkeeping → Products as of June 29, 2026. |
| MEDIUM | Order Samples | Order at least 1 shirt from each printer before committing. Check: print quality, fabric, wash test, packaging, delivery time. |
| LOW | Set Up Google Business Profile | Visit google.com/business and claim or create a profile for Pournogravy. Helps search visibility even for online-only brands. |

---

## 🚫 Known Issues

| Issue | Severity | Status | Fix |
|-------|---------|--------|-----|
| Resend domain verified | ✅ Done | Closed | Verified June 16, 2026 — domain ready to send emails |
| CF email routing rule | ✅ Done | Closed | Set June 16, 2026 — opie@pournogravy.com → pournogravy-receive-email worker |
| Test order (live) not placed | 🟡 Medium | Open | Test banners confirmed June 11; need live order end-to-end |
| npm vulnerabilities | 🟡 Low | Open | 2 remaining after `npm audit fix`; require `--force` (breaking changes risk — defer) |

---

## Cloudflare Notes

⚠️ Active CF Pages project is **`pournogravydev`** — NOT `pournogravy` (abandoned).

- Build command: `npm run build`
- Output dir: `dist`
- Repo: `kmitch2087-dot/pournogravy` → master branch

---

*Updated end of session June 29, 2026.*
