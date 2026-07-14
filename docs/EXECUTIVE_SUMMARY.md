# Pournogravy — Executive Summary
**Prepared by:** Kristin Mitchell, Founder & Developer — Aethyx
**Prepared for:** Adam "Opie" Oppenheimer, Owner — Pournogravy
**Last Updated:** July 14, 2026

---

## 1. What Was Built

Pournogravy.com is a fully custom e-commerce website for a bartender-culture apparel brand. The site is live, deployed to a global CDN, and built to scale — from a one-person side hustle to a nationally recognized brand — without ever needing to rebuild from scratch.

This is not a Shopify template or a Wix site. This is a bespoke, production-grade web application built with the same technology stack used by enterprise-level companies.

---

## 2. Technology Stack & Infrastructure

### Frontend
| Technology | What It Does |
|-----------|-------------|
| **React** | Industry-standard UI framework (used by Meta, Netflix, Airbnb) |
| **TypeScript** | Strongly-typed JavaScript — catches bugs before they ship |
| **Vite** | Ultra-fast build tool — site loads in milliseconds |
| **Tailwind CSS** | Utility-first styling framework — consistent, responsive design |
| **shadcn/ui** | Professional component library — accessible, polished UI out of the box |
| **Framer Motion** | Smooth animations and transitions throughout the site |

### Backend & Database
| Technology | What It Does |
|-----------|-------------|
| **Supabase** | Managed PostgreSQL database with built-in authentication, real-time support, and row-level security |
| **Supabase Edge Functions** | Serverless backend code for payment processing, email, and order fulfillment |
| **Row-Level Security (RLS)** | Every database table has security policies — customers can only see their own orders and cart |
| **Guest + Auth Cart** | Shoppers can add to cart without creating an account; cart persists across sessions |
| **Admin Role System** | Allowlist-based admin access with JWT auth; protected admin dashboard |

### Payments & Email
| Technology | What It Does |
|-----------|-------------|
| **Stripe** | Payment processing via embedded Payment Element and Webhooks — live payments active |
| **Resend** | Transactional email — order confirmations and custom request notifications (API key set, sender domain pending verification) |

### Deployment & Hosting
| Technology | What It Does |
|-----------|-------------|
| **Cloudflare Pages** | Global CDN hosting — site is served from data centers worldwide for near-instant load times |
| **GitHub** | Version-controlled source code — every change is tracked, reversible, and auditable |
| **pournogravy.com** | Custom domain with SSL (HTTPS) included |

---

## 3. Features Delivered

### Storefront
- **Hero carousel** — auto-rotating product showcase with featured designs and brand messaging
- **Shop page** — full product catalog with live search (`?q=`) and sort controls (Featured / Price / A→Z)
- **Product detail pages** — per-product pages with size selector, color selector (Black / Cream / etc.), image galleries, star ratings, and humor-forward "Bad Bartender Advice" copy
- **Collections page** — curated product groupings
- **Featured products** — dynamically controlled from product data; easy to update
- **Wishlist** — customers can save products with a heart toggle; persists without an account (localStorage) and syncs to their profile on login
- **Blog** — public `/blog` listing and `/blog/:slug` post pages; managed from admin dashboard

### Cart & Checkout Flow
- **Persistent cart drawer** — slides in from the right; works for guests and logged-in users
- **Cart merge on login** — guest cart items survive login and merge with any saved cart from another device
- **Discount code field** — built into the cart; server-validated via edge function
- **Quantity management** — add, update, remove items
- **Order pipeline** — database-backed order records with status tracking (pending → paid → fulfilled)
- **Stripe Checkout** — embedded Payment Element; pricing validated server-side; payments live

### Customer Features
- **Custom garment request form** — customers can request any design on a different garment; submissions go directly to the admin dashboard
- **FAQ page** — addresses common questions about sizing, shipping, customs, and brand values
- **About page** — brand story and mission
- **Contact page** — direct customer communication channel; messages stored in database and visible to Opie from the admin dashboard
- **Privacy Policy** — `/privacy` — clear, brand-voice privacy policy
- **Terms of Service** — `/terms` — plain-language ToS covering shipping, returns, IP
- **Email newsletter capture** — homepage email collection connected to a subscriber database; ready for Klaviyo/Mailchimp integration
- **Order confirmation emails** — templated transactional email via Resend (pending domain verification)
- **Pour Points loyalty program** — customers earn 1 point per $1 spent; every 100 points redeems for a $5 discount code; balance visible on account page with full transaction history
- **Product reviews** — star ratings on product cards; customers can leave reviews on product pages (admin approval queue)

