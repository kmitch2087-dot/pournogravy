# Pournogravy — Lovable Phase 2 & Phase 3 Prompts
## + Safe Execution Guide
**Prepared by:** Kristin Mitchell — Aethyx
**Created:** April 29, 2026

---

## ⚠️ SAFE EXECUTION GUIDE — Read This Before Using Lovable

Lovable writes directly to GitHub. If it auto-pushes broken code to `master`, your live site breaks. Here is the safe workflow.

### The Golden Rule
**Never let Lovable push straight to production without you reviewing the diff first.**

### Safe Push Workflow — Step by Step

**Step 1: Set Lovable to NOT auto-push**
- In Lovable settings, disable "Auto-commit to GitHub" if that option is available
- If Lovable doesn't give you that control, proceed to Step 2 carefully

**Step 2: Make your changes in Lovable**
- Use the prompts below, one section at a time
- Preview the result in Lovable's preview panel before continuing
- If something looks wrong in preview, fix it in Lovable before proceeding

**Step 3: Download the Lovable output**
- In Lovable → "Export" or "Download ZIP" (exact wording may vary)
- This gives you the modified files without pushing them to GitHub yet

**Step 4: Review the diff locally**
```bash
# In your terminal, from the project root:
cd /Users/kristinmitchell/Documents/Claude/Projects/Pournogravy\ Website\ Build.

# Unzip the Lovable export to a temp folder, then compare
# Or if Lovable pushes to a branch, do:
git fetch origin
git diff master..lovable-branch-name --name-only  # see which files changed
git diff master..lovable-branch-name              # see exact changes
```

**Step 5: Test locally**
```bash
npm install   # in case new deps were added
npm run build # must succeed with zero errors
npm run preview # verify it looks right at localhost:4173
```

**Step 6: Push to production**
```bash
git push origin master
# CF Pages auto-deploys within ~2 minutes
```

**Step 7: Verify live**
- Visit pournogravy.com and pournogravy.com/admin
- Check that the new feature works
- Check that existing features aren't broken (nav, cart, shop, product pages)

### If Something Breaks After a Push
Go to Cloudflare Pages → `pournogravydev` → Deployments → click the last known-good deployment → **Rollback to this deployment**. Site is back in under 60 seconds.

---

## Phase 2 — Growth Features

### Overview
Phase 2 adds SEO, discount codes, product reviews, and polishes the admin experience. These are all UI/logic additions — none of them touch the payment pipeline or auth system, making them relatively safe to Lovable.

**Estimated Lovable sessions:** 3–4 sessions, one feature group at a time

---

### Phase 2 — Prompt 1: SEO & Open Graph

Paste this prompt into Lovable:

```
Add SEO meta tags and Open Graph support to the Pournogravy website.

For every page:
- Add a <title> tag with the format "[Page Name] — Pournogravy"
- Add meta description (150–160 characters, humor-forward brand voice)
- Add Open Graph tags: og:title, og:description, og:image, og:url, og:type
- Add Twitter card tags: twitter:card (summary_large_image), twitter:title, twitter:description, twitter:image

For product detail pages:
- og:title = "[Product Name] — Pournogravy"
- og:description = the product's humor tagline + a short CTA
- og:type = "product"
- og:image = the product's primary image URL

Use react-helmet-async (install if not present) to manage head tags dynamically.

Also create:
- public/sitemap.xml — a static sitemap with all current product and page URLs, pournogravy.com as base
- public/robots.txt — allow all crawlers, point to sitemap

Do not change any existing functionality. Only add meta tags and the static files.
```

---

### Phase 2 — Prompt 2: Discount / Promo Code System

Paste this prompt into Lovable:

```
Add a discount code system to the Pournogravy checkout flow.

Database:
Add a Supabase migration for a "discount_codes" table:
- id (uuid PK)
- code (text, UNIQUE, case-insensitive)
- discount_type (text: 'percent' or 'fixed_cents')
- discount_value (integer — e.g. 20 for 20%, or 500 for $5.00 off)
- min_order_cents (integer DEFAULT 0 — minimum order to qualify)
- max_uses (integer nullable — null = unlimited)
- use_count (integer DEFAULT 0)
- expires_at (timestamptz nullable)
- is_active (boolean DEFAULT true)
- created_at, updated_at

RLS: anon can SELECT where is_active = true and not expired. Service role can write.

Frontend (CartDrawer):
- Add a "Promo Code" input field and "Apply" button below the cart item list
- On apply: call a new Supabase Edge Function "validate-discount" with the code and current cart total
- Show success (code applied, discount shown as a line item) or error (invalid, expired, min not met)
- Store the applied code in CartContext
- Show the discount deducted in the order total

Edge Function (validate-discount):
- Accepts: { code: string, cart_total_cents: number }
- Validates: code exists, is_active, not expired, use_count < max_uses, cart meets min_order
- Returns: { valid: boolean, discount_cents: number, message: string }

Also update the create-checkout Edge Function to accept and validate an optional discount_code. Apply the discount server-side (never trust the client-calculated discount). Increment use_count on the discount_codes row when a checkout session is created.

Do not change existing auth, cart, or product logic.
```

