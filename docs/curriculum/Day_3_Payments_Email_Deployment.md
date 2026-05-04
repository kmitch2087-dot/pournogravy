# Day 3 — Payments, Email, and Production-Grade Deployment
### Pournogravy Dev Curriculum | Kristin Mitchell
---

> Day 3 covers the backend infrastructure you built but haven't activated yet. By the end of this, you'll understand exactly what each piece does, why it's built the way it is, and what's left to turn it on.

---

## 🧠 Vocab Word Dump

| Word | What It Actually Means |
|------|----------------------|
| **Edge Function** | A serverless function that runs close to the user (on Cloudflare or Supabase's global edge network) |
| **Serverless** | Code that runs in the cloud without you managing a server — you just ship the function |
| **Webhook** | An HTTP callback — Stripe calls YOUR endpoint when something happens on their end |
| **Payment Intent** | Stripe's representation of a payment attempt with a unique ID |
| **Checkout Session** | Stripe's hosted payment page — they handle the card input, not you |
| **Idempotency** | The property of an operation that can be run multiple times and have the same result |
| **HMAC** | Hash-based Message Authentication Code — how Stripe signs webhook payloads to prove they're real |
| **Template engine** | Code that takes a template string with placeholders and substitutes real values |
| **Transactional email** | Emails triggered by user actions (order confirmation, password reset) — NOT marketing |
| **MX record** | Mail Exchange DNS record — tells the internet which server handles email for your domain |
| **Deno** | The runtime Supabase Edge Functions use (like Node.js but newer, more secure) |
| **CORS** | Cross-Origin Resource Sharing — security policy that controls which domains can call your API |
| **Rate limiting** | Capping how many requests one user/IP can make in a time period |

---

## Part 1: Why You Can't Just Process Payments in the Browser

First, let's address the obvious question: your cart knows the prices. Why not just send the payment directly from React?

**Never trust the client.** The browser can be manipulated. Anyone can open DevTools, change a variable, and tell your payment endpoint "this cart total is $0.01." If you process that on the client side, you've sold someone a $27.99 shirt for a penny.

The correct architecture:
```
Browser: "I want to buy product X, variant Y, qty 2"
    ↓
Edge Function: "Let me look up product X's price in the database... $27.99 x 2 = $55.98"
    ↓
Edge Function: creates Stripe checkout session with $55.98
    ↓
Browser: redirected to Stripe's hosted checkout page
    ↓
Stripe: handles card input, processing, fraud detection
    ↓
Stripe: tells your webhook "payment succeeded"
    ↓
Webhook function: marks order as paid in database
```

The browser never touches money directly. It just sends product identifiers. The server validates and prices everything.

---

## Part 2: Stripe Checkout — How Pournogravy's Payment Flow Works

### `create-checkout` Edge Function

When the user clicks "Checkout" in your cart drawer, here's what happens:

```typescript
// What the frontend sends:
{
  items: [
    { productId: "uuid", quantity: 2 },
    { productId: "uuid2", quantity: 1 }
  ],
  email: "customer@example.com"
}

// What create-checkout does:
1. For each item, look up price_cents in the database (NOT trusting the client's price)
2. Calculate total
3. Create a pending order in the orders table (status = 'pending')
4. Call Stripe: create a CheckoutSession with line_items and metadata.order_id
5. Return the Stripe checkout URL to the frontend
6. Frontend redirects the browser to that URL

// Stripe takes over:
- Hosted on Stripe's servers
- Handles card number input (PCI compliance — you never see card numbers)
- Handles 3D Secure, fraud checks, etc.
- On success, redirects to your success URL
- On success, fires a webhook to your endpoint
```

### Why Create the Order Before Payment?

The order is created as `pending` BEFORE Stripe processes payment. This lets you:
- Pass `order_id` to Stripe as metadata
- When the webhook fires, you know which order to mark as `paid`
- If payment fails or user abandons checkout, the pending order sits there (you can clean it up later)

### The Success URL
After payment, Stripe redirects to `pournogravy.com/success?session_id=cs_xxxx`. Your success page shows "Order confirmed!" You can fetch order details from Supabase to display.

---

## Part 3: Stripe Webhooks — The Trust Problem

Stripe fires a webhook to your endpoint when a payment completes. But here's the problem: anyone on the internet could POST to your webhook URL. How do you know it's actually Stripe?

### HMAC Signature Verification

Stripe signs every webhook payload with a secret key (`STRIPE_WEBHOOK_SECRET`). Here's how:

```
1. Stripe: concatenates timestamp + "." + payload body into a string
2. Stripe: HMAC-SHA256 signs that string with your webhook secret
3. Stripe: includes the signature in the "Stripe-Signature" header
4. Your webhook: recomputes the signature using the same secret
5. Your webhook: compares computed signature to the received one
6. Match? It's from Stripe. No match? Reject it.
```

This is why `STRIPE_WEBHOOK_SECRET` must be kept secret — it's the key that lets you verify Stripe's identity.

### What `stripe-webhook` Does on Pournogravy

```typescript
// When checkout.session.completed fires:
1. Verify the Stripe signature (reject if invalid)
2. Read metadata.order_id from the Stripe event
3. Update the order: status = 'paid', store payment_intent_id and shipping_address
4. Call send-notification to queue an order confirmation email
5. Insert into printer_queue for fulfillment (when a fulfillment partner is configured)
```

### Idempotency — What If Stripe Fires Twice?

Stripe's documentation warns that webhooks can fire more than once (network retries, etc.). Your webhook handler should be idempotent — processing the same event twice should produce the same result as processing it once.

The `stripe-webhook` function handles this by using `ON CONFLICT DO NOTHING` patterns and checking order status before updating.

---

## Part 4: Edge Functions — What They Are and Why You Can't Import Frontend Code

### What Is an Edge Function?

A Cloudflare Worker or Supabase Edge Function is a small JavaScript/TypeScript function that runs on a server — but not YOUR server. It runs on Supabase's infrastructure (in Supabase's case, using the Deno runtime), at data centers around the world.

