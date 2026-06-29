import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Circle,
  Wrench,
  Star,
  Clock,
  Calendar,
  TrendingUp,
  CheckCheck,
  Package,
  Mail,
  Info,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Data — session log
// ---------------------------------------------------------------------------
const SESSION_LOG = [
  {
    date: "June 24, 2026",
    tag: "TODAY",
    tagColor: "bg-green-500/20 text-green-300",
    summary: "Wave 3 content + admin polish sprint. Content editor save feedback (Sonner toasts). Add Superpower button. Add Section dialog (Text/Rich Text/Q&A). Dynamic items have delete buttons; structural sections protected. Shop tab in content editor: drag-to-reorder product thumbnails with save order. Admin Reviews page overhauled: filter tabs (All/Pending/Published/Verified), Publish/Unpublish toggles, status badges, expandable body, verified purchase badge. Backfilled OG metadata on all 26 products (og_title, og_description, og_image). Wave 2 verified-purchase reviews system previously shipped.",
    completed: [
      "Content editor: Sonner toast on save success and on error",
      "Content editor: + Add Superpower button (home > superpowers section)",
      "Content editor: + Add Section dialog (Text Block / Rich Text / Q&A Pair)",
      "Content editor: trash icon on dynamic items; structural items protected",
      "Content editor: Shop tab — product thumbnail drag-to-reorder with save",
      "Content editor: Shop tab — click product → confirm → navigate to product edit",
      "Admin Reviews: filter tabs All / Pending / Published / Verified Only",
      "Admin Reviews: Publish / Unpublish toggle buttons (was Approve-only)",
      "Admin Reviews: Live / Hidden status badges, verified purchase badge",
      "Admin Reviews: expandable body text (100 char truncation with expand)",
      "Admin Reviews: empty state message when no reviews exist",
      "DB: backfilled og_title on 26 products",
      "DB: backfilled og_description on 26 products (left 160 chars)",
      "DB: backfilled og_image on 24 products (from image_url)",
    ],
    next: "Place live test order to verify full fulfillment email flow end-to-end; CF email routing rule",
  },
  {
    date: "June 15, 2026",
    tag: "SHIPPING PIPELINE",
    tagColor: "bg-green-500/20 text-green-300",
    summary: "Shipping pipeline complete. Printer invoice now includes shipping pass-through. One-click Mark as Shipped in Orders admin. Bug fixes: easter egg column, loyalty threshold, PrintFiles slugs, double points toggle.",
    completed: [
      "stripe-webhook captures shipping_cents from Stripe session",
      "Printer invoice: print cost + shipping as separate lines with TOTAL TO INVOICE US",
      "Loyalty points awarded on subtotal only (excludes shipping)",
      "New resend-printer-notification edge function (admin-callable)",
      "Orders admin: clean shipping address, Mark as Shipped button, Resend Printer Email",
      "InvoiceTracker: 9-column CSV with shipping pass-through",
      "Bug fix: easter egg column value→text",
      "Bug fix: useLoyalty reads threshold from loyalty_rules",
      "Bug fix: PrintFiles lists from Storage directly",
      "Bug fix: Double Points toggle writes directly to DB",
      "Uploaded logo_back_white.png + logo_back_black.png to print-files bucket",
    ],
    next: "Place test order to verify full fulfillment email flow; CF email routing rule (manual)",
  },
  {
    date: "June 15, 2026",
    tag: "FEATURES",
    tagColor: "bg-purple-500/20 text-purple-300",
    summary: "Pour Points rules live on loyalty_rules table. Admin toggle for Double Points — Activate Now button writes directly to DB. useLoyalty hook reads threshold from DB. Back logo PNGs uploaded to Storage.",
    completed: [
      "loyalty_rules table drives redemption threshold",
      "useLoyalty hook reads threshold from DB (no more hardcoded 100)",
      "Account.tsx progress bar uses live threshold value",
      "Double Points Activate Now writes current timestamp directly to DB",
      "logo_back_white.png + logo_back_black.png in print-files bucket",
    ],
    next: "Test loyalty redemption flow end-to-end",
  },
  {
    date: "June 11, 2026",
    tag: "FINANCIAL DASHBOARD",
    tagColor: "bg-[#fde047] text-black",
    summary:
      "Financial dashboard + printer cost tracking + branded emails. Added printer_paid_at column to printer_queue for order-level payment tracking. Updated printer_notification email template with amber cost box showing $12/item × N items total. Rebuilt InvoiceTracker as auto-calculated financial dashboard: Profit Margin section (revenue, printer cost, gross profit, margin %, all-time + this-week), Shipping Collected section, and Printer Bill section (unpaid orders, Mark All Paid batch button, CSV export, collapsible paid history). Branded all 4 customer-facing email templates (order_confirmation, order_shipped, custom_request_reply, printer_notification) with dark theme, POURnogravy logo header, Opie's voice, and footer: 'DRINK MORE. BITCH LESS. TIP BIG. STAY MOIST.' Sent live printer test email to all 4 recipients with TEST banner.",
    completed: [
      "Invoice Tracker financial dashboard (/admin/invoices)",
      "printer_paid_at column + migration",
      "Printer cost auto-calc ($12/item)",
      "Mark All Paid batch button + CSV export",
      "All 4 email templates branded (dark theme, logo, Opie's voice)",
      "Live printer test email sent (order ACEF8BD5)",
    ],
    next: "CF email routing rule (manual — 30 seconds in CF Dashboard); place test order end-to-end",
  },
  {
    date: "June 9, 2026",
    tag: "CF WORKER",
    tagColor: "bg-blue-500/20 text-blue-300",
    summary:
      "Deployed pournogravy-receive-email CF Worker via CF REST API (bypassed broken wrangler auth — used multipart PUT upload with esbuild-bundled ESM). Set both Worker secrets (RECEIVE_EMAIL_SECRET, SUPABASE_URL). Completed print file uploads: 74/74 PNGs in Supabase Storage print-files bucket (37 black + 37 white). Cleaned up temp anon upload policies, deleted 18 duplicate black/black/ files, deleted test file.",
    completed: [
      "CF Worker pournogravy-receive-email deployed via REST API",
      "74/74 print PNGs confirmed in Supabase Storage",
      "Worker secrets set (RECEIVE_EMAIL_SECRET, SUPABASE_URL)",
      "Temp anon policies dropped",
      "Duplicate files cleaned",
    ],
    next: "CF Dashboard → Email → Email Routing → update opie@pournogravy.com rule → pournogravy-receive-email (manual)",
  },
  {
    date: "June 8–9, 2026",
    tag: "EMAIL SYSTEM",
    tagColor: "bg-purple-500/20 text-purple-300",
    summary:
      "Built full Email Templates admin page (/admin/email-templates) — 600+ lines, rich contenteditable editor with Visual/HTML/Preview/Plain Text tabs, formatting toolbar, click-to-insert variable chips, live sandboxed iframe preview, test email send. Fixed send-notification param mismatch across 3 files (to/template_key → recipient/templateKey). Built CF Email Worker (cloudflare-workers/receive-email/) with postal-mime parser + HMAC auth. Redeployed receive-email Supabase edge fn with verify_jwt: false. Set RECEIVE_EMAIL_SECRET in Supabase.",
    completed: [
      "Email Templates admin page (/admin/email-templates)",
      "send-notification param fix (3 files)",
      "CF Email Worker source built",
      "receive-email edge fn redeployed (verify_jwt: false)",
      "RECEIVE_EMAIL_SECRET set in Supabase",
    ],
    next: "Deploy CF Worker, set Email Routing rule",
  },
  {
    date: "June 8, 2026",
    tag: "FULFILLMENT WIRED",
    tagColor: "bg-green-500/20 text-green-400",
    summary:
      "Rotated and set all Supabase edge function secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SIGNING_SECRET fixed doubled whsec_ prefix, RESEND_API_KEY, FULFILLMENT_SECRET). Resend domain confirmed verified (DKIM+SPF). Updated stripe-webhook with slug-based print file URLs per order item. Added CC copy of printer notification to kmitch2087@gmail.com. Lovable disconnected — Claude (Cowork) is now exclusive builder.",
    completed: [
      "All Stripe/Resend/Fulfillment secrets set and verified",
      "stripe-webhook: design_links URLs per order item",
      "Printer notification CC to Kristin",
      "Lovable disconnected — Claude is exclusive builder",
    ],
    next: "Place test order; CF Email Worker deploy",
  },
  {
    date: "May 22–27, 2026",
    tag: "CMS + AUTH FIX",
    tagColor: "bg-blue-500/20 text-blue-300",
    summary:
      "Wired all 5 public pages (Index, About, Shop, Contact, FAQ) to site_content DB table via SiteContentContext. ~60 rows seeded. New /admin/content tab for live copy editing. Auth fix: loadedProfileIdRef prevents spurious spinner when Supabase fires SIGNED_IN on token auto-refresh. Migration sync: Docker Desktop + supabase db pull + migration repair — all remote schema drift captured.",
    completed: [
      "CMS: all 5 public pages use getValue() with static fallbacks",
      "~60 site_content rows seeded",
      "/admin/content editor tab (Home/Shop/About/Contact/FAQ)",
      "Auth fix: loadedProfileIdRef (no more mid-session spinner)",
      "Migration history fully synced via supabase migration repair",
    ],
    next: "Fulfillment partner; Resend domain verify",
  },
  {
    date: "May 15, 2026",
    tag: "AUDIT + POLISH",
    tagColor: "bg-orange-500/20 text-orange-300",
    summary:
      "Homepage marquee upgraded to CSS keyframe (40s, pause-on-hover, prefers-reduced-motion). Hero navbar clearance fixed for mobile. WishlistContext lifted to shared provider (eliminated N auth subscriptions — was one per ProductCard). Contact form wired to Supabase (was cosmetic-only). CustomGarmentRequestModal dead import fixed (all custom garment submissions were silently failing). Privacy Policy + Terms of Service pages added. 11 additional UX/a11y/perf bug fixes.",
    completed: [
      "Marquee: CSS keyframe, pause-on-hover, reduced-motion",
      "WishlistContext: single shared instance (not per-card)",
      "Contact form: wired to Supabase custom_requests",
      "CustomGarmentRequestModal: dead import fixed",
      "/privacy and /terms pages added",
      "11 UX/a11y fixes (touch targets, aria-pressed, null guards, etc.)",
    ],
    next: "Fulfillment partner; CF Email Worker",
  },
  {
    date: "May 14, 2026",
    tag: "PHASE 3",
    tagColor: "bg-purple-500/20 text-purple-300",
    summary:
      "Major feature sprint: Shop search (URL-synced ?q=) + sort. Wishlist system (auth=DB, guest=localStorage) with heart toggle + /wishlist page + Navbar badge. Pour Points loyalty — tables, SECURITY DEFINER fn, redeem-points edge fn, Account page rewrite, CheckoutReturn banner. Admin panels: Loyalty, Customer Lookup, Email Subscribers, Discount Codes. Star ratings via shared React Query cache. Cart merge on login. Homepage email capture to email_subscribers. JSON-LD structured data.",
    completed: [
      "Shop search + sort",
      "Wishlist system (full stack)",
      "Pour Points loyalty system (full stack)",
      "Admin: Loyalty, Customer Lookup, Subscribers, Discount Codes",
      "Star ratings (shared React Query cache)",
      "Cart merge on login + cross-device sync",
      "Homepage email capture → email_subscribers",
      "Organization + Product JSON-LD",
    ],
    next: "Run migrations, push to GitHub, wire fulfillment partner",
  },
  {
    date: "May 9, 2026",
    tag: "HYGIENE + POLISH",
    tagColor: "bg-orange-500/20 text-orange-300",
    summary:
      "Auth spinner root-caused to Apollo extension blocking Supabase REST calls. Confirmed via incognito (extensions disabled → instant login). Bumped fetchProfile timeout to 12s as defence. All merch drop / fulfillment feature files committed and pushed.",
    completed: [
      "Traced fetchProfile timeout to Apollo extension (not DB, not RLS)",
      "Confirmed incognito login works instantly — DB query is 1.42ms",
      "Committed merch drop calendar, fulfillment routing, printer spec + all related files",
      "Pushed 12s timeout bump to master",
    ],
    next: "Apollo whitelist fix, Stripe/Resend secrets QA, fulfillment partner decision",
  },
  {
    date: "May 6, 2026",
    tag: "FEATURE DROP",
    tagColor: "bg-purple-500/20 text-purple-300",
    summary:
      "Full Merch Drop Calendar system shipped. New admin tab at /admin/merch-drops with month-grid, click-to-view popups, full drop builder, product picker, flyer upload, ad placement toggles, and marketing email builder. process-merch-drops edge function auto-publishes drops on schedule.",
    completed: [
      "Merch Drop Calendar + Builder admin page (/admin/merch-drops)",
      "Site ad components: DropAnnouncementBar, DropHeroBanner, DropShopBanner",
      "process-merch-drops edge function (cron-ready)",
      "Fulfillment routing per-product with printer spec fields in Settings",
      "SPA routing fix: 404.html strategy, _redirects removed permanently",
      "Auth INITIAL_SESSION race condition eliminated (bcb371f)",
    ],
    next: "Push commits, deploy migration, wire cron schedule",
  },
  {
    date: "May 5, 2026",
    tag: "ADMIN TOOLS",
    tagColor: "bg-blue-500/20 text-blue-300",
    summary:
      "User Manual, HelpPanel, ContactKristinModal, admin-contact edge function. Opie can now message Kristin directly from the dashboard. Project Status page added with Notify Opie button.",
    completed: [
      "Hero mobile fix (object-contain)",
      "User Manual at /admin/manual",
      "HelpPanel (? button in header)",
      "ContactKristinModal — Opie messages Kristin directly from admin",
      "admin-contact edge function",
      "Project Status admin tab + notify-project-status edge function",
    ],
    next: "Push changes, verify mobile hero on live site",
  },
  {
    date: "May 4, 2026",
    tag: "PAYMENTS LIVE",
    tagColor: "bg-green-500/20 text-green-400",
    summary:
      "Real payment processing live on pournogravy.com. Stripe embedded Payment Element stays on site. All 24 products seeded into DB. All edge functions deployed. payment_intent.succeeded webhook configured.",
    completed: [
      "Stripe embedded Payment Element live (no redirect)",
      "All edge functions deployed via Supabase CLI",
      "24 products seeded into Supabase",
      "Live Stripe publishable key in .env.production",
      "All secrets set in Supabase (Stripe + Resend)",
    ],
    next: "Verify DB order flips to paid, confirm Resend emails, fulfillment partner",
  },
  {
    date: "April 29, 2026",
    tag: "AUDIT + FIX",
    tagColor: "bg-orange-500/20 text-orange-300",
    summary:
      "Black screen bug fixed (missing .env.production). Auth race condition patched. Admin REVOKE bug fixed. Full code audit with dead code documented. 3-day developer curriculum created.",
    completed: [
      "Black screen fixed (committed .env.production)",
      "Auth race condition fixed",
      "GRANT EXECUTE on is_admin() applied",
      "Full code audit + docs suite created",
      "3-day developer curriculum (~/Desktop/PG_Dev_Curriculum/)",
    ],
    next: "Stripe secrets, Resend key, seed tables, Storage bucket",
  },
  {
    date: "April 28, 2026",
    tag: "LAUNCH",
    tagColor: "bg-yellow-400/20 text-yellow-400",
    summary:
      "Initial setup. CF Pages connected to GitHub. pournogravy.com live.",
    completed: [
      "CF Pages → GitHub pipeline connected (pournogravydev project)",
      "pournogravy.com domain + SSL active",
      "Full documentation suite created",
    ],
    next: "Fix CF build command, start Stripe wiring",
  },
];