### Admin / Owner Dashboard
- **Protected admin section** — login-gated, allowlist-based admin access (no customer can access)
- **Orders view** — see all orders and their status
- **Custom requests view** — see and manage custom garment submissions
- **Product management** — product editing UI with image upload to Supabase Storage (bucket live)
- **Reviews queue** — approve or reject customer reviews before they go live
- **Discount codes** — create, toggle active/inactive, and delete promo codes; usage progress bars; status badges (Active / Expired / Exhausted)
- **Pour Points panel** — view all members, point balances, full transaction history; manual adjustment tool
- **Customer lookup** — search any customer by email; see order history, loyalty balance, wishlist count
- **Email subscribers** — view all newsletter signups, subscriber growth trend, export CSV
- **Merch drop calendar** — schedule product drops with ad placement, email campaigns, and auto-publish
- **Analytics dashboard** — page views, event funnel, top products
- **Site settings** — configurable site-wide settings
- **Inbox** — admin messaging system for inbound emails
- **Edit requests** — split-view note system; Opie submits requests, Kristin replies with inline threads
- **Project status** — real-time build pipeline with phase tracker and session log
- **Direct contact to developer** — Opie can message Kristin directly from the dashboard
- **Site copy editor** — all public page headlines, CTAs, FAQ answers, quotes, and ticker items editable live from the Content tab — no developer or deployment required
- **Email Templates** — rich email editor for all 4 transactional templates (order confirmation, order shipped, custom request reply, printer notification); Visual/HTML/Preview/Plain Text tabs; live preview; one-click test send; all templates branded with dark theme, POURnogravy logo, and Opie's voice
- **Invoice Tracker** — financial dashboard showing profit margin, shipping collected, and printer bill; "Mark All Paid" batch action; CSV export for records; collapsible paid order history
- **Blog management** — create, edit, publish, and delete blog posts from the admin dashboard; slug auto-generation; tag management; image URL support

### Brand & Content
- Humor-forward brand voice baked into every product page
- Mobile-responsive on all screen sizes
- Smooth animations and transitions throughout
- Consistent design system using the brand's color palette
- SEO-optimized with structured data (JSON-LD Product + Organization schemas) for Google Shopping eligibility

---

## 4. Current Status (July 14, 2026)

**Site is live at pournogravy.com. Real Stripe payments are processing.** The storefront, cart, admin dashboard, loyalty program, analytics, CMS content editing, financial dashboard, email templates, blog, fulfillment portal, and contact form are all fully operational. All transactional emails are branded and live.