---

### Phase 2 — Prompt 3: Product Reviews

Paste this prompt into Lovable:

```
Add a product reviews system to Pournogravy.

Database migration:
- "product_reviews" table:
  - id (uuid PK)
  - product_slug (text — matches products.ts slug)
  - user_id (uuid nullable → auth.users)
  - reviewer_name (text NOT NULL — can be guest)
  - rating (integer 1–5, checked constraint)
  - body (text nullable)
  - is_approved (boolean DEFAULT false — admin must approve)
  - created_at, updated_at

RLS:
- Anon/auth: SELECT where is_approved = true
- Anon/auth: INSERT (any visitor can submit)
- Admin only: UPDATE is_approved

Frontend (ProductDetail page):
- Below the product description, add a "Reviews" section
- Show approved reviews: star rating, reviewer name, date, body text
- Show aggregate rating (average stars, total count) near the product title
- Add a "Leave a Review" form: name, rating (star selector), body text (optional)
- On submit: INSERT into product_reviews. Show "Thanks — your review is pending approval."
- If no approved reviews yet, show "Be the first to review this product."

Admin Dashboard:
- Add a "Reviews" tab/section in the admin area
- Show pending reviews (is_approved = false) with Approve / Delete buttons
- Show approved reviews with Delete button

Do not change any existing cart, auth, or product logic.
```

---

### Phase 2 — Prompt 4: Cart Merge on Login + Admin Polish

Paste this prompt into Lovable:

```
Two improvements:

1. Cart merge on login:
In CartContext, when a user logs in (session changes from null to a valid user), merge the guest cart (session_id) into the auth cart (user_id):
- For each item in the guest cart: if the product already exists in the auth cart, add quantities (up to a max of 99). If it doesn't exist, insert it with the user_id.
- After merging, delete the guest cart_items rows for this session_id.
- This should happen once, silently, when onAuthStateChange fires with a new user session.

2. Admin dashboard polish:
- On the Dashboard page, add a "revenue" stat card showing total revenue from paid orders (sum of total_cents where status = 'paid', formatted as currency)
- Add a "pending fulfillment" count (orders where status = 'paid' and not yet 'fulfilled')
- Make the custom_requests table in the admin sortable by date and filterable by status (new/contacted/quoted/closed)
- Add a "mark as contacted" quick-action button on each custom request row

Do not change auth logic, payment processing, or product data.
```

---

## Phase 3 — Scale Features

### Overview
Phase 3 adds Cloudflare Workers (server-side Supabase proxy), analytics, and the foundations for B2B/wholesale. These are larger architectural additions. Do them one at a time and test thoroughly after each.

**Estimated Lovable sessions:** 4–6 sessions

---

### Phase 3 — Prompt 1: Cloudflare Workers API Proxy

**Note:** This one requires manual Wrangler deployment after Lovable generates the code. Do not try to auto-deploy this.

Paste this prompt into Lovable:

```
Add a Cloudflare Workers API proxy layer for security.

Currently the Supabase anon key is in the client bundle (this is standard and acceptable, but a proxy adds a layer of protection). The goal is to route Supabase API calls through a Cloudflare Worker instead of directly from the browser.

Create:
- wrangler.toml configuration for a new Worker (do not overwrite the existing wrangler.toml SPA routing config — create a separate workers/ directory)
- workers/supabase-proxy/index.ts — a Cloudflare Worker that:
  - Accepts requests from the frontend
  - Validates the origin (only pournogravy.com and localhost:8080)
  - Forwards to Supabase with the anon key in the Authorization header
  - Returns the Supabase response
  - Adds rate limiting (100 requests per minute per IP using Cloudflare's built-in rate limiting)

Update the frontend Supabase client to point to the Worker URL instead of directly to Supabase. Use an env var: VITE_SUPABASE_PROXY_URL. Fall back to direct Supabase URL if the proxy URL is not set.

Include deployment instructions in a README comment in the Worker file.

Do not change the existing wrangler.toml (SPA routing).
```