The key difference from your frontend code:
- Runs on a server (not in a browser)
- Can access secrets (environment variables inaccessible from the browser)
- Can make authenticated calls with the service role key
- Can call third-party APIs that require secret keys (Stripe, Resend, etc.)

### Why Edge Functions Can't Import Frontend Code

Supabase Edge Functions use **Deno**, not Node.js or the browser. Deno has different APIs and a different module system. Your frontend code imports like:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

The `@/` alias is a Vite-specific thing — Vite understands it and resolves it. Deno doesn't know what `@/` means. It also doesn't have access to your `import.meta.env` variables (that's a Vite-only feature).

So if you look at `supabase/functions/create-checkout/index.ts`, it has its own Supabase client setup using Deno's environment variables:
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // service role! can bypass RLS
);
```

This is also why `src/lib/fulfillment.ts` is dead code — it tries to use the frontend Supabase client and import from frontend modules. An edge function can't call that.

---

## Part 5: Transactional Email — How Resend + Templates Work

### What Is Resend?

Resend is an email API for developers. You call their API, pass them a "to" address, subject, and HTML body, and they deliver the email. They handle spam reputation, deliverability, unsubscribe headers, etc.

### The `send-notification` Edge Function

This function is a tiny template engine + email dispatcher:

```
1. Receives: { template_name: "order_confirmation", variables: { name: "Karen", order_id: "xxx" } }
2. Fetches template from email_templates table by name
3. Substitutes {{name}} → "Karen", {{order_id}} → "xxx" in the HTML body
4. Calls Resend API with to, subject, rendered HTML
5. If RESEND_API_KEY is not set: saves with status = 'queued_no_sender' (graceful fallback)
```

The template system means Opie (or you) can update email content without a code deploy — just edit the `email_templates` table in Supabase.

### Sender Domain Verification

Email providers require you to verify that you own the domain you're sending from. For `opie@pournogravy.com`:
1. Log into Resend
2. Add `pournogravy.com` as a sending domain
3. Resend gives you DNS records to add in Cloudflare (SPF, DKIM, DMARC)
4. Once the DNS records propagate, Resend can send as `@pournogravy.com`

Without this, emails go to spam or are rejected entirely.

### The `verify-email` Edge Function

This is a public validation endpoint used on forms:
1. Checks email syntax (regex)
2. Checks against a blocklist of disposable email domains (mailinator.com, etc.)
3. Detects common typos (gmial.com → gmail.com)
4. Does a live MX record lookup via Cloudflare's DNS API to verify the domain can actually receive email

MX records are DNS entries that say "email for this domain goes to this server." `kristin@fakdomain.xyz` might pass syntax checks but fail MX lookup.

---

## Part 6: What "Serverless" Really Means

People say "serverless" like there's no server. There's definitely a server. It's just not YOUR server.

Traditional model:
- You rent a VPS (like a virtual computer)
- You install Node.js on it
- You run `node server.js` — it listens 24/7
- You pay for it even when there's no traffic
- You manage security patches, restarts, scaling

Serverless model:
- You write a function
- When a request comes in, the cloud provider spins up the function, runs it, and shuts it down
- You pay only when it runs (often fractions of a cent per invocation)
- Scaling is automatic — 1 request or 10,000 at once, same code
- No servers to manage

Supabase Edge Functions are serverless. That's why they can be deployed with `supabase functions deploy` rather than managing a server.

---

## Part 7: The Cloudflare Pages Build Pipeline — Deep Dive

Here's what really happens when you push to GitHub, with timestamps:

```
T+0:00  git push origin master
T+0:01  GitHub webhook fires to Cloudflare
T+0:05  Cloudflare Pages starts a build container (fresh Linux environment)
T+0:10  git clone github.com/kmitch2087-dot/pournogravy
T+0:15  npm install (downloads node_modules)
T+0:30  npm run build
         → Vite reads .env.production
         → TypeScript compilation
         → Tree shaking (removes unused code)
         → Minification (squishes code to be smaller)
         → Chunk splitting (splits into multiple JS files)
         → Output: dist/ directory
