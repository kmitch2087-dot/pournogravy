#!/bin/bash
# Pournogravy — Parallel Feature Build
# Run this from Terminal: bash run-agents.sh
# Each agent works on non-overlapping files. Do NOT commit mid-run.
# After all agents finish, review changes and do ONE commit.

REPO="/Users/kristinmitchell/Documents/Claude/Projects/Pournogravy Website Build."
cd "$REPO"

echo "🍺 Launching 7 agents in parallel..."
echo "   Logs: /tmp/pg-agent-{a..g}.log"
echo ""

# ─────────────────────────────────────────────────────────────
# AGENT A — Dashboard UI Polish
# Touches: src/pages/admin/Dashboard.tsx, src/pages/admin/Subscribers.tsx,
#          src/pages/admin/Analytics.tsx, admin sidebar component, theme/CSS
# ─────────────────────────────────────────────────────────────
claude --print '
You are working on the Pournogravy website (React + TypeScript + Vite + Tailwind + shadcn/ui).
Read CLAUDE.md at the project root before starting — it has critical architecture notes.
DO NOT commit anything — just make the code changes.

Complete ALL of the following tasks:

1. DASHBOARD FONT: Find src/pages/admin/Dashboard.tsx. Import "Space Grotesk" or "DM Sans" via a <link> in index.html (check if already imported; if not, add it). Apply as font-family to the dashboard main container. Gritty but readable — bar-industry vibes.

2. DASHBOARD STAT BOXES → CLICKABLE POPUP: In Dashboard.tsx, wrap each stat card (orders today, revenue today, pending requests, total revenue, pending fulfillment) in a clickable element. On click, open a shadcn Dialog showing the detail records behind that stat. Query the relevant Supabase tables lazily (only when the dialog opens, using useQuery with `enabled: open`). Example: "Orders Today" dialog shows list of today'\''s orders (email, total, status). Use src/integrations/supabase/client.ts — never create a second Supabase client.

3. SUBSCRIBERS → CLICKABLE POPUP: In src/pages/admin/Subscribers.tsx, make each row clickable → Dialog showing full subscriber record (email, created_at, Pour Points from profiles if available, order count from orders table).

4. DASHBOARD BLACK SCREEN BUG: Dashboard.tsx goes black when switching tabs quickly. Fix: add `refetchOnWindowFocus: false` to all useQuery calls in Dashboard.tsx. Gate the loading skeleton so it only shows when `isLoading && !data` (not on background refetches). Remove any Framer Motion exit animations that might cause unmount flickering.

5. SIDEBAR SCROLL INDEPENDENCE: Find the admin layout wrapper (check src/components/admin/ or wherever the sidebar is). Apply `position: sticky; top: 0; height: 100vh; overflow-y: auto` to the sidebar. The main content area gets `flex: 1; overflow-y: auto`. Save sidebar scroll position to sessionStorage on scroll and restore it on mount.

6. HOVER TOOLTIPS: Wrap icon-only buttons throughout the admin (sidebar nav icons, action icon buttons in tables) with shadcn Tooltip/TooltipTrigger/TooltipContent. Make sure TooltipProvider wraps the admin layout root.

7. THEME TOGGLE FIX: Find the theme toggle implementation. The "system" option must listen to window.matchMedia("(prefers-color-scheme: dark)") and update live. Add an inline script to index.html <head> that reads localStorage theme and applies the class to <html> before React loads (prevents flash-of-wrong-theme).
' > /tmp/pg-agent-a.log 2>&1 &
PID_A=$!
echo "✓ Agent A started (PID $PID_A) — Dashboard UI Polish"

# ─────────────────────────────────────────────────────────────
# AGENT B — Cart Drawer + Email Aesthetics + Abandoned Cart
# Touches: src/components/CartDrawer.tsx, send-notification templates,
#          supabase/functions/abandoned-cart-reminder/ (new),
#          supabase/migrations/ (new: cart last_updated_at, abandoned_cart template)
# ─────────────────────────────────────────────────────────────
claude --print '
You are working on the Pournogravy website (React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase).
Read CLAUDE.md at the project root before starting.
DO NOT commit anything. This is a bartender-themed apparel brand — dive bar vibe, crude humor welcome.

