# Pournogravy Website — Project Instructions for Claude

## Project Overview
- **Client:** Adam "Opie" Oppenheimer — Pournogravy (bartender-themed apparel brand)
- **Developer/Agency:** Kristin Mitchell — Aethyx (Founder & Developer)
- **Live Site:** pournogravy.com (Cloudflare Pages project: `pournogravydev`, connected to kmitch2087-dot/pournogravy on GitHub)
- **Stage:** Launched soft; active build in progress; payment processing pending activation

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend/DB:** Supabase (PostgreSQL, RLS, Auth, Edge Functions)
- **Payments:** Stripe (Checkout Sessions + Webhooks — edge functions built, secrets not yet set)
- **Email:** Resend (via send-notification Edge Function — API key not yet set)
- **Deployment:** Cloudflare Pages (`pournogravydev` project) → GitHub (master branch)
- **AI Builder:** Lovable (bidirectional GitHub sync to master branch)
- **Build command:** `npm run build` → output dir: `dist`

## ⚠️ CLOUDFLARE PROJECT NAME
The active CF Pages project is **`pournogravydev`** — NOT `pournogravy`. The project named `pournogravy` has no git connection and is abandoned.

## ✅ ENV VARS — RESOLVED
`.env.production` is committed to the repo (not gitignored). It contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. This guarantees Vite bakes these into the CF Pages build. Do not move these to CF Pages "Secrets" — Secrets are runtime-only and not available at Vite build time.

## ⚠️ LOCAL DEV ENV VAR
The local `.env.local` file uses `VITE_SUPABASE_PUBLISHABLE_KEY`. The integrations client (`src/integrations/supabase/client.ts`) reads `VITE_SUPABASE_ANON_KEY`. These must match or local dev will have a broken Supabase connection. Remind Kristin to fix this if it hasn't been done.

## Branch Notes
- Active branch: `master`
- Old branch: `main` (should be deleted)
- Lovable syncs to whichever branch is set as GitHub default — keep `master` as default

## Duplicate Repos (Safe to Ignore/Delete)
Lovable created several private repos with hash suffixes (pournogravy-6d00a2bf, pournogravy-95895ac2, pournogravy-c537ba60, pournogravy-c8c50645). These are abandoned Lovable sessions. Only `kmitch2087-dot/pournogravy` is the real repo.

---

## 🔁 SESSION START CHECKLIST — Do This Every Session
At the start of each new Cowork session on this project:

1. **Read** `docs/PROJECT_STATUS.md` — review current status, active tasks, blockers
2. **Check** for any open build issues or deployment failures
3. **Note** what changed since last session
4. **Check** if admin login is working (test at pournogravy.com/admin)
5. At the **end of every session**, update these docs:
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
| `docs/LOVABLE_PHASE2_PHASE3.md` | Phase 2 + 3 Lovable prompts + safe execution guide | When phases execute |

---

## Key Files to Know
- `src/data/products.ts` — ALL product data lives here (no DB sync yet). Add `published: true` to show in shop, `featured: true` for hero/featured row.
- `src/integrations/supabase/client.ts` — ✅ CANONICAL Supabase singleton. Use this everywhere. NOT `src/utils/supabase/client.ts` (dead code).
- `src/context/AuthContext.tsx` — Auth state with race condition FIX (setLoading(true) before fetchProfile). Do not regress this.
- `src/context/CartContext.tsx` — Cart state (guest + auth sessions)
- `src/lib/productSource.ts` — `useMergedProducts()` merges static + DB products. DB takes precedence by slug.
- `src/pages/admin/` — Admin dashboard pages (Login, Dashboard, Settings, ProductEdit)
- `src/components/admin/ProtectedRoute.tsx` — Checks loading → user → isAdmin. Must wait on loading.
- `supabase/migrations/` — All DB schema migrations (run in order)
- `supabase/functions/` — Edge functions: create-checkout, stripe-webhook, send-notification, verify-email
- `.env.production` — Committed. Contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

## Dead Code (Do Not Use, Should Be Deleted)
- `src/utils/supabase/` — Second Supabase client (SSR-based). Not used by anything. Delete this folder.
- `src/lib/fulfillment.ts` — Misleadingly named. Not called by any edge function. Delete this file.
- `wrangler.jsonc` — Duplicate of wrangler.toml. Delete this file.