T+0:55  Cloudflare uploads dist/ to edge network (~200 locations)
T+1:30  pournogravy.com updated globally
```

### Why Is the Bundle 972KB?

Your bundle is currently large because of a few heavy dependencies:
- Framer Motion (animations) — ~180KB
- Supabase client — ~150KB
- React + React DOM — ~130KB
- shadcn/ui components — ~100KB

The fix is **code splitting** — instead of one big bundle, split into smaller chunks that load on demand. When someone visits the homepage, they don't need to download the Admin Dashboard code. React's `lazy()` and `Suspense` handle this:

```typescript
// Instead of:
import AdminDashboard from './pages/admin/Dashboard';

// Use lazy loading:
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
```

Now the Dashboard code only downloads when someone actually visits `/admin`. Target bundle size: <300KB for the initial load.

---

## Part 8: What's Left to Activate on Pournogravy

Here's a concrete to-do list connecting everything from this curriculum:

### 1. Stripe (Day 3, Part 2)
```
Where: Supabase Dashboard → Edge Functions → Secrets
What to add:
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
Then: register your webhook URL in Stripe Dashboard
  URL: https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/stripe-webhook
  Events: checkout.session.completed
```

### 2. Resend Email (Day 3, Part 5)
```
Where: Supabase Dashboard → Edge Functions → Secrets
What to add:
  RESEND_API_KEY=re_...
Also: verify pournogravy.com as sender domain in Resend dashboard
Also: seed email_templates table with order_confirmation template
```

### 3. Settings Table (Day 2, Part 5)
```
Where: Supabase SQL Editor
SQL: INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;
Why: Admin Settings page queries WHERE id = 1 — crashes without the row
```

### 4. Local Dev Fix (Day 1, Part 2)
```
Where: .env.local file in project root
Change: VITE_SUPABASE_PUBLISHABLE_KEY → VITE_SUPABASE_ANON_KEY
Why: Two different key names = broken local Supabase connection
```

---

## 📝 Day 3 Review Checklist

Before finishing the curriculum, make sure you can answer:
- Why can't payment processing happen in the browser?
- What is a Stripe webhook and why does it exist?
- How does HMAC signature verification prove a webhook is from Stripe?
- What is idempotency and why does it matter for webhooks?
- Why can't a Supabase Edge Function import code from your frontend?
- What is Deno and how does it differ from Node.js?
- What is a sender domain and why does Resend need you to verify it?
- What is an MX record?
- What does "serverless" actually mean in plain English?
- Why is lazy loading important for bundle size?

---

## 🎯 Connecting All Three Days

Here's the full stack of Pournogravy, layer by layer:

```
DNS (pournogravy.com → Cloudflare IP)
  → Cloudflare CDN (serves static files globally)
    → index.html + JS bundle (built by Vite, env vars baked in)
      → React (renders UI, manages state)
        → AuthContext (JWT auth, profile fetch, loading flag)
          → ProtectedRoute (loading check → user check → isAdmin check)
        → CartContext (guest session_id or user_id)
        → Supabase client (reads/writes to database, subject to RLS)
          → RLS policies (is_admin() SECURITY DEFINER function)
            → profiles table (is_admin flag, set by handle_new_user trigger)
              → admin_allowlist table (source of truth for admin emails)
        → Stripe checkout redirect
          → Supabase Edge Function: create-checkout (server-side price validation)
          → Stripe hosted payment page
          → Stripe webhook → Edge Function: stripe-webhook
            → orders table (status: pending → paid)
            → Edge Function: send-notification
              → email_templates table
              → Resend API
                → Customer inbox ✉️
```

Every piece is connected. Every bug you hit during Session 1 and Session 2 was a failure in one of these connections. Now you know where each connection lives, what it does, and what breaks when it fails.

---

*Go take the quiz. You've earned it.*