Complete ALL of the following tasks:

1. CART DRAWER → GUEST CHECK / BAR TAB STYLE:
Read src/components/CartDrawer.tsx in full first.
Redesign visually to look like a bar tab slip:
- Background: cream (#faf8f0), slight worn texture via CSS
- Header: "YOUR TAB" in font-marker or font-display (check tailwind config for these classes)
- Line items: "PRODUCT NAME x2 ............ $55.98" format — text only, no product cards/images in line items
- Dashed separator line between items and totals
- Subtotal line, then italic "GRATUITY NOT INCLUDED (but karma is)", then total
- CTA button: "CLOSE OUT" instead of "Checkout" — yellow (#fde047), black text
- Optional: CSS-only beer ring stain in corner (brown/amber circle, low opacity, position:absolute)
- Keep ALL existing cart logic (add/remove, quantity, Stripe checkout call) unchanged — visual layer only
- Mobile: full-screen sheet. Desktop: side panel.

2. ORDER CONFIRMATION EMAIL → GUEST CHECK STYLE:
Read supabase/functions/send-notification/index.ts to find where the order_confirmation template renders.
If the template HTML is hardcoded in the function, update it there.
If it comes from the email_templates DB table, update the seed migration or create a new migration that UPDATEs the body for templateKey='"'"'order_confirmation'"'"'.
New template: off-white bg, Courier-style monospace font for line items. Header: "THANKS FOR DRINKING WITH US". Show order number, each item + qty + price, subtotal, shipping, total. Footer: "NOW GO WEAR IT TO THE BAR AND START TROUBLE." Inline CSS only (no external stylesheets — email clients).
Keep all {{variable}} placeholders intact.

3. ABANDONED CART REMINDER:
- Create migration supabase/migrations/20260616000003_cart_last_updated.sql: ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT now();
- In src/context/CartContext.tsx: DO NOT add any getSession() call. Check how CartContext currently gets auth state (should be via onAuthStateChange). When upserting cart items for authenticated users, include last_updated_at: new Date().toISOString() in the upsert payload.
- Create supabase/functions/abandoned-cart-reminder/index.ts: queries cart_items WHERE last_updated_at < now() - interval '"'"'1 hour'"'"' AND user_id IS NOT NULL. For each, get user email from auth.users (service role). Call send-notification for templateKey '"'"'abandoned_cart'"'"'. Add comment about pg_cron setup.
- Create migration supabase/migrations/20260616000003b_abandoned_cart_template.sql: INSERT into email_templates (key, subject, body) VALUES ('"'"'abandoned_cart'"'"', '"'"'HEY. YOU LEFT YOUR TAB OPEN.'"'"', '"'"'<html>...[simple template with link to pournogravy.com and {{items}} placeholder]...</html>'"'"') ON CONFLICT (key) DO UPDATE SET body=EXCLUDED.body;

4. PRODUCT PHOTO IN PRINTER EMAIL:
Read supabase/functions/stripe-webhook/index.ts. Find where it sends the printer_notification.
Add the product image URL to the printer notification variables. Query products table for image_url using the product slug from the order items. Update the printer_notification template to show an <img src="{{product_image_url}}" style="max-width:200px;display:block;margin-bottom:8px;" /> above the line items.
' > /tmp/pg-agent-b.log 2>&1 &
PID_B=$!
echo "✓ Agent B started (PID $PID_B) — Cart + Email + Abandoned Cart"

# ─────────────────────────────────────────────────────────────
# AGENT C — Orders + Mock Data + Archive Cron + Profit Fix
# Touches: src/pages/admin/Orders.tsx, supabase/functions/refund-order/ (new),
#          supabase/functions/archive-orders/ (new), supabase/migrations/ (new),
#          profit margin wherever it lives
# ─────────────────────────────────────────────────────────────
claude --print '
You are working on the Pournogravy website (React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase).
Read CLAUDE.md at the project root before starting.
DO NOT commit anything — just make the code changes.

Complete ALL of the following tasks:

1. ORDERS — CANCEL + REFUND:
Read src/pages/admin/Orders.tsx in full.
Add a "Cancel & Refund" button on orders with status "paid" or "processing".
On click: show a shadcn Dialog confirmation with amount and email. On confirm: call new edge function refund-order.
Create supabase/functions/refund-order/index.ts:
- Auth: same pattern as send-notification (service role key OR admin JWT)
- Takes JSON body: { order_id, stripe_payment_intent_id }
- Calls Stripe Refunds API: POST https://api.stripe.com/v1/refunds with payment_intent param, using STRIPE_SECRET_KEY from env
- Updates orders SET status='"'"'refunded'"'"' WHERE id=order_id (using service role Supabase client)
- Returns { ok: true } or { error: "..." }
Check existing orders table migrations to see if stripe_payment_intent_id column exists. If not, add migration: supabase/migrations/20260616000001_orders_payment_intent.sql
After success: update order row in UI (React Query invalidateQueries), show toast, hide button.

2. ORDERS — SUNDAY MIDNIGHT ARCHIVE:
Create supabase/functions/archive-orders/index.ts:
- Auth: service role only
- Creates order_archive table rows from orders WHERE created_at < now()-30days AND status IN (fulfilled, delivered, refunded)
- Deletes those rows from orders
- Returns count
Create migration supabase/migrations/20260616000002_order_archive.sql: CREATE TABLE IF NOT EXISTS order_archive (LIKE orders INCLUDING ALL, archived_at TIMESTAMPTZ DEFAULT now());
Add cron setup comment in the edge function.

3. ORDERS — MONTHLY/YEARLY FOLDER VIEW:
In src/pages/admin/Orders.tsx, add a left sidebar tree showing Year > Month navigation.
Clicking a month filters the orders table to that period (add .gte/.lte to the Supabase query).
Show order count per month. Default to "All Orders". Use a collapsible tree (simple CSS, no external lib needed — just indented buttons).

4. MOCK ORDERS SEED:
Read the orders and order_items table migration to confirm schema columns.
Create supabase/migrations/20260616000004_seed_mock_orders.sql with:
- 15 INSERT INTO orders rows: mix of statuses (paid/fulfilled/shipped/delivered), emails like barfly@example.com, amounts 2500-12000 cents, created_at spread over last 90 days using NOW() - INTERVAL '"'"'X days'"'"'
- 5 INSERT INTO order_items linked to those orders
- 3 INSERT INTO custom_requests with status '"'"'new'"'"'
Comment: "-- MOCK DATA for dashboard demo. DELETE before launch."

5. PROFIT MARGIN FIX:
Search the codebase for any calculation involving profit margin or base cost (grep for "25" or "margin" or "cost" in src/pages/admin/). Update any hardcoded $25 base cost to $27.99. Add comment: "// Base cost per unit: $27.99 (updated 2026-06-16)"
' > /tmp/pg-agent-c.log 2>&1 &
PID_C=$!
echo "✓ Agent C started (PID $PID_C) — Orders + Archive + Mock Data + Profit Fix"

# ─────────────────────────────────────────────────────────────
# AGENT D — Inbox Full Rebuild
# Touches: src/pages/admin/Inbox.tsx, src/pages/admin/EmailTemplates.tsx,
#          supabase/functions/blast-email/ (new), supabase/migrations/ (soft-delete)
# ─────────────────────────────────────────────────────────────
claude --print '
You are working on the Pournogravy website (React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase).
Read CLAUDE.md at the project root before starting.
DO NOT commit anything — just make the code changes.

Read src/pages/admin/Inbox.tsx and src/pages/admin/EmailTemplates.tsx in full before starting.

Complete ALL of the following tasks:

1. MERGE EMAIL TEMPLATES INTO INBOX:
Add a tab bar to Inbox.tsx: "Inbox" | "Sent" | "Trash" | "Templates"
Move EmailTemplates.tsx content into the Templates tab. Update router in src/App.tsx to redirect /admin/email-templates to /admin/inbox (or just keep both routes pointing to the same component with a tab param).

2. SENT FOLDER:
"Sent" tab: query notifications table WHERE status IN ('"'"'sent'"'"', '"'"'queued_no_sender'"'"'). Show: recipient, template_key, created_at, status. Clickable rows show full details.

3. TRASH + SOFT DELETE + MULTI-SELECT:
Create migration supabase/migrations/20260616000005_notifications_soft_delete.sql:
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
In Inbox tab: filter WHERE deleted_at IS NULL.
"Trash" tab: WHERE deleted_at IS NOT NULL, with "Permanently Delete" button (hard DELETE).
Add row checkboxes + "Select All" + "Delete Selected" bulk action (sets deleted_at=now()).
Add trash icon on each row for single soft-delete.

4. COMPOSE + TO: AUTOFILL:
Add a "Compose" button that opens a Sheet/Dialog with:
- To: field — debounced input that queries orders, custom_requests, subscribers tables for matching emails (ILIKE search). Shows dropdown with up to 10 matches. Also hardcodes: kmitch2087@gmail.com, aopie91@gmail.com in the list.
- Subject, Template (dropdown of template keys), Body (Textarea — see item 6)
- Send button calls send-notification edge function

5. @EVERYONE BLAST:
In the To: field, when user types "@everyone", show a count of unique subscriber emails and a confirmation. On confirm, call new edge function blast-email.
Create supabase/functions/blast-email/index.ts:
- Auth: service role only
- Takes: { templateKey, subject, variables }
- Queries all emails from subscribers table (and optionally orders if no subscribers)
- Loops through each, calls send-notification (or Resend API directly), adds 100ms delay between each to respect rate limits
- Returns { sent: N, failed: M }

6. SCROLLING TEXT COMPOSITION FIELDS:
Any <Input> or single-line field being used for multi-line email body content — replace with <Textarea className="min-h-[200px] max-h-[400px] overflow-y-auto resize-y" />. Make sure Enter key creates newlines (not submits form — use onKeyDown to check for Shift+Enter or just not submit on Enter).
' > /tmp/pg-agent-d.log 2>&1 &
PID_D=$!
echo "✓ Agent D started (PID $PID_D) — Inbox Full Rebuild"

# ─────────────────────────────────────────────────────────────
# AGENT E — Product Admin + Print Audit + Live Toggle
# Touches: src/pages/admin/ProductEdit.tsx, src/pages/admin/Products.tsx,
#          src/pages/admin/PrintFiles.tsx, src/pages/ProductDetail.tsx,
#          src/data/products.ts (read-only audit)
# ─────────────────────────────────────────────────────────────
claude --print '
You are working on the Pournogravy website (React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase).
Read CLAUDE.md at the project root before starting.
DO NOT commit anything — just make the code changes.

Complete ALL of the following tasks:

1. PRODUCT ADMIN — IMAGE UPLOAD:
Read src/pages/admin/ProductEdit.tsx in full.
Add image upload below the current image URL field:
- "Upload Image" button → triggers hidden <input type="file" accept="image/*">
- On file select: show preview, then upload to Supabase Storage bucket "products" (already exists, public read) using supabase.storage.from("products").upload(`${slug}-${Date.now()}.${ext}`, file, { upsert: true })
- After upload: getPublicUrl and auto-fill the image URL field
- Show upload progress (spinner on the button while in flight)
- "Remove Image" button clears the field
Use the canonical supabase client: src/integrations/supabase/client.ts

2. BASIC SHIRT MOCKUP PREVIEW IN PRODUCT EDITOR:
When editing a product, after the image upload section, add a "Print Preview" section:
- Try to load print files from Supabase Storage: supabase.storage.from("print-files").getPublicUrl("black/{slug}.png") and getPublicUrl("white/{slug}.png")
- Show a simple inline SVG shirt outline (build a minimal shirt SVG: two rectangles for body + sleeves, a neckline cutout — all in one SVG, no external files)
- Overlay the print file PNG centered on the chest area using CSS (position:absolute, ~40% width of shirt)
- Two previews side by side: dark background + white print, light background + black print
- If image 404s, hide the preview section gracefully (onError handler)

3. PRINT FILES AUDIT:
Read src/pages/admin/PrintFiles.tsx in full.
Enhance it to show a cross-reference audit:
- List all files from storage: supabase.storage.from("print-files").list("black") and .list("white")
- Read product slugs from the products data (import from src/data/products.ts or query the products table)
- Show audit table: Slug | Black ✓/✗ | White ✓/✗ | Product exists ✓/✗ | Notes
- Flag orphaned files (filename has no matching product slug) with red badge "ORPHANED"
- Flag products missing print files with amber "MISSING PRINT FILE"
- Flag filenames matching patterns like "-part", "-1", "-2" with "⚠️ SPLIT FILE — verify with printer"
- Add Refresh button

4. PRODUCT LIVE TOGGLE — LISTED vs PURCHASABLE:
Read src/pages/admin/Products.tsx in full. Read src/data/products.ts to see which products have stripeProductId and stripePriceId.
Change the single live/draft toggle to a two-state badge system:
- GREEN "LIVE": published=true AND has stripeProductId AND stripePriceId (actually purchasable)
- AMBER "LISTED": published=true but missing Stripe IDs (visible in shop, cannot be purchased)
- GREY "DRAFT": published=false
Add tooltip on LISTED badge: "Visible in shop but cannot be purchased — set a Stripe Price ID first."
In src/pages/ProductDetail.tsx: if product has no stripePriceId, hide the Add to Cart button and show: "Drop coming soon — get on the list" with a small email subscribe input (on submit, insert to subscribers table).
' > /tmp/pg-agent-e.log 2>&1 &
PID_E=$!
echo "✓ Agent E started (PID $PID_E) — Product Admin + Print Audit + Live Toggle"

# ─────────────────────────────────────────────────────────────
# AGENT F — Blog + Reviews + Client Requests + Shipping
# Touches: src/pages/Blog.tsx, src/pages/Index.tsx, src/pages/admin/CustomRequests.tsx,
#          src/pages/admin/Settings.tsx, src/App.tsx (blog route check),
#          supabase/migrations/ (blog posts, reviews, shipping, custom requests archive)
# ─────────────────────────────────────────────────────────────
claude --print '
You are working on the Pournogravy website (React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase).
Read CLAUDE.md at the project root before starting.
DO NOT commit anything. Maintain the brand voice: bar industry, crude humor, bartender culture.

Complete ALL of the following tasks:

1. BLOG PAGE — MAKE IT ACTUALLY DISPLAY POSTS:
Read src/pages/Blog.tsx in full. Read src/App.tsx to confirm /blog route exists.
Diagnose why posts are not showing. Most likely: no data in blog_posts table.
Create migration supabase/migrations/20260616000006_blog_posts_and_seed.sql:
- CREATE TABLE IF NOT EXISTS blog_posts with: id uuid default gen_random_uuid(), title text, slug text unique, excerpt text, content text, featured_image_url text, tags text[], published_at timestamptz, created_at timestamptz default now()
- Seed 3 posts with bar-industry titles and crude humor excerpts. Sample titles: "How to Build a Killer Well Program Without Going Broke", "5 Shots That Actually Sell Themselves (And One That Definitely Does Not)", "Closing Time Survival Guide: What to Wear When Your Shift Goes Sideways". Set published_at = now(). Tags like ["bar-life", "gear", "tips"]. No featured_image_url needed (null is fine). Slugs should be URL-friendly.
Also verify Blog.tsx is filtering on published_at IS NOT NULL — if so, the seed data satisfies this.

2. REVIEWS ON HOMEPAGE:
Read src/pages/Index.tsx. Read the reviews table schema (find the migration that created it).
Add a "WHAT THE BAR SAYS" section to the homepage below the featured products grid:
- Section header in font-display style matching the rest of the page
- Query reviews WHERE approved=true (or equivalent). Limit 6.
- Display as a 3-column grid (desktop) / 1-col (mobile): star rating, truncated body (120 chars + ...), author_name, product name
- If no approved reviews exist, create migration supabase/migrations/20260616000007_seed_reviews.sql with 3 mock reviews: author names like "DoubleShift_Dan", "LastCall_Lena", "FlairFrank_84" — ratings 4-5 stars — bar-themed crude humor comments. Link to a product slug from src/data/products.ts. Set approved=true.

3. CLIENT REQUESTS — MARK DONE + ARCHIVE:
Read src/pages/admin/CustomRequests.tsx (and EditRequests.tsx if it exists — check both).
Add:
- "Mark Done" button per row → UPDATE custom_requests SET status='"'"'completed'"'"' WHERE id=...
- "Archive" button per row → UPDATE custom_requests SET archived_at=now() WHERE id=...
Create migration supabase/migrations/20260616000008_custom_requests_archive.sql:
ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
Default view: WHERE archived_at IS NULL.
Add tab bar: "Active" | "Done" | "Archived" with counts.
"Done" tab shows status='"'"'completed'"'"'. "Archived" tab shows archived_at IS NOT NULL with "Unarchive" button.

4. SHIPPING FLAT RATES — EDITABLE + PUBLIC:
Read src/pages/admin/Settings.tsx in full.
Create migration supabase/migrations/20260616000009_settings_shipping.sql:
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shipping_standard_cents INTEGER DEFAULT 799;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS shipping_express_cents INTEGER DEFAULT 1499;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS free_shipping_threshold_cents INTEGER DEFAULT 7500;
In Settings.tsx: add "Shipping Rates" section with dollar-formatted inputs (display as $, store as cents * 100). Save updates the settings row id=1.
On the public site: in src/components/CartDrawer.tsx, below the totals, show "Standard Shipping: $X.XX" (or "FREE" if subtotal > threshold). Fetch from settings table with React Query (staleTime: 5 * 60 * 1000). If settings fetch fails, default to $7.99 standard / free over $75.
In src/pages/Shop.tsx (check if it exists) or FAQ.tsx: add a "🚚 Free shipping on orders over $[threshold]" banner from settings.
' > /tmp/pg-agent-f.log 2>&1 &
PID_F=$!
echo "✓ Agent F started (PID $PID_F) — Blog + Reviews + Client Requests + Shipping"

# ─────────────────────────────────────────────────────────────
# AGENT G — Fulfillment Vendor UI + Docs Update
# Touches: src/pages/admin/Settings.tsx (fulfillment section),
#          supabase/functions/add-fulfillment-vendor/ (new),
#          supabase/migrations/ (fulfillment_vendors table),
#          docs/PROJECT_STATUS.md, docs/HANDOFF.md
# ─────────────────────────────────────────────────────────────
claude --print '
You are working on the Pournogravy website (React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase).
Read CLAUDE.md at the project root before starting.
DO NOT commit anything — just make the code changes.

Complete ALL of the following tasks:

1. FULFILLMENT PARTNER MANAGEMENT UI:
Read src/pages/admin/Settings.tsx in full. It already has fulfillment_provider and printer_email fields.
Expand the fulfillment section into a "Fulfillment Partners" panel with:
- Current active partner display (from settings table)
- A vendors table listing fulfillment_vendors rows (see migration below)
- "Set as Active" button per vendor row → updates settings.fulfillment_provider and settings.printer_email
- "Add New Vendor" button → opens Sheet with vendor intake form:
  * Company Name (required), Contact Name, Email (required), Phone
  * Services: checkboxes for DTG Printing, Screen Printing, Embroidery, Fulfillment/Shipping
  * Turnaround: select 1-3 days / 3-5 days / 5-7 days / 2 weeks
  * Min order qty (number input)
  * Notes, File format requirements (PNG/PDF/AI/PSD checkboxes)
  * On submit: call new edge function add-fulfillment-vendor (see below)
Create migration supabase/migrations/20260616000010_fulfillment_vendors.sql:
CREATE TABLE IF NOT EXISTS fulfillment_vendors (id uuid default gen_random_uuid() primary key, company_name text not null, contact_name text, email text not null, phone text, services text[], turnaround text, min_order_qty integer, notes text, file_formats text[], active boolean default false, created_at timestamptz default now());
Create supabase/functions/add-fulfillment-vendor/index.ts:
- Auth: admin JWT or service role
- Inserts row to fulfillment_vendors (service role client)
- Calls send-notification edge function with templateKey '"'"'vendor_welcome'"'"', recipient=vendor email, variables { contact_name, company_name }
- Returns { ok: true, vendor_id }
Create migration supabase/migrations/20260616000010b_vendor_welcome_template.sql:
INSERT INTO email_templates (key, subject, body) VALUES ('"'"'vendor_welcome'"'"', '"'"'Welcome to the POURnogravy Vendor Network'"'"', '"'"'<p>Hey {{contact_name}},</p><p>You have been added as a fulfillment partner for POURnogravy. We will be in touch with orders as they come in.</p><p>Do not do anything until you hear from us. We will send you print files and order details via email.</p><p>— Kristin @ Aethyx (on behalf of Adam @ POURnogravy)</p>'"'"') ON CONFLICT (key) DO UPDATE SET body=EXCLUDED.body, subject=EXCLUDED.subject;

2. UPDATE DOCS:
Read docs/PROJECT_STATUS.md and docs/HANDOFF.md in full.
Update PROJECT_STATUS.md:
- Mark test order emails as DONE (2026-06-16, TEST banners confirmed)
- Mark hero carousel desktop fix as DONE (commit 607c0d6)
- Add session entry: "2026-06-16 — Parallel 7-agent build: ~30 features in flight"
- Add all features from this session to the backlog with status "in-progress"
- In Opie tasks: add BLOCKING callout at top: "⛔ BLOCKING: Resend domain verification — until pournogravy.com is verified in Resend, order confirmation emails will not send."
- Update fulfillment status: "Fulfillment provider decided: local printer. Settings table wired. Vendor UI added 2026-06-16."
- Mark "Order Samples" as still PENDING-OPIE
Update docs/HANDOFF.md:
- Add new edge functions: abandoned-cart-reminder, refund-order, archive-orders, blast-email, add-fulfillment-vendor
- Add new tables: order_archive, fulfillment_vendors, abandoned cart last_updated_at column
- Add new migrations: 20260616000001 through 20260616000010b
' > /tmp/pg-agent-g.log 2>&1 &
PID_G=$!
echo "✓ Agent G started (PID $PID_G) — Fulfillment + Docs Update"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🍺 All 7 agents running. Monitor logs:"
echo ""
echo "  tail -f /tmp/pg-agent-a.log   # Dashboard UI"
echo "  tail -f /tmp/pg-agent-b.log   # Cart + Emails"
echo "  tail -f /tmp/pg-agent-c.log   # Orders + Data"
echo "  tail -f /tmp/pg-agent-d.log   # Inbox Rebuild"
echo "  tail -f /tmp/pg-agent-e.log   # Product Admin"
echo "  tail -f /tmp/pg-agent-f.log   # Blog+Reviews+Shipping"
echo "  tail -f /tmp/pg-agent-g.log   # Fulfillment+Docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

wait $PID_A $PID_B $PID_C $PID_D $PID_E $PID_F $PID_G

echo ""
echo "✅ All 7 agents finished."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  POST-RUN CHECKLIST (do in order):"
echo ""
echo "1. npm run build    ← catch TypeScript errors before anything else"
echo ""
echo "2. Apply Supabase migrations:"
echo "   supabase db push"
echo "   (or paste each .sql file into Supabase Dashboard → SQL Editor)"
echo ""
echo "3. Deploy new edge functions:"
echo "   supabase functions deploy abandoned-cart-reminder"
echo "   supabase functions deploy refund-order"
echo "   supabase functions deploy archive-orders"
echo "   supabase functions deploy blast-email"
echo "   supabase functions deploy add-fulfillment-vendor"
echo ""
echo "4. Set up pg_cron jobs in Supabase Dashboard → Database → Cron Jobs:"
echo "   - abandoned-cart-reminder: 0 * * * * (hourly)"
echo "   - archive-orders: 0 0 * * 0 (Sunday midnight)"
echo ""
echo "5. git add -A && git commit -m 'feat: 7-agent parallel build — 30 features' && git push"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
