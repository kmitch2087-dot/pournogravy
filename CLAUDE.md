# Pournogravy Website — Project Instructions for Claude

## Project Overview
- **Client:** Adam "Opie" Oppenheimer — Pournogravy (bartender-themed apparel brand)
- **Developer/Agency:** Kristin Mitchell — Aethyx (Founder & Developer)
- **Live Site:** pournogravy.com (Cloudflare Pages, connected to kmitch2087-dot/pournogravy on GitHub)
- **Stage:** Launched but pre-marketing; active build in progress

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend/DB:** Supabase (PostgreSQL, RLS, Auth)
- **Deployment:** Cloudflare Pages → GitHub (master branch)
- **AI Builder:** Lovable (bidirectional GitHub sync)
- **Build command:** `npm run build` → output dir: `dist`

## ⚠️ KNOWN ISSUE — Fix Before Each Deploy
Cloudflare Pages build command may be set to `vite` (dev server) instead of `npm run build`. Always verify before triggering a production deploy. The correct settings are:
- Build command: `npm run build`
- Output directory: `dist`

## Branch Notes
- Active branch: `master`
- Old branch: `main` (should be deleted)
- Lovable syncs to whichever branch is set as GitHub default — keep `master` as default

## Duplicate Repos (Safe to Ignore/Delete)
Lovable created several private repos with hash suffixes (pournogravy-6d00a2bf, pournogravy-95895ac2, etc.). These are abandoned Lovable sessions. Only `kmitch2087-dot/pournogravy` is the real repo.

---

## 🔁 SESSION START CHECKLIST — Do This Every Session
At the start of each new Cowork session on this project:

1. **Read** `docs/PROJECT_STATUS.md` — review current status, active tasks, blockers
2. **Check** for any open build issues or deployment failures
3. **Note** what changed since last session (git log or file timestamps)
4. At the **end of every session**, update these docs:
   - `docs/PROJECT_STATUS.md` — update milestone status, completed tasks, new blockers
   - `docs/HANDOFF.md` — add any new services, schema changes, or architecture decisions
   - `docs/EXECUTIVE_SUMMARY.md` — update "Current Status" section if major features shipped

---

## Document Index (keep these current)
| File | Purpose | Update Frequency |
|------|---------|-----------------|
| `docs/EXECUTIVE_SUMMARY.md` | Client/investor-facing overview | When major features ship |
| `docs/USER_MANUAL.md` | Opie's reference guide for operating the site | When new features affect the admin/owner experience |
| `docs/HANDOFF.md` | Full technical dev handoff | Every session (add schema changes, new services, decisions) |
| `docs/PROJECT_STATUS.md` | Kristin's internal tracker | Every session |
| `docs/COST_ANALYSIS.md` | Market rate vs. actual cost | When scope changes significantly |

---

## Key Files to Know
- `src/data/products.ts` — ALL product data lives here (no DB sync yet). Add `published: true` to show in shop, `featured: true` to show in hero/featured row.
- `src/pages/` — Route-level page components (Index, Shop, ProductDetail, About, Contact, FAQ, Collections, Proposal)
- `src/components/` — Shared UI: Navbar, Footer, CartDrawer, ProductCard, CustomGarmentRequestModal
- `src/context/CartContext.tsx` — Cart state (guest + auth sessions)
- `supabase/migrations/` — All DB schema migrations (run in order)

## Supabase Tables
| Table | Purpose |
|-------|---------|
| `products` | DB products (currently shadowed by static `products.ts`) |
| `cart_items` | Guest (session_id) + auth (user_id) carts |
| `orders` | Order records — writes via service_role only |
| `order_items` | Line items per order |
| `custom_requests` | Custom garment inquiry form submissions |

## Style Preferences
- Always look for the most credit-efficient approach
- Keep an eye out for missing best practices (edge functions, RLS gaps, performance) and flag proactively
- Do not mock databases in tests — use real Supabase connections
- Prefer editing existing files over creating new ones