// ---------------------------------------------------------------------------
// Data — progress areas with features
// ---------------------------------------------------------------------------
interface Feature {
  name: string;
  description: string;
  url?: string;
}
interface Area {
  label: string;
  value: number;
  color: string;
  missing: string | null;
  features: Feature[];
}

const AREAS: Area[] = [
  {
    label: "Infrastructure & Deployment",
    value: 100,
    color: "bg-[#fde047]",
    missing: null,
    features: [
      { name: "GitHub CI/CD", description: "Auto-deploys on push to master; live in ~2 min", url: "https://github.com/kmitch2087-dot/pournogravy" },
      { name: "Cloudflare Pages", description: "Global CDN hosting — pournogravydev project, zero-downtime rollbacks" },
      { name: "pournogravy.com domain + SSL", description: "Cloudflare DNS, HTTPS active, www redirect" },
      { name: "SPA routing (404.html)", description: "CF Pages serves 404.html for unmatched paths; React Router handles routing client-side preserving the URL" },
      { name: ".env.production committed", description: "Vite bakes Supabase URL + anon key into CF Pages build at compile time — no runtime env needed" },
      { name: "Cloudflare Email Worker", description: "pournogravy-receive-email deployed; routes inbound email to receive-email Supabase edge fn" },
      { name: "_headers — no HTML caching", description: "Cache-Control: no-cache on HTML files so deploys take effect immediately" },
    ],
  },
  {
    label: "Database & Edge Functions",
    value: 99,
    color: "bg-[#fde047]",
    missing: "Live test order — confirms stripe-webhook → DB writes → printer + customer emails all chain correctly end-to-end",
    features: [
      { name: "25+ Supabase tables with RLS", description: "products, orders, order_items, cart_items, custom_requests, profiles, wishlists, loyalty_accounts, loyalty_transactions, email_subscribers, analytics_events, site_content, blog_posts, merch_drops, printer_queue, inbox_messages, discount_codes, product_reviews, email_templates, settings, fulfillment_vendors, monthly_snapshots, expenses, order_archive, client_edit_requests" },
      { name: "create-checkout", description: "Creates Stripe PaymentIntent; validates prices server-side against DB; applies discounts; calculates shipping; sets variant-rich description + metadata for Stripe analytics" },
      { name: "stripe-webhook", description: "Handles payment_intent.succeeded — marks order paid, queues printer_queue row, sends customer + printer emails, awards Pour Points, auto-matches back logo by garment color" },
      { name: "send-notification", description: "Resend email dispatch with {{variable}} template substitution; logs to notifications table; admin or service-role auth" },
      { name: "verify-email", description: "Public — syntax validation, disposable domain blocklist, MX lookup via Cloudflare DNS" },
      { name: "validate-discount", description: "Server-side promo code validation against cart total, expiry, and use count" },
      { name: "receive-email", description: "Handles inbound email from CF Email Worker; stores in inbox_messages; alerts admin via Resend" },
      { name: "submit-tracking", description: "Printer-facing HMAC-verified magic link endpoint; saves tracking number to order, triggers shipped email to customer" },
      { name: "resend-printer-notification", description: "Admin-callable; regenerates HMAC magic link and resends printer fulfillment email for any order", url: "/admin/orders" },
      { name: "abandoned-cart-reminder", description: "Cron-triggered — finds carts idle >2h with an email, sends reminder via send-notification" },
      { name: "refund-order", description: "Admin-callable — issues Stripe refund, updates order status to refunded, sends customer email" },
      { name: "archive-orders", description: "Moves fulfilled orders older than threshold to order_archive table" },
      { name: "blast-email", description: "Admin-callable — sends bulk email to all email_subscribers via send-notification loop" },
      { name: "sync-stripe-fees", description: "Daily cron (02:00 UTC) — syncs Stripe processing fees into the expenses table" },
      { name: "close-month", description: "Monthly cron (00:05 on 1st) — auto-locks books into monthly_snapshots" },
      { name: "generate-report", description: "HTTP-callable — returns CSV or HTML for 5 report types: P&L, order summary, expense detail, sales by product, Stripe fee summary" },
      { name: "add-fulfillment-vendor", description: "Inserts to fulfillment_vendors, sends vendor_welcome email via send-notification" },
      { name: "SECURITY DEFINER functions", description: "is_admin(), increment_loyalty_points(), increment_discount_use() — run with elevated privileges to safely cross RLS boundaries" },
    ],
  },
  {
    label: "Admin Dashboard",
    value: 98,
    color: "bg-[#fde047]",
    missing: "Dead code removal — src/utils/supabase/ (second Supabase client), src/lib/fulfillment.ts, wrangler.jsonc; none affect functionality but are cleanup items",
    features: [
      { name: "Dashboard", description: "Orders, requests, and stats overview with quick-action buttons", url: "/admin" },
      { name: "Products", description: "Product list with status badges, image thumbnails, and inline edit links", url: "/admin/products" },
      { name: "Product Edit", description: "Full product editor — name, description, price, images (Supabase Storage upload), drag-to-reorder copy sections", url: "/admin/products" },
      { name: "Orders", description: "All orders with status management, clean shipping address, one-click Mark as Shipped, Resend Printer Email button", url: "/admin/orders" },
      { name: "Custom Requests", description: "Garment inquiry queue with Active/Done/Archived tabs, per-row status actions", url: "/admin/requests" },
      { name: "Reviews", description: "Approval queue with All/Pending/Published/Verified tabs, publish/unpublish toggle, verified purchase badge, expandable body", url: "/admin/reviews" },
      { name: "Discount Codes", description: "Create, toggle active/inactive, delete promo codes; usage progress bars; status badges (Active / Expired / Exhausted)", url: "/admin/discount-codes" },
      { name: "Pour Points / Loyalty", description: "Member table with point balances, expandable transaction history, manual adjustment tool", url: "/admin/loyalty" },
      { name: "Customer Lookup", description: "Search any customer by email — order history, loyalty balance, wishlist count, stats grid", url: "/admin/customers" },
      { name: "Email Subscribers", description: "Subscriber list, 8-week growth sparkline, CSV export", url: "/admin/subscribers" },
      { name: "Analytics", description: "Page views, add-to-cart + purchase event funnel, top products by views", url: "/admin/analytics" },
      { name: "Inbox", description: "Admin inbox for inbound emails routed via CF Email Worker", url: "/admin/inbox" },
      { name: "Email Templates", description: "Rich editor with Visual/HTML/Preview/Plain Text tabs, formatting toolbar, click-to-insert variable chips, live sandboxed iframe preview, one-click test send", url: "/admin/email-templates" },
      { name: "Blog", description: "Blog post CRUD — create/edit/delete, publish toggle, slug auto-gen, tag management, image URL support", url: "/admin/blog" },
      { name: "Invoice Tracker", description: "Financial dashboard: profit margin, shipping collected, printer bill (unpaid list, Mark All Paid, CSV export, paid history)", url: "/admin/invoices" },
      { name: "Merch Drops", description: "Drop calendar with month-grid, full drop builder, product picker, flyer upload, ad placement toggles, marketing email builder", url: "/admin/merch-drops" },
      { name: "Content Editor", description: "Live CMS editing for all public pages — fields change instantly without a deploy", url: "/admin/content" },
      { name: "Bookkeeping", description: "5 sub-pages: Overview (monthly grid + amendments), Expenses ledger, Products COGS editor, Reports (CSV/PDF), Tax Packet (ZIP export)", url: "/admin/bookkeeping" },
      { name: "Settings", description: "Site config — shipping rates, from email, fulfillment provider, printer email, free shipping threshold", url: "/admin/settings" },
      { name: "Edit Requests", description: "Split-view notes — Opie submits requests on the left, Kristin replies with inline threads on the right", url: "/admin/edit-requests" },
      { name: "User Manual", description: "Full operational guide for Opie — how to manage orders, products, loyalty, email, and blog", url: "/admin/manual" },
    ],
  },
  {
    label: "Public Storefront",
    value: 98,
    color: "bg-[#fde047]",
    missing: "Sitemap.xml auto-generation; per-product SEO descriptions could be more keyword-targeted (og_title/description backfilled but generic)",
    features: [
      { name: "Homepage", description: "Hero carousel, featured products, WHAT THE BAR SAYS reviews, marquee ticker, rotating bartender quotes, email capture", url: "/" },
      { name: "Shop", description: "Full catalog with live URL-synced search (?q=) and sort controls (Featured / Price / A→Z)", url: "/shop" },
      { name: "Product detail pages", description: "Per-product gallery, size/color selector, star ratings, humor-forward Bad Bartender Advice copy, add to cart, wishlist toggle, related products" },
      { name: "Collections", description: "Curated product groupings", url: "/collections" },
      { name: "About", description: "Brand story and mission", url: "/about" },
      { name: "Contact form", description: "Wired to Supabase custom_requests table; submissions appear in admin Custom Requests panel", url: "/contact" },
      { name: "FAQ", description: "CMS-editable Q&A pairs, editable from admin Content editor", url: "/faq" },
      { name: "Blog", description: "Public post listing page", url: "/blog" },
      { name: "Blog posts", description: "Individual post pages at /blog/:slug — managed from admin dashboard" },
      { name: "Account page", description: "Order history, Pour Points balance + progress bar, transaction history, wishlist count", url: "/account" },
      { name: "Wishlist", description: "Heart toggle on every product card; localStorage for guests, DB for auth users; dedicated wishlist page", url: "/wishlist" },
      { name: "Privacy Policy", description: "Brand-voice privacy policy; CMS-editable title, body, and last updated date", url: "/privacy" },
      { name: "Terms of Service", description: "Plain-language ToS; CMS-editable; covers shipping, returns, IP", url: "/terms" },
      { name: "Proposal / Wholesale pitch", description: "Founding Client Offer and partnership pitch page", url: "/proposal" },
      { name: "Printer tracking form", description: "HMAC-verified page for printer to submit tracking numbers without an account" },
      { name: "SEO — JSON-LD structured data", description: "Product schema on every product page + Organization schema on homepage — eligible for Google Shopping rich results" },
      { name: "WebP images", description: "All product + UI images converted to WebP — 61MB → 7.3MB (88% reduction); PNG fallback via onError" },
    ],
  },
  {
    label: "Payments & Checkout",
    value: 100,
    color: "bg-green-400",
    missing: null,
    features: [
      { name: "Stripe embedded Payment Element", description: "Stays on-site — no redirect to Stripe-hosted page; custom branded checkout form", url: "/checkout" },
      { name: "Server-side price validation", description: "create-checkout validates all prices against DB — client can never manipulate price" },
      { name: "Discount code validation", description: "Server-side — checks expiry, use count, minimum order; applied before PaymentIntent creation", url: "/checkout" },
      { name: "Shipping calculation", description: "Standard/express rates from settings; free shipping threshold; per-product shipping override (e.g. test order at $0.01)" },
      { name: "Cart — guest + auth", description: "Guest cart persists via localStorage; merges with DB cart on login; cross-device sync for auth users" },
      { name: "Stripe PaymentIntent metadata", description: "description field shows 'F Off Karen — Black / L × 2' in Stripe dashboard; metadata.items has full JSON per item for analytics" },
      { name: "CheckoutReturn", description: "Post-payment confirmation screen — clears cart, shows order number, displays Pour Points earned", url: "/checkout/return" },
      { name: "Refund system", description: "Admin-callable refund-order edge function — issues Stripe refund, updates order status, sends customer email" },
    ],
  },
  {
    label: "Fulfillment Pipeline",
    value: 90,
    color: "bg-yellow-400",
    missing: "Live test order (biggest gap — pipeline is built but not verified end-to-end) + CF email routing rule (30-second manual step in CF Dashboard: pournogravy.com → Email → Routing Rules → opie@pournogravy.com → pournogravy-receive-email)",
    features: [
      { name: "Printer email on payment", description: "stripe-webhook sends printer_notification email with order items, shipping address, design links, cost box, CSV attachment, and HMAC tracking magic link" },
      { name: "Auto-matched back logo", description: "Garment color auto-selects ink: dark shirts (black/navy/charcoal) → white ink logo; light shirts → black ink logo. Logo PNGs live in Supabase Storage print-files/back/" },
      { name: "Design file links", description: "Printer email includes direct Supabase Storage URLs for front black ink, front white ink, and back logo per item" },
      { name: "HMAC tracking magic link", description: "Printer gets a signed one-time URL to submit tracking number without needing an account" },
      { name: "submit-tracking edge function", description: "Validates HMAC token, saves tracking number to order, triggers shipped email to customer" },
      { name: "Customer shipped email", description: "Branded email to customer when order is marked shipped — includes clickable tracking URL" },
      { name: "Mark as Shipped", description: "One-click action in Orders admin sends shipped email and updates order status", url: "/admin/orders" },
      { name: "Resend Printer Notification", description: "Admin button in Orders — regenerates HMAC magic link and resends printer email for any order", url: "/admin/orders" },
      { name: "Invoice Tracker", description: "Tracks printer bill per order ($12/item default), shipping pass-through, Mark All Paid batch action, CSV export", url: "/admin/invoices" },
      { name: "printer_queue table", description: "Every paid order gets a queued row in printer_queue with payload (items + shipping + total)" },
      { name: "Fulfillment Partners panel", description: "Vendor directory — add/manage printers, set active vendor, full intake form (services, turnaround, min qty, file formats)", url: "/admin/settings" },
      { name: "74 print-ready PNGs", description: "37 black ink + 37 white ink — all 24 products, stored in Supabase Storage print-files/black/ and /white/" },
    ],
  },
  {
    label: "Email & Notifications",
    value: 98,
    color: "bg-blue-400",
    missing: "CF email routing rule — 30 seconds in CF Dashboard: pournogravy.com → Email → Routing Rules → edit opie@pournogravy.com rule → change destination to pournogravy-receive-email worker",
    features: [
      { name: "Order confirmation", description: "Branded dark theme email — POURnogravy logo, Opie's bartender voice, order items + totals, mock product image, branded footer", url: "/admin/email-templates" },
      { name: "Order shipped", description: "Customer notification when order is marked shipped — includes clickable tracking URL" },
      { name: "Printer notification", description: "Design file links, cost breakdown box ($12/item × N), shipping pass-through, CSV attachment, HMAC magic link for tracking submission" },
      { name: "Custom request reply", description: "Admin reply to garment inquiry submissions; wired to Edit Requests threaded note system" },
      { name: "Abandoned cart reminder", description: "Cron-triggered — fires 2h after cart was last updated if customer provided email but didn't checkout" },
      { name: "Blast email", description: "Admin sends bulk promotional email to all email_subscribers via send-notification loop" },
      { name: "Email Templates admin", description: "Rich editor for all templates — Visual/HTML/Preview/Plain Text tabs, formatting toolbar, variable chips, live preview, one-click test send", url: "/admin/email-templates" },
      { name: "Resend domain verified", description: "pournogravy.com — DKIM + SPF active; opie@pournogravy.com is a verified sender" },
      { name: "Inbound email — CF Worker", description: "pournogravy-receive-email CF Worker deployed; parses inbound email via postal-mime, posts to receive-email edge fn, stores in inbox_messages, alerts admin" },
      { name: "Admin Inbox", description: "All inbound emails visible in the admin dashboard inbox", url: "/admin/inbox" },
      { name: "notifications table", description: "Every email send is logged with status (pending / sent / failed / queued_no_sender) for audit trail and replay" },
    ],
  },
  {
    label: "Content Management (CMS)",
    value: 95,
    color: "bg-purple-400",
    missing: "Section drag-to-reorder for all CMS pages (currently only Shop tab has it); sitemap.xml auto-generation",
    features: [
      { name: "Homepage CMS", description: "Hero headline, CTA text, rotating bartender quotes, marquee ticker items, superpowers list — all live-editable", url: "/admin/content" },
      { name: "Shop page CMS", description: "Section heading, subtitle, empty state text; product thumbnail drag-to-reorder", url: "/admin/content" },
      { name: "About page CMS", description: "Content blocks, section headings, brand copy", url: "/admin/content" },
      { name: "Contact page CMS", description: "Page heading and copy", url: "/admin/content" },
      { name: "FAQ CMS", description: "Q&A pairs — add, edit, delete, reorder; section heading", url: "/admin/content" },
      { name: "Terms of Service CMS", description: "Title, rich HTML body, last updated date — fully editable without a deploy", url: "/terms" },
      { name: "Privacy Policy CMS", description: "Title, rich HTML body, last updated date — fully editable without a deploy", url: "/privacy" },
      { name: "SiteEditor floating panel", description: "Edit Page button appears on every CMS page for admins; slides in a field editor panel with instant save" },
      { name: "RichTextInput editor", description: "Formatting toolbar for html-type fields — bold, italic, headings, lists, links" },
      { name: "getValue() fallback pattern", description: "Every CMS field has a hardcoded fallback — pages render correctly even with an empty DB" },
      { name: "OG metadata on all products", description: "og_title, og_description, og_image backfilled on all 26 products for social sharing previews" },
      { name: "Product copy editor", description: "Per-product: description, long description, humor/zinger, bad bartender advice — drag-to-reorder sections in admin", url: "/admin/products" },
      { name: "Blog CMS", description: "Create, edit, publish, and delete blog posts; slug auto-generation; tag management", url: "/admin/blog" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Data — backlog
// ---------------------------------------------------------------------------
const BACKLOG = {
  critical: [
    { text: "CF Email Routing rule — CF Dashboard → pournogravy.com → Email → Routing Rules → set opie@pournogravy.com → pournogravy-receive-email worker" },
    { text: "Place live test order to verify full fulfillment email flow end-to-end" },
    { text: "Opie: update product costs in Admin → Bookkeeping → Products (before July 1st month close)" },
    { text: "Verify opie@pournogravy.com as Resend sender (DKIM/SPF done — confirm send works)" },
  ],
  hygiene: [
    { text: "Delete src/utils/supabase/ — dead second Supabase client, never used" },
    { text: "Delete src/lib/fulfillment.ts — dead code, misleadingly named" },
    { text: "Delete wrangler.jsonc — duplicate of wrangler.toml" },
    { text: "Delete deprecated main branch from GitHub" },
    { text: "Delete 4 duplicate Lovable repos from GitHub (hash-suffixed repos)" },
    { text: "npm audit fix — 19 vulnerabilities (none critical)" },
    { text: "Marquee dedup audit — confirm TICKER_ITEMS renders without double-items at seam" },
  ],
  phase3: [
    { text: "Email marketing integration (Klaviyo or Mailchimp for captured email_subscribers)" },
    { text: "International shipping config" },
    { text: "Wholesale portal (foundation exists at /proposal)" },
    { text: "Analytics — Cloudflare Web Analytics or Plausible" },
    { text: "Printify/Printful API integration (optional — local printer model is fully operational)" },
    { text: "Meta title / description improvements per-product (SEO)" },
    { text: "\"I Know the Owner\" discount flow — tabled per client request" },
  ],
};

const KNOWN_ISSUES = [
  { severity: "high",   item: "Live test order not placed", fix: "Place a real order to confirm confirmation + printer emails land correctly" },
  { severity: "medium", item: "CF Email Routing rule not set", fix: "CF Dashboard → pournogravy.com → Email → Routing Rules → set opie@pournogravy.com → pournogravy-receive-email worker (30 seconds)" },
  { severity: "medium", item: "src/utils/supabase/ dead code", fix: "Delete folder" },
  { severity: "medium", item: "src/lib/fulfillment.ts dead code", fix: "Delete file" },
  { severity: "low",    item: "wrangler.jsonc duplicate", fix: "Delete file" },
  { severity: "low",    item: "19 npm vulnerabilities", fix: "npm audit fix" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const severityBadge = (s: string) => {
  if (s === "critical") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">CRITICAL</Badge>;
  if (s === "high")     return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">HIGH</Badge>;
  if (s === "medium")   return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">MEDIUM</Badge>;
  return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[10px]">LOW</Badge>;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className={`border ${accent ? "border-[#fde047]/40 bg-[#fde047]/5" : "border-border bg-card"}`}>
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`mt-0.5 p-2 rounded-md ${accent ? "bg-[#fde047]/15" : "bg-muted/50"}`}>
            <Icon className={`h-4 w-4 ${accent ? "text-[#fde047]" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${accent ? "text-[#fde047]" : "text-foreground"}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PhaseTracker() {
  const phases = [
    { label: "Discovery", done: true },
    { label: "Design", done: true },
    { label: "Development", done: true },
    { label: "DevOps", done: true },
    { label: "QA", done: true },
    { label: "Launch", done: false, active: true },
  ];
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Build Phase</p>
        <div className="flex items-center flex-wrap gap-1">
          {phases.map((phase, i) => (
            <div key={phase.label} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors
                ${phase.done
                  ? "bg-[#fde047]/10 text-[#fde047]"
                  : phase.active
                  ? "bg-green-400/10 text-green-400 ring-1 ring-green-400/30"
                  : "bg-muted/30 text-muted-foreground"}`}
              >
                {phase.done
                  ? <CheckCircle className="h-3 w-3" />
                  : phase.active
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Circle className="h-3 w-3" />}
                {phase.label}
              </div>
              {i < phases.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClickableProgressBar({ area, selected, onClick }: { area: Area; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left space-y-1 group cursor-pointer"
    >
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className={`flex items-center gap-1.5 transition-colors ${selected ? "text-[#fde047]" : "group-hover:text-foreground"}`}>
          {selected ? <ChevronUp className="h-3 w-3 shrink-0" /> : <Info className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />}
          {area.label}
        </span>
        <span className="font-medium text-foreground">{area.value}%</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${area.color}`}
          initial={{ width: 0 }}
          animate={{ width: `${area.value}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </button>
  );
}

function SessionLogEntry({ entry, index }: { entry: typeof SESSION_LOG[0]; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="relative pl-6 mb-3"
    >
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
      <div className={`absolute left-[-3px] top-3 h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-[#fde047]" : "bg-border"}`} />
      <div className="border border-border bg-card rounded-sm overflow-hidden">
        <button
          className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-muted/20 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-sm font-semibold">{entry.date}</span>
            <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded ${entry.tagColor}`}>
              {entry.tag}
            </span>
          </div>
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-border/50 space-y-3">
                <p className="text-sm text-muted-foreground pt-3">{entry.summary}</p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5">Shipped</p>
                  <ul className="space-y-1">
                    {entry.completed.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-[#fde047] shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
                  <span className="font-semibold text-foreground shrink-0">Next up:</span>
                  <span>{entry.next}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


function BacklogSection({ title, items, color }: { title: string; items: { text: string }[]; color: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-2">
      <button
        className="flex items-center gap-2 text-sm font-semibold w-full text-left hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
        {title}
        <span className="text-xs text-muted-foreground font-normal ml-1">({items.length})</span>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="space-y-1.5 pl-4">
              {items.map((item) => (
                <li key={item.text} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Circle className="h-3 w-3 shrink-0 mt-1 text-muted-foreground/30" />
                  {item.text}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fulfillment Research
// ---------------------------------------------------------------------------
const FulfillmentResearch = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-base font-semibold">Print-on-Demand Cost Comparison</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Bella+Canvas 3001 · one front print · U.S. customer · May 2026</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href="/docs/POD_research_report.pdf" target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4 mr-2" />Download PDF
        </a>
      </Button>
    </div>
    <div className="rounded-sm border border-[#fde047]/30 bg-[#fde047]/5 p-4 space-y-1">
      <p className="text-xs font-bold tracking-widest uppercase text-[#fde047]">Recommended Stack</p>
      <p className="text-sm"><strong>Primary:</strong> Printify &nbsp;·&nbsp; <strong>Premium:</strong> Printful &nbsp;·&nbsp; <strong>U.S. volume:</strong> CustomCat Pro</p>
      <p className="text-xs text-muted-foreground pt-1">Start with Printify for margin testing. Order samples from all three before committing. Reserve Printful for SKUs where brand quality matters more than cost.</p>
    </div>
    <Card className="border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm">Cost Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2.5">Rank</th><th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Product</th><th className="px-4 py-2.5">Shipping</th>
                {/* Base cost per unit: $27.99 (updated 2026-06-16) */}
                <th className="px-4 py-2.5 font-bold text-foreground">Total</th><th className="px-4 py-2.5">Margin @$27.99</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { rank: 1, name: "Printify", product: "~$8.32", ship: "$4.75", total: "~$13.15", margin: "~53%", tag: "PRIMARY" },
                { rank: 2, name: "Gooten", product: "~$8.65", ship: "~$4.95", total: "~$13.60", margin: "~51%", tag: null },
                { rank: 3, name: "Gelato (Gelato+)", product: "$8.55", ship: "~$4.99", total: "~$13.54", margin: "~52%", tag: null },
                { rank: 4, name: "CustomCat Pro", product: "$8.67", ship: "~$4.99", total: "~$13.66", margin: "~51%", tag: "U.S. MARGIN" },
                { rank: 5, name: "Printful", product: "$11.69", ship: "~$4.75", total: "~$16.44", margin: "~41%", tag: "PREMIUM" },
              ].map((r) => (
                <tr key={r.rank} className={r.tag === "PRIMARY" ? "bg-[#fde047]/5" : ""}>
                  <td className="px-4 py-3 text-muted-foreground">{r.rank}</td>
                  <td className="px-4 py-3 font-medium">
                    {r.name}
                    {r.tag && <span className="ml-2 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#fde047]/20 text-[#fde047]">{r.tag}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.product}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.ship}</td>
                  <td className="px-4 py-3 font-semibold">{r.total}</td>
                  <td className="px-4 py-3 text-green-400 font-semibold">{r.margin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ---------------------------------------------------------------------------
// Cost Analysis
// ---------------------------------------------------------------------------
const CostAnalysis = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-base font-semibold">Market Rate vs. Actual Investment</h2>
      <p className="text-sm text-muted-foreground mt-0.5">Prepared by Kristin Mitchell — Aethyx · April 29, 2026</p>
    </div>
    <div className="rounded-sm border border-[#fde047]/30 bg-[#fde047]/5 p-4">
      <p className="text-xs font-bold tracking-widest uppercase text-[#fde047] mb-1">Bottom Line</p>
      <p className="text-sm">Freelancer midpoint: <strong>~$68,000</strong> · Agency midpoint: <strong>~$174,000</strong> · Aethyx portfolio rate: <strong>$1,400</strong></p>
      <p className="text-xs text-muted-foreground pt-2">~98% discount vs. freelancer market. ~99% vs. boutique agency. Portfolio-rate engagement to build a real-world case study — mutually beneficial deal.</p>
    </div>
    <Card className="border-border">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Phase</th><th className="px-4 py-3">Freelancer</th><th className="px-4 py-3">Agency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { phase: "1 — Discovery & Strategy", free: "$2,250–6,000", agency: "$6,000–15,000" },
                { phase: "2 — Design", free: "$5,000–13,500", agency: "$13,500–34,000" },
                { phase: "3 — Development", free: "$21,250–55,000", agency: "$55,000–136,000" },
                { phase: "4 — DevOps & Deployment", free: "$2,000–5,750", agency: "$5,750–15,500" },
                { phase: "5 — Debugging & QA", free: "$3,250–9,000", agency: "$9,000–22,500" },
                { phase: "6 — Project Management", free: "$3,250–9,750", agency: "$9,750–26,000" },
              ].map((r) => (
                <tr key={r.phase}>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.phase}</td>
                  <td className="px-4 py-3">{r.free}</td>
                  <td className="px-4 py-3">{r.agency}</td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold">
                <td className="px-4 py-3">TOTAL</td><td className="px-4 py-3">$37,000–99,000</td><td className="px-4 py-3">$99,000–249,000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    <Card className="border-[#fde047]/20 bg-[#fde047]/5">
      <CardContent className="p-4">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border/50">
            <tr><td className="py-2.5 text-muted-foreground">Development fee (portfolio rate)</td><td className="py-2.5 font-medium text-right">$900.00</td></tr>
            <tr><td className="py-2.5 text-muted-foreground">Software & infrastructure costs</td><td className="py-2.5 font-medium text-right">$500.00</td></tr>
            <tr className="font-bold text-[#fde047]"><td className="py-2.5">Aethyx Total</td><td className="py-2.5 text-right">$1,400.00</td></tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  </div>
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function ProjectStatus() {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [changes, setChanges] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  const handleNotify = async () => {
    if (!summary.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("notify-project-status", {
        body: { summary: summary.trim(), changes: changes.trim() },
      });
      if (error) throw error;
      if (data?.rateLimited) {
        setResult({ ok: false, message: data.error });
      } else if (data?.ok) {
        setResult({ ok: true, message: data.dryRun ? "Dry run — RESEND_API_KEY not set." : `Sent to ${data.sentTo ?? "Opie"}.` });
        setSummary(""); setChanges("");
      } else {
        setResult({ ok: false, message: data?.error ?? "Unknown error" });
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSending(false);
    }
  };

  const daysSinceLaunch = Math.floor(
    (new Date().getTime() - new Date("2026-04-28").getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-widest">PROJECT STATUS</h1>
          <p className="text-xs text-muted-foreground mt-1 font-marker tracking-widest uppercase">
            pournogravy.com // back of house
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a href="https://github.com/kmitch2087-dot/pournogravy/blob/master/docs/PROJECT_STATUS.md" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />GitHub
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/docs/POD_research_report.pdf" target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-2" />POD Report
            </a>
          </Button>
          <Button
            size="sm"
            onClick={() => { setResult(null); setNotifyOpen(true); }}
            className="bg-[#fde047] text-black hover:bg-yellow-300 font-semibold"
          >
            <Bell className="h-4 w-4 mr-2" />Notify Opie
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Features Shipped" value="55+" icon={CheckCheck} accent />
        <StatCard label="Completion" value="~92%" sub="Core features done" icon={TrendingUp} />
        <StatCard label="Days Active" value={`${daysSinceLaunch}`} sub="Since April 28, 2026" icon={Calendar} />
        <StatCard label="Sessions" value="17" sub="Across all tools" icon={Clock} />
      </div>

      {/* Phase Tracker */}
      <PhaseTracker />

      {/* Progress Bars */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Progress by Area — click any bar to see features</p>
          {AREAS.map((area) => (
            <ClickableProgressBar
              key={area.label}
              area={area}
              selected={selectedArea?.label === area.label}
              onClick={() => setSelectedArea(selectedArea?.label === area.label ? null : area)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Feature detail dialog */}
      <Dialog open={!!selectedArea} onOpenChange={(open) => { if (!open) setSelectedArea(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
          {selectedArea && (
            <>
              <DialogHeader className="pb-2">
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  {selectedArea.label}
                  <span className="text-sm font-normal text-muted-foreground">{selectedArea.value}% complete</span>
                </DialogTitle>
                {selectedArea.missing && (
                  <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-yellow-400/10 border border-yellow-400/20 text-xs text-yellow-300">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span><span className="font-medium">To reach 100%:</span> {selectedArea.missing}</span>
                  </div>
                )}
              </DialogHeader>
              <div className="space-y-1 mt-2">
                {selectedArea.features.map((f) => (
                  <div key={f.name} className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{f.name}</span>
                        {f.url && (
                          <a
                            href={f.url}
                            target={f.url.startsWith("http") ? "_blank" : "_self"}
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-[#fde047]/70 hover:text-[#fde047] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            {f.url.startsWith("http") ? "view on GitHub" : f.url}
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="log" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="log" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" />Session Log
          </TabsTrigger>
          <TabsTrigger value="backlog" className="text-xs gap-1.5">
            <Wrench className="h-3.5 w-3.5" />Backlog
          </TabsTrigger>
          <TabsTrigger value="fulfillment" className="text-xs gap-1.5">
            <Package className="h-3.5 w-3.5" />Fulfillment
          </TabsTrigger>
          <TabsTrigger value="cost" className="text-xs gap-1.5">
            <Star className="h-3.5 w-3.5" />Cost Analysis
          </TabsTrigger>
        </TabsList>

        {/* Session Log */}
        <TabsContent value="log" className="mt-4">
          <div className="pt-2">
            {SESSION_LOG.map((entry, i) => (
              <SessionLogEntry key={entry.date} entry={entry} index={i} />
            ))}
          </div>
        </TabsContent>

        {/* Backlog */}
        <TabsContent value="backlog" className="mt-4 space-y-6">
          <BacklogSection title="Before Real Customer Orders" items={BACKLOG.critical} color="bg-red-400" />
          <BacklogSection title="Code Hygiene" items={BACKLOG.hygiene} color="bg-yellow-400" />
          <BacklogSection title="Phase 3 Features" items={BACKLOG.phase3} color="bg-green-400" />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-400" />Known Issues
            </h3>
            <Card className="border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-2.5">Severity</th>
                        <th className="px-4 py-2.5">Issue</th>
                        <th className="px-4 py-2.5 hidden md:table-cell">Fix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {KNOWN_ISSUES.map((issue) => (
                        <tr key={issue.item}>
                          <td className="px-4 py-2.5">{severityBadge(issue.severity)}</td>
                          <td className="px-4 py-2.5 font-medium text-xs">{issue.item}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{issue.fix}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fulfillment */}
        <TabsContent value="fulfillment" className="mt-4">
          <FulfillmentResearch />
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost" className="mt-4">
          <CostAnalysis />
        </TabsContent>
      </Tabs>

      {/* Notify Opie Dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notify Opie of Project Update</DialogTitle>
            <DialogDescription>
              Sends a branded email to aopie91@gmail.com. Limited to once per day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="summary">Summary <span className="text-red-500">*</span></Label>
              <Textarea id="summary" placeholder="Plain-English summary for Opie — no tech jargon needed." value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className="resize-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="changes">What Changed <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="changes" placeholder={"• Added Opie's Tasks section\n• Your EIN goes in Stripe, not DNS — details in your dashboard\n• Apollo extension fix restores admin login"} value={changes} onChange={(e) => setChanges(e.target.value)} rows={4} className="resize-none" />
            </div>
            {result && (
              <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${result.ok ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"}`}>
                {result.ok ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{result.message}</span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNotifyOpen(false)} disabled={sending}>Cancel</Button>
              <Button onClick={handleNotify} disabled={sending || !summary.trim()} className="bg-[#fde047] text-black hover:bg-yellow-300 font-semibold">
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : <><Bell className="h-4 w-4 mr-2" />Send to Opie</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
