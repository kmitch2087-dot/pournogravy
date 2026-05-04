# Pournogravy — Executive Summary
**Prepared by:** Kristin Mitchell, Founder & Developer — Aethyx
**Prepared for:** Adam "Opie" Oppenheimer, Owner — Pournogravy
**Last Updated:** April 29, 2026

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
| **Stripe** | Payment processing via Checkout Sessions and Webhooks (built and ready for activation) |
| **Resend** | Transactional email — order confirmations and custom request notifications (built, pending API key) |

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
- **Shop page** — full product catalog with filtering and browsing
- **Product detail pages** — per-product pages with size selector, color selector (Black / Cream), Men's/Women's fit variants, image galleries, product descriptions, and humor-forward "Bad Bartender Advice" copy
- **Collections page** — curated product groupings
- **Featured products** — dynamically controlled from product data; easy to update

### Cart & Checkout Flow
- **Persistent cart drawer** — slides in from the right; works for guests and logged-in users
- **Guest cart support** — no account required to shop; cart saved to browser session
- **Quantity management** — add, update, remove items
- **Order pipeline** — database-backed order records with status tracking (pending → paid → fulfilled)
- **Stripe Checkout** — server-validated pricing, pending order creation, redirect to Stripe hosted checkout

### Customer Features
- **Custom garment request form** — customers can request any design on a different garment; submissions go directly to the admin dashboard
- **FAQ page** — addresses common questions about sizing, shipping, customs, and brand values
- **About page** — brand story and mission
- **Contact page** — direct customer communication channel
- **Email newsletter capture** — homepage email collection for future marketing campaigns
- **Order confirmation emails** — templated transactional email via Resend (pending activation)

### Admin / Owner Dashboard
- **Protected admin section** — login-gated, allowlist-based admin access (no customer can access)
- **Orders view** — see all orders and their status in the admin UI
- **Custom requests view** — see and manage custom garment submissions
- **Product management** — product editing UI with image upload to Supabase Storage
- **Site settings** — configurable site-wide settings

### Brand & Content
- Humor-forward brand voice baked into every product page
- Mobile-responsive on all screen sizes
- Smooth animations and transitions throughout
- Consistent design system using the brand's color palette

---

## 4. Current Status (April 29, 2026)

**Site is live at pournogravy.com.** The storefront, cart, and admin dashboard are fully functional. The following items are built and require final configuration before the site can accept real payments:

| Item | Status | Action Needed |
|------|--------|--------------|
| Storefront | ✅ Live | None |
| Admin Dashboard | ✅ Live | None |
| Cart & order pipeline | ✅ Built | None |
| Stripe payment processing | ⚠️ Built, needs secrets | Add Stripe API keys to Supabase |
| Order confirmation emails | ⚠️ Built, needs API key | Add Resend API key to Supabase |
| Fulfillment partner | ❌ Not selected | Choose Printful or Printify |
| Email marketing | ❌ Not connected | Connect Klaviyo or Mailchimp |

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

### Phase 1 — Payment Activation (Next 1–2 weeks)
- **Activate Stripe** — add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Supabase edge function secrets
- **Activate Resend** — add `RESEND_API_KEY`; verify sender domain (opie@pournogravy.com)
- **Select fulfillment partner** — Printful or Printify; wire API key into stripe-webhook function
- **Seed admin settings** — one SQL statement to enable admin settings page
- **Email marketing** — connect captured emails to Klaviyo or Mailchimp

### Phase 2 — Growth (30–60 days)
- **SEO optimization** — meta tags, Open Graph images, sitemap, structured product data
- **Discount codes** — promo code support for launch campaigns and influencer partnerships
- **Product reviews** — social proof on product pages
- **Cart merge** — guest → auth cart merging on login

### Phase 3 — Scale (60–120 days)
- **Cloudflare Workers** — proxy Supabase API calls server-side for enhanced security
- **Analytics** — privacy-friendly analytics (Cloudflare Web Analytics or Plausible)
- **Subscription / loyalty program** — repeat-customer rewards
- **Wholesale portal** — B2B ordering with tiered pricing
- **International shipping** — expanded shipping zone configuration

---

## 7. Cost Analysis — Market Value vs. Actual Investment

*See `docs/COST_ANALYSIS.md` for the full breakdown.*

**Summary:** The work delivered on this project — including the full custom storefront, payment pipeline, serverless edge functions, admin dashboard, email system, and deployment infrastructure — would cost **$55,000–$140,000+** at standard market rates. Aethyx delivered it for **$1,400 total** as a portfolio-rate engagement.

---

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*
