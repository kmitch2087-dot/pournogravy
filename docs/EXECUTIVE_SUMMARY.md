# Pournogravy — Executive Summary
**Prepared by:** Kristin Mitchell, Founder & Developer — Aethyx
**Prepared for:** Adam "Opie" Oppenheimer, Owner — Pournogravy
**Last Updated:** April 28, 2026

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
| **Row-Level Security (RLS)** | Every database table has security policies — customers can only see their own orders and cart |
| **Guest + Auth Cart** | Shoppers can add to cart without creating an account; cart persists across sessions |

### Deployment & Hosting
| Technology | What It Does |
|-----------|-------------|
| **Cloudflare Pages** | Global CDN hosting — site is served from data centers worldwide for near-instant load times |
| **GitHub** | Version-controlled source code — every change is tracked, reversible, and auditable |
| **pournogravy.com** | Custom domain with SSL (HTTPS) included |

### Development Tooling
| Technology | What It Does |
|-----------|-------------|
| **Lovable** | AI-assisted development platform used for rapid feature iteration |
| **Vitest** | Automated test suite — catches regressions before they reach the live site |

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

### Customer Features
- **Custom garment request form** — customers can request any design on a different garment (hoodie, tank, speedo, etc.); submissions go directly to the owner dashboard in Supabase
- **FAQ page** — addresses common questions about sizing, shipping, customs, and brand values
- **About page** — brand story and mission
- **Contact page** — direct customer communication channel
- **Email newsletter capture** — homepage email collection for future marketing campaigns

### Brand & Content
- Humor-forward brand voice baked into every product page
- Mobile-responsive on all screen sizes
- Smooth animations and transitions throughout
- Consistent design system using the brand's color palette

### Admin / Owner
- Custom garment requests viewable in Supabase dashboard (no code required)
- Product visibility controlled by `published` flag — add new products without them going live until ready
- Featured products controlled independently of published status

---

## 4. Business Model & Revenue Plan

### Current Revenue Model
- **Direct-to-consumer e-commerce** — standard product sales at $27.99 per T-shirt
- **Product lines:** Men's and Women's fits in Black and Cream colorways
- **Custom garment requests** — potential premium upsell for bulk orders, bachelorette parties, industry events, bar staff uniforms

### Margin Profile
| Item | Estimate |
|------|---------|
| Retail price | $27.99 |
| Print-on-demand/manufacturing cost | ~$10–14 (depends on fulfillment partner) |
| Gross margin per unit | ~$14–18 (~50–64%) |
| Payment processing (Stripe ~2.9% + $0.30) | ~$1.11 |
| Net margin per unit | ~$13–17 |

> *Note: Actual margins depend on the fulfillment partner selected. Print-on-demand (Printful, Printify) has lower margins but no inventory risk. Bulk inventory ordering improves margins significantly at volume.*

### Revenue Scenarios
| Monthly Units Sold | Monthly Revenue | Monthly Net (est.) |
|-------------------|----------------|-------------------|
| 50 units | $1,400 | ~$700 |
| 150 units | $4,200 | ~$2,100 |
| 500 units | $14,000 | ~$7,000 |
| 1,000 units | $27,990 | ~$14,000 |

### Growth Levers
1. **Email list activation** — the homepage captures emails; a launch sequence (welcome, product spotlight, first-purchase discount) is a high-ROI first campaign
2. **Social media / TikTok** — bartender content is highly shareable; the humor-forward brand voice is built for viral moments
3. **Industry events** — bar industry tradeshows, cocktail competitions, restaurant expo; direct B2B sales to bar programs for staff uniforms
4. **Custom orders** — the custom garment request system is already live; promoting this enables bulk and B2B revenue
5. **Expanded catalog** — hoodie, hat, apron, and accessory lines using the same designs
6. **Wholesale** — bar supply companies, cocktail bars, restaurant groups

---

## 5. Future Suggested Roadmap

These features are not currently built but are recommended as natural next steps, prioritized by impact:

### Phase 1 — Foundation (Next 30–60 days)
- **Stripe payment integration** — currently the cart and order pipeline exist but payment processing is not wired up; this is the #1 priority before any advertising spend
- **Fix Cloudflare build command** — set to `npm run build` (currently incorrect, preventing reliable deploys)
- **Email marketing integration** — connect captured emails to Mailchimp/Klaviyo; set up a welcome sequence
- **Fulfillment partner integration** — connect Printful or Printify to automate order fulfillment

### Phase 2 — Growth (60–120 days)
- **Admin dashboard** — a simple internal page for Opie to manage products, view orders, and respond to custom requests without touching Supabase directly
- **SEO optimization** — meta tags, Open Graph images, sitemap, structured product data for Google Shopping
- **Discount codes & promotions** — promo code support for launch campaigns and influencer partnerships
- **Product reviews** — social proof on product pages

### Phase 3 — Scale (120+ days)
- **Subscription / loyalty program** — repeat-customer rewards
- **Wholesale portal** — B2B ordering with tiered pricing for bar programs and restaurants
- **International shipping** — expanded market via shipping zone configuration
- **Mobile app** (optional) — if social commerce becomes a primary channel

---

## 6. Cost Analysis — Market Value vs. Actual Investment

*See `docs/COST_ANALYSIS.md` for the full breakdown.*

**Summary:** The work delivered on this project would cost **$38,500–$92,000** at standard market rates for a freelancer or boutique agency. Aethyx delivered it for **$1,400 total** ($900 development fee + $500 software costs) as a portfolio-rate engagement.

---

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*