---

### Phase 3 — Prompt 2: Analytics Integration

Paste this prompt into Lovable:

```
Add privacy-friendly analytics to Pournogravy using Cloudflare Web Analytics.

Cloudflare Web Analytics is free and does not use cookies or collect personal data — GDPR compliant out of the box. No cookie banner needed.

Steps:
1. Add the Cloudflare Web Analytics beacon script to index.html:
   <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "REPLACE_WITH_TOKEN"}'></script>
   (I will replace the token manually — just add the script tag with the placeholder)

2. Add a VITE_CF_ANALYTICS_TOKEN env var so the token can be set at build time rather than hardcoded.

3. Add custom event tracking for:
   - "add_to_cart" — product slug and variant when item added to cart
   - "checkout_started" — when user clicks checkout
   - "custom_request_submitted" — when custom garment form is submitted

   Use window.cfBeacon?.pushEvent if available (graceful fallback if beacon not loaded).

Do not add Google Analytics, Meta Pixel, or any other analytics. Cloudflare only.
```

---

### Phase 3 — Prompt 3: Wholesale / B2B Portal Foundation

Paste this prompt into Lovable:

```
Add the foundation for a wholesale/B2B ordering portal on Pournogravy.

Database migrations:
1. "wholesale_accounts" table:
   - id (uuid PK)
   - business_name (text NOT NULL)
   - contact_name (text)
   - email (text UNIQUE NOT NULL)
   - phone (text)
   - discount_percent (integer DEFAULT 20 — wholesale discount off retail)
   - status (text: 'pending'|'approved'|'suspended') DEFAULT 'pending'
   - created_at, updated_at

2. Add "wholesale_account_id" (uuid nullable) to the orders table

RLS:
- wholesale_accounts: owner can SELECT their own row. Admin can SELECT/UPDATE all.
- Anon: INSERT (apply for wholesale account)

Frontend:
- Add a /wholesale page with:
  - A "wholesale application" form (business name, contact, email, phone, brief about their business)
  - On submit: INSERT into wholesale_accounts with status='pending'
  - Show a "We'll review your application within 2 business days" confirmation

- Add a link to /wholesale in the footer (between Contact and FAQ)

Admin Dashboard:
- Add a "Wholesale" tab showing pending applications with Approve / Suspend / Reject buttons
- Approving sets status='approved' and sends a notification email via the send-notification edge function

Phase 2 of wholesale pricing (logged-in wholesale users see discounted prices) is out of scope for this prompt — just the application flow and admin approval.
```

---

### Phase 3 — Prompt 4: Subscription / Loyalty Placeholder

Paste this prompt into Lovable:

```
Add a loyalty program foundation to Pournogravy — a "Pour Points" rewards system.

Database migration:
- "loyalty_accounts" table:
  - id (uuid PK)
  - user_id (uuid UNIQUE → auth.users)
  - points_balance (integer DEFAULT 0)
  - lifetime_points (integer DEFAULT 0)
  - created_at, updated_at

- "loyalty_transactions" table:
  - id (uuid PK)
  - user_id (uuid → auth.users)
  - order_id (uuid nullable → orders.id)
  - points_delta (integer — positive = earned, negative = redeemed)
  - reason (text — e.g. 'purchase', 'redemption', 'signup_bonus')
  - created_at

RLS: Users can SELECT their own rows. Service role writes.

Logic (in the stripe-webhook Edge Function):
- On checkout.session.completed: INSERT a loyalty_transaction earning 1 point per dollar spent (total_cents / 100, rounded down)
- UPDATE loyalty_accounts points_balance and lifetime_points for the user

Frontend:
- On the user account page (or create a simple /account page if one doesn't exist): show current points balance and recent transactions
- Add a "Pour Points" badge/link in the navbar for logged-in users
- On the signup/registration flow: award 50 signup bonus points via a loyalty_transaction

Do not add points redemption yet — that's Phase 4. Just earning and display.
```

---

## Post-Phase Notes

After Phase 2 is complete, run:
- Full cart-to-checkout test with a real (or test-mode) Stripe payment
- Test discount codes end to end
- Test product review submission and admin approval flow
- Check that SEO meta tags appear in browser dev tools → Elements → head

After Phase 3 is complete:
- Set `VITE_CF_ANALYTICS_TOKEN` in `.env.production` and redeploy
- Deploy the Cloudflare Worker via `wrangler deploy` from the workers/ directory
- Test the wholesale application form as a guest

---

*Maintained by Aethyx. Update this doc as phases are executed.*