## Supabase Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with is_admin flag |
| `admin_allowlist` | Allowlist of admin emails (kmitch2087@gmail.com, kristinmitchell@aethyx.space, aopie91@gmail.com) |
| `products` | DB products (currently shadowed by static `products.ts`) |
| `cart_items` | Guest (session_id) + auth (user_id) carts |
| `orders` | Order records — writes via service_role (Stripe webhook) |
| `order_items` | Line items per order |
| `custom_requests` | Custom garment inquiry form submissions |
| `settings` | Site config — MUST have row with id=1 for Admin Settings page to work |
| `email_templates` | Resend templates — MUST seed 'order_confirmation' and 'custom_request' rows |
| `printer_queue` | Fulfillment queue — written by stripe-webhook edge function |

## Supabase Edge Functions
| Function | Purpose | Required Secrets |
|----------|---------|-----------------|
| `create-checkout` | Stripe Checkout session creator | STRIPE_SECRET_KEY |
| `stripe-webhook` | Handles payment.completed, marks order paid | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| `send-notification` | Resend email dispatch with template system | RESEND_API_KEY |
| `verify-email` | Email validation (syntax, disposable, MX lookup) | None |

## Things Still Needing Configuration (Before Marketing)
1. Stripe secrets in Supabase Edge Function secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
2. Resend API key in Supabase Edge Function secrets: `RESEND_API_KEY`
3. Verify `opie@pournogravy.com` as sender domain in Resend
4. Select fulfillment partner (Printful or Printify) and wire API key into stripe-webhook
5. Seed settings table: `INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;`
6. Seed email_templates with 'order_confirmation' and 'custom_request' rows
7. Create Supabase Storage `products` bucket with public read access

## Style Preferences
- Always look for the most credit-efficient approach
- Keep an eye out for missing best practices (edge functions, RLS gaps, performance) and flag proactively
- Do not mock databases in tests — use real Supabase connections
- Prefer editing existing files over creating new ones
- When flagging issues in the code, cross-reference with Kristin's curriculum so they can be incorporated into her learning

## Kristin's Learning Curriculum
A 3-day developer curriculum was created (April 29, 2026) and saved to:
`~/Desktop/PG_Dev_Curriculum/`

Files:
- `Day_1_How_The_Web_Works.md` — HTTP, DNS, Vite, env vars, how the black screen bug happened
- `Day_2_Auth_Database_Security.md` — JWTs, Supabase RLS, SECURITY DEFINER, the REVOKE bug, race conditions
- `Day_3_Payments_Email_Deployment.md` — Stripe Checkout flow, Edge Functions, Resend, Cloudflare Pages
- `Quiz.md` — 30-question quiz based on all three days

**When working with Kristin:** If you encounter a bug or concept covered in the curriculum, call it out and connect it to the relevant day/topic. This reinforces learning in context.

Topics covered:
- How HTTP and DNS work (why pournogravy.com resolves)
- What Vite does at build time vs. runtime (why env vars disappeared)
- How JWTs work (what the anon key actually is)
- What RLS is and how SECURITY DEFINER functions work
- What a race condition is (the auth loading bug)
- How Stripe Checkout Sessions work server-side
- What Edge Functions are and why they can't import frontend code
- How Cloudflare Pages builds and deploys

---

## Auth Architecture (Do Not Break)
The AuthContext race condition fix is critical. Here is the correct flow:

```typescript
// onAuthStateChange fires when user logs in
if (newSession?.user) {
  setLoading(true);   // ← CRITICAL: keep ProtectedRoute waiting
  setTimeout(() => {
    fetchProfile(newSession.user.id).finally(() => setLoading(false));
  }, 0);
} else {
  setProfile(null);
  setLoading(false);
}

// getSession only clears loading if no user (onAuthStateChange handles the user case)
supabase.auth.getSession().then(({ data: { session: existing } }) => {
  if (!existing?.user) {
    setLoading(false);
  }
});
```

ProtectedRoute must check: `if (loading) return <spinner>` BEFORE checking `isAdmin`.