**Recent hardening (July 13–14):** Every product now has correct print files wired for both shirt colors, and a back-logo bug that would have printed a black box on every black shirt was fixed. The print-ready artwork (the brand's sellable IP) is now locked behind a **private storage bucket and a password-protected printer portal** — the printer has been invited to set up their login. Several **database security issues were found and fixed** (a report that leaked daily revenue to the public, and a loophole that could let customers award themselves loyalty points). The site was also fully cleaned of the old Lovable builder's branding, and a new brand favicon / social-media profile image was produced. One open technical incident remains (Stripe webhook 500s — diagnostic logging in place) and one launch item (a live end-to-end test order).

| Item | Status | Action Needed |
|------|--------|--------------|
| Storefront | ✅ Live | None |
| Admin Dashboard | ✅ Live | None |
| Cart & order pipeline | ✅ Live | None |
| Stripe payment processing | ✅ Live | None |
| Discount codes | ✅ Live | None |
| Pour Points loyalty | ✅ Live | None |
| Wishlist | ✅ Live | None |
| Analytics | ✅ Live | None |
| Email subscribers | ✅ Live | None |
| Contact form | ✅ Live | Messages appear in admin Custom Requests panel |
| Site copy editing | ✅ Live | All public page copy editable from /admin/content — no deploy required |
| Privacy Policy + Terms of Service | ✅ Live | Linked from footer |
| Email templates (all 4) | ✅ Live | Branded — dark theme, logo, Opie's voice; test email sent |
| Invoice Tracker | ✅ Live | Financial dashboard at /admin/finances |
| Blog system | ✅ Live | /blog + /blog/:slug + /admin/blog all wired |
| Fulfillment portal | ✅ Live | Printer-facing portal at /fulfillment?t=<token> — advance status, add notes, print file links |
| **Print files (all products)** | ✅ Live | All 27 published products resolve front + back print files for both shirt colors; back-logo black-box bug fixed |
| **Printer portal (password-gated)** | ✅ Live | Private print-file catalog at /printer; printer (Up2ournecksinfabric LLC) invited to create their password |
| **Print-file IP security** | ✅ Done | Sellable artwork bucket is now private; delivered via expiring signed links only |
| **Database security** | ✅ Hardened | Revenue-leak report + loyalty/discount self-service loopholes closed; Supabase security-advisor error cleared |
| Fulfillment partner | ✅ Active | Local printer (Up2ournecksinfabric LLC) — order emails + portal live; no third-party API needed |
| Order confirmation emails | ✅ Live | Resend domain verified; branded emails sending |
| **Stripe webhook 500s** | 🔴 Incident | Diagnostic logging in place. Check Supabase edge function logs for `[stripe-webhook] PROCESSING ERROR` on next order. Two old orders (6ae0b971, 11ae929e) need emails resent manually. Root cause still unknown. |
| Live end-to-end test order | ⬜ Pending | Place one real order to confirm customer + printer emails land correctly |
| Email marketing | ❌ Not connected | Connect Klaviyo or Mailchimp to existing subscriber list (post-launch) |
| Inbound email routing | ✅ Done | CF Email routing rule set July 1, 2026 |

---

## 5. Business Model & Revenue Plan

### Current Revenue Model
- **Direct-to-consumer e-commerce** — standard product sales at $27.99 per T-shirt
- **Product lines:** Men's and Women's fits in Black and Cream colorways
- **Custom garment requests** — potential premium upsell for bulk orders, bachelorette parties, industry events, bar staff uniforms

### Margin Profile
| Item | Estimate |
|------|---------|
| Retail price | $27.99 |
| Print-on-demand cost | ~$10–14 (depends on fulfillment partner) |
| Gross margin per unit | ~$14–18 (~50–64%) |
| Payment processing (Stripe ~2.9% + $0.30) | ~$1.11 |
| Net margin per unit | ~$13–17 |

### Revenue Scenarios
| Monthly Units Sold | Monthly Revenue | Monthly Net (est.) |
|-------------------|----------------|-------------------|
| 50 units | $1,400 | ~$700 |
| 150 units | $4,200 | ~$2,100 |
| 500 units | $14,000 | ~$7,000 |
| 1,000 units | $27,990 | ~$14,000 |

### Growth Levers
1. **Email list activation** — homepage captures emails; a welcome sequence is a high-ROI first campaign
2. **Social media / TikTok** — bartender content is highly shareable; the humor-forward brand voice is built for viral moments
3. **Industry events** — bar tradeshows, cocktail competitions, restaurant expo; direct B2B sales
4. **Custom orders** — the custom garment request system is live; promoting this enables bulk and B2B revenue
5. **Expanded catalog** — hoodie, hat, apron, accessory lines using existing designs
6. **Wholesale** — bar supply companies, cocktail bars, restaurant groups

---

## 6. Future Suggested Roadmap

### ✅ Phase 1 — Payment Activation (Complete)
- Stripe live payments active
- Resend API key set; sender domain pending verification
- All edge functions deployed and confirmed
- Admin dashboard fully operational

### ✅ Phase 2 — Growth (Complete)
- SEO — meta tags, Open Graph, sitemap, Product + Organization JSON-LD (Google Shopping ready)
- Discount codes — full admin panel; server-validated at checkout
- Product reviews — star ratings on cards + product pages; admin approval queue
- Cart merge — guest cart survives login; cross-device sync via Supabase
- Wishlist — heart toggle on every product; localStorage for guests, DB for auth users
- Pour Points — loyalty program with earn-on-purchase and redeem-for-discount
- Shop search and sort controls
- Email subscriber capture wired to database

### Phase 3 — Scale (Next)
- **Fulfillment partner** — select Printful or Printify; wire API key into stripe-webhook (required before first real order ships)
- **Email marketing** — connect existing subscriber list to Klaviyo or Mailchimp
- **Cloudflare Workers** — proxy Supabase API calls server-side for enhanced security
- **Wholesale portal** — B2B ordering with tiered pricing (foundation at `/proposal`)
- **International shipping** — expanded shipping zone configuration

---

## 7. Cost Analysis — Market Value vs. Actual Investment

*See `docs/COST_ANALYSIS.md` for the full breakdown.*

**Summary:** The work delivered on this project — including the full custom storefront, payment pipeline, serverless edge functions, admin dashboard, email system, and deployment infrastructure — would cost **$55,000–$140,000+** at standard market rates. Aethyx delivered it for **$1,400 total** as a portfolio-rate engagement.

---

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*
