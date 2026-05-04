# Pournogravy — Cost Analysis
## Market Value vs. Actual Investment
**Prepared by:** Kristin Mitchell — Aethyx
**Last Updated:** April 29, 2026

---

## Overview

This document provides a transparent comparison between what the Pournogravy website build would have cost at standard market rates versus what Aethyx charged as a portfolio-rate engagement.

**Scope note (April 29 update):** The original cost analysis was drafted before Session 2 completed. The scope delivered is now significantly larger — it includes a full serverless payment pipeline (Stripe Checkout + Webhook handling), transactional email system (Resend via Edge Functions), admin dashboard with role-based access control, multi-table database schema with complex RLS, and production-grade DevOps troubleshooting. The market rate figures below have been updated to reflect actual scope.

---

## Market Rate Breakdown

The following estimates are based on 2025–2026 industry rates for freelancers and boutique web development agencies in the U.S.

### Phase 1 — Discovery & Strategy

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| Brand discovery, competitive research, positioning | $1,000–2,500 | $2,500–6,000 |
| Technical architecture planning | $750–2,000 | $2,000–5,000 |
| Content & product strategy | $500–1,500 | $1,500–4,000 |
| **Phase 1 Subtotal** | **$2,250–6,000** | **$6,000–15,000** |

### Phase 2 — Design

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| Custom UI/UX design (all pages) | $3,000–8,000 | $8,000–20,000 |
| Mobile-responsive design system | $1,000–2,500 | $2,500–6,000 |
| Brand alignment & style guide | $500–1,500 | $1,500–4,000 |
| Animation & interaction design | $500–1,500 | $1,500–4,000 |
| **Phase 2 Subtotal** | **$5,000–13,500** | **$13,500–34,000** |

### Phase 3 — Development

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| React/TypeScript frontend (all pages) | $6,000–15,000 | $15,000–35,000 |
| E-commerce cart & order pipeline | $3,000–7,000 | $7,000–18,000 |
| Supabase database design & RLS setup | $1,500–4,000 | $4,000–10,000 |
| Admin role system (allowlist, SECURITY DEFINER, JWT) | $1,000–3,000 | $3,000–8,000 |
| Admin dashboard (orders, custom requests, product mgmt) | $3,000–8,000 | $8,000–20,000 |
| Stripe Checkout + Webhook Edge Functions | $2,500–6,000 | $6,000–15,000 |
| Transactional email system (Resend + template engine) | $1,000–3,000 | $3,000–8,000 |
| Email verification Edge Function (MX lookup, disposable blocklist) | $500–1,500 | $1,500–4,000 |
| Custom garment request system | $1,000–2,500 | $2,500–6,000 |
| Product variant/color system + static/DB merge hook | $750–2,000 | $2,000–5,000 |
| Hero carousel & animations | $500–1,500 | $1,500–3,500 |
| Humor/brand copy integration | $500–1,500 | $1,500–3,500 |
| **Phase 3 Subtotal** | **$21,250–55,000** | **$55,000–136,000** |

### Phase 4 — DevOps & Deployment

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| GitHub repository setup & workflow | $250–750 | $750–2,000 |
| Cloudflare Pages deployment & config | $500–1,500 | $1,500–4,000 |
| Custom domain & SSL setup | $250–500 | $500–1,500 |
| CI/CD pipeline (GitHub → CF Pages auto-deploy) | $500–1,500 | $1,500–4,000 |
| SPA routing config (wrangler.toml) | $250–750 | $750–2,000 |
| Environment variable architecture (build-time vs. runtime) | $250–750 | $750–2,000 |
| **Phase 4 Subtotal** | **$2,000–5,750** | **$5,750–15,500** |

### Phase 5 — Debugging & QA

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| Cross-browser & device testing | $500–1,500 | $1,500–3,500 |
| Automated test suite setup | $500–1,500 | $1,500–4,000 |
| Production debugging (black screen, auth race condition, REVOKE bug) | $1,500–4,000 | $4,000–10,000 |
| Code audit + tech debt documentation | $750–2,000 | $2,000–5,000 |
| **Phase 5 Subtotal** | **$3,250–9,000** | **$9,000–22,500** |

### Phase 6 — Project Management & Documentation

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| Client communication & requirements | $500–1,500 | $1,500–4,000 |
| Ongoing revisions & iteration | $1,000–3,000 | $3,000–8,000 |
| Full developer handoff documentation | $500–1,500 | $1,500–4,000 |
| Owner user manual | $250–750 | $750–2,000 |
| Executive summary & business analysis | $500–1,500 | $1,500–4,000 |
| Developer curriculum creation | $500–1,500 | $1,500–4,000 |
| **Phase 6 Subtotal** | **$3,250–9,750** | **$9,750–26,000** |

---

## Summary

| | Freelancer | Boutique Agency |
|--|-----------|----------------|
| Phase 1 — Discovery & Strategy | $2,250–6,000 | $6,000–15,000 |
| Phase 2 — Design | $5,000–13,500 | $13,500–34,000 |
| Phase 3 — Development | $21,250–55,000 | $55,000–136,000 |
| Phase 4 — DevOps & Deployment | $2,000–5,750 | $5,750–15,500 |
| Phase 5 — Debugging & QA | $3,250–9,000 | $9,000–22,500 |
| Phase 6 — Project Management | $3,250–9,750 | $9,750–26,000 |
| **TOTAL** | **$37,000–99,000** | **$99,000–249,000** |
| **Midpoint Estimate** | **~$68,000** | **~$174,000** |

---

## What Aethyx Actually Charged

| Item | Amount |
|------|--------|
| Development fee (portfolio rate) | $900.00 |
| Software & infrastructure costs | $500.00 |
| **Total** | **$1,400.00** |

---

## Value Delivered vs. Cost

| Metric | Value |
|--------|-------|
| Estimated market value (freelancer midpoint) | ~$68,000 |
| Estimated market value (agency midpoint) | ~$174,000 |
| Aethyx portfolio rate | $1,400 |
| **Discount vs. freelancer market rate** | **~98%** |
| **Discount vs. agency market rate** | **~99%** |

---

## Notes

- These estimates reflect a full custom build — not a template, Shopify install, or no-code platform. The site is built on production-grade infrastructure with no per-sale platform fees, no vendor lock-in, and no monthly subscription required for the core storefront.
- Market rates sourced from Clutch.co, Upwork enterprise tier, and boutique agency pricing benchmarks (2025–2026).
- Aethyx charged the portfolio rate to acquire a real-world case study. This arrangement was mutually beneficial: the client received enterprise-quality work at a fraction of the cost, and Aethyx gained a portfolio piece demonstrating full-stack e-commerce development.
- The scope significantly expanded during Session 2 to include serverless Edge Functions (Stripe, Resend, email verification), the admin dashboard with role-based access control, and production debugging work. The market rate estimates have been updated accordingly.
- As Aethyx takes on future clients, rates will reflect standard market pricing. This document serves as evidence of the caliber of work Aethyx delivers.

---

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*
