# Pournogravy

E-commerce site for **Pournogravy** — bartender-themed apparel. Built and maintained by [Aethyx](https://aethyx.space).

- **Live site:** [pournogravy.com](https://pournogravy.com)
- **Stack:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend:** Supabase (PostgreSQL, RLS, Auth, Edge Functions, Storage)
- **Payments:** Stripe (Checkout + webhooks) · **Email:** Resend
- **Hosting:** Cloudflare Pages (project `pournogravydev`), deployed from the `master` branch

## Local development

```sh
npm install
npm run dev      # Vite dev server on http://localhost:8080
npm run build    # production build → dist/
```

Environment variables live in `.env.production` (committed — `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) so Vite bakes them into the Cloudflare Pages build. Local
dev can use `.env.local`.

## Layout

- `src/` — React app (pages, components, contexts, integrations)
- `supabase/functions/` — Deno edge functions (create-checkout, stripe-webhook,
  send-notification, printer-invite, fulfillment-portal, …)
- `supabase/migrations/` — database schema migrations (run in order)
- `docs/` — project documentation and specs

See `CLAUDE.md` for architecture notes and gotchas.
