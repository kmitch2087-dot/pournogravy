import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Inline markdown renderer
// ---------------------------------------------------------------------------
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let tableHeader = false;
  let inUl = false;

  const flushUl = () => { if (inUl) { out.push("</ul>"); inUl = false; } };
  const flushTable = () => {
    if (inTable) { out.push("</tbody></table></div>"); inTable = false; tableHeader = false; }
  };
  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (line.startsWith("```")) {
      flushUl(); flushTable();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      out.push(`<pre><code>${code.join("\n").replace(/</g, "&lt;")}</code></pre>`);
      continue;
    }
    if (line.startsWith("#### ")) { flushUl(); flushTable(); out.push(`<h4>${inline(line.slice(5))}</h4>`); continue; }
    if (line.startsWith("### "))  { flushUl(); flushTable(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## "))   { flushUl(); flushTable(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("# "))    { flushUl(); flushTable(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith("> "))    { flushUl(); flushTable(); out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); continue; }
    if (/^---+$/.test(line))      { flushUl(); flushTable(); out.push("<hr>"); continue; }

    if (line.startsWith("|")) {
      flushUl();
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (!inTable) {
        out.push('<div class="overflow-x-auto"><table><thead><tr>');
        cells.forEach(c => out.push(`<th>${inline(c)}</th>`));
        out.push("</tr></thead>");
        inTable = true; tableHeader = true;
      } else if (tableHeader && cells.every(c => /^[-:]+$/.test(c))) {
        out.push("<tbody>"); tableHeader = false;
      } else if (!tableHeader) {
        out.push("<tr>");
        cells.forEach(c => out.push(`<td>${inline(c)}</td>`));
        out.push("</tr>");
      }
      continue;
    } else if (inTable) { flushTable(); }

    if (/^- \[x\] /i.test(line)) {
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true; }
      out.push(`<li class="task-item done"><span style="color:#86efac;margin-right:6px;">✓</span>${inline(line.slice(6))}</li>`);
      continue;
    }
    if (/^- \[ \] /.test(line)) {
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true; }
      out.push(`<li class="task-item"><span style="color:#6b7280;margin-right:6px;">○</span>${inline(line.slice(6))}</li>`);
      continue;
    }
    if (/^[-*] /.test(line)) {
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (line.trim() === "") { flushUl(); flushTable(); out.push(""); continue; }
    flushUl(); flushTable();
    out.push(`<p>${inline(line)}</p>`);
  }
  flushUl(); flushTable();
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Prose wrapper
// ---------------------------------------------------------------------------
const ProseBox = ({ content }: { content: string }) => (
  <div
    className="prose prose-invert prose-sm max-w-none rounded-lg border bg-card p-6
      prose-h1:text-xl prose-h1:font-bold prose-h1:tracking-tight
      prose-h2:text-lg prose-h2:font-semibold prose-h2:border-b prose-h2:border-border prose-h2:pb-2
      prose-h3:text-base prose-h3:font-semibold
      prose-table:text-sm prose-th:text-left prose-th:font-semibold
      prose-a:text-yellow-400 prose-a:no-underline hover:prose-a:underline
      prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-pre:bg-muted prose-pre:text-xs prose-pre:overflow-x-auto
      prose-blockquote:border-yellow-400 prose-blockquote:text-muted-foreground"
    dangerouslySetInnerHTML={{ __html: content }}
  />
);

// ---------------------------------------------------------------------------
// PROJECT STATUS markdown
// ---------------------------------------------------------------------------
const STATUS_MD = `# Pournogravy — Project Status
**Maintained by:** Kristin Mitchell — Aethyx
**Live Site:** [pournogravy.com](https://pournogravy.com)
**Repository:** [kmitch2087-dot/pournogravy](https://github.com/kmitch2087-dot/pournogravy)

> **Note on dates:** This project is built using multiple AI-assisted development tools (Lovable, Claude Code, Claude Cowork, and others). Entries in this log reflect updates recognized and logged by those systems — not necessarily the literal date the work was performed. Development often happens across tools simultaneously; the log captures progress milestones, not calendar hours.

---

## Session Log (Latest First)

| Date | Summary | Completed | Next Up |
|------|---------|-----------|---------|
| May 5, 2026 | Hero mobile fix. User Manual, HelpPanel, ContactKristinModal, admin-contact edge function. Project Status admin tab with Notify Opie button. POD research and Cost Analysis added as admin subcategories. Auth spinner fix — split loading/profileLoading, added 6s fetch timeout. | Hero fix, User Manual, Contact Kristin modal, Project Status tab, auth fix | Push all changes, verify mobile hero, select fulfillment partner |
| May 4, 2026 | Phase 2 audit complete. Stripe checkout live (embedded Payment Element). Products seeded. All edge functions deployed. Webhook configured. Live Stripe key added. | **Real payments processing on pournogravy.com** | Verify DB order status, confirm Resend emails, select fulfillment partner |
| April 29, 2026 | Fixed black screen bug. Fixed auth race condition. Fixed admin REVOKE bug. Full code audit. Updated all docs. Created Phase 2/3 prompts. Created 3-day developer curriculum. | Black screen fixed, auth fixed, docs created, curriculum created | Stripe secrets, Resend key, seed tables |
| April 28, 2026 | Initial setup. Diagnosed CF Pages build issue. Connected GitHub → Cloudflare Pages. Created full documentation suite. | CF deployment connected, docs created | Fix CF build command, start Stripe |

---

## ✅ Completed — Full Feature Inventory

### Infrastructure & Deployment
- [x] GitHub repo (kmitch2087-dot/pournogravy, master branch)
- [x] Cloudflare Pages connected to GitHub (project: pournogravydev)
- [x] pournogravy.com domain + SSL active
- [x] SPA routing via wrangler.toml
- [x] .env.production committed with Supabase + Stripe vars
- [x] All Supabase Edge Function secrets set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SIGNING_SECRET, RESEND_API_KEY)

### Database (Supabase)
- [x] products, cart_items, orders, order_items, custom_requests, profiles, admin_allowlist tables + RLS
- [x] settings, email_templates, printer_queue, product_reviews, discount_codes tables
- [x] All 24 products seeded into DB
- [x] is_admin() SECURITY DEFINER function + GRANT EXECUTE fix applied
- [x] handle_new_user trigger (auto-creates profile, checks allowlist)

### Edge Functions (Supabase)
- [x] create-checkout — Stripe PaymentIntent, server-side price + discount validation
- [x] stripe-webhook — payment_intent.succeeded, marks order paid, queues printer
- [x] send-notification — Resend email dispatch with template system
- [x] verify-email — syntax, disposable blocklist, MX lookup
- [x] validate-discount — validates promo codes against cart total
- [x] admin-contact — Opie messages Kristin from admin dashboard
- [x] notify-project-status — project update email to Opie (once-per-day rate limit)

### Frontend — Public Pages
- [x] Homepage (hero carousel, featured products, email capture, rotating quotes)
- [x] Shop, Product Detail, Collections, About, Contact, FAQ, 404
- [x] /proposal — Founding Client Offer / wholesale pitch page

### Frontend — Admin Dashboard
- [x] Login, Dashboard, Products, Orders, Custom Requests, Reviews, Settings
- [x] User Manual (/admin/manual)
- [x] Project Status (/admin/project-status) — with Fulfillment Research and Cost Analysis tabs

### Checkout & Payments
- [x] Stripe embedded Payment Element (stays on site)
- [x] Branded Checkout.tsx + CheckoutReturn.tsx
- [x] Guest email capture at checkout
- [x] Discount code validation (server-side)

### SEO & Discoverability
- [x] react-helmet-async SEO component on all 8 public pages
- [x] Open Graph image (og-default.jpg)
- [x] sitemap.xml + robots.txt

---

## 📋 Remaining Backlog

### 🔴 Before Real Customer Orders
- [ ] Select fulfillment partner (Printify primary — per POD research) and wire API key into stripe-webhook
- [ ] Verify opie@pournogravy.com as sender domain in Resend
- [ ] Seed email_templates (order_confirmation + custom_request rows)
- [ ] Create Supabase Storage products bucket with public read

### 🟡 Code Hygiene
- [ ] Delete src/utils/supabase/ (dead second Supabase client)
- [ ] Delete src/lib/fulfillment.ts (dead code)
- [ ] Delete wrangler.jsonc (duplicate of wrangler.toml)

### 🟢 Phase 3 Features
- [ ] Cloudflare Workers proxy (security hardening)
- [ ] Analytics (Cloudflare Web Analytics or Plausible)
- [ ] Cart merge on login
- [ ] Bundle size optimization (~972KB currently)
- [ ] Email marketing (Klaviyo or Mailchimp)
- [ ] Pour Points loyalty program
- [ ] Wishlist, product search, international shipping, wholesale portal
`;

// ---------------------------------------------------------------------------
// FULFILLMENT RESEARCH content (from POD_research_report.pdf)
// ---------------------------------------------------------------------------
const FulfillmentResearch = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-lg font-semibold">Print-on-Demand Cost Comparison</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Benchmark: Bella+Canvas 3001 · one front print · shipped to U.S. customer · May 5, 2026
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href="/docs/POD_research_report.pdf" target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </a>
      </Button>
    </div>

    {/* Recommendation callout */}
    <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/5 p-4 space-y-1">
      <p className="text-xs font-semibold tracking-widest uppercase text-yellow-400">Recommended Stack for Pournogravy</p>
      <p className="text-sm text-foreground">
        <strong>Primary:</strong> Printify &nbsp;·&nbsp;
        <strong>Premium backup:</strong> Printful &nbsp;·&nbsp;
        <strong>U.S. volume play:</strong> CustomCat Pro &nbsp;·&nbsp;
        <strong>Global/expansion:</strong> Gelato
      </p>
      <p className="text-xs text-muted-foreground pt-1">
        Start with Printify for margin testing. Order samples from Printify, Printful, and CustomCat before committing. Reserve Printful for SKUs where brand consistency matters more than cost.
      </p>
    </div>

    {/* Cost table */}
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-semibold">Cost Comparison — Lowest to Highest Total</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Product Cost</th>
              <th className="px-4 py-3">U.S. Ship</th>
              <th className="px-4 py-3 font-bold text-foreground">Est. Total</th>
              <th className="px-4 py-3">Best For</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { rank: 1, name: "Printify", product: "~$8.32", ship: "$4.75", total: "~$13.15", best: "Low-cost testing, large catalogs", tag: "PRIMARY" },
              { rank: 2, name: "Gooten", product: "From $8.65", ship: "From $4.95", total: "~$13.60", best: "Scale operations, API-style fulfillment", tag: null },
              { rank: 3, name: "Gelato (Gelato+)", product: "$8.55", ship: "From $4.99", total: "~$13.54", best: "International customers, global shipping", tag: null },
              { rank: 4, name: "Printful", product: "$11.69", ship: "From $4.75", total: "~$16.44", best: "Premium brand experience, embroidery", tag: "PREMIUM" },
              { rank: 5, name: "CustomCat Pro", product: "$8.67", ship: "~$4.99", total: "~$13.66", best: "U.S.-focused, fast production (Detroit)", tag: "U.S. MARGIN" },
            ].map((r) => (
              <tr key={r.rank} className={r.tag ? "bg-yellow-400/5" : ""}>
                <td className="px-4 py-3 text-muted-foreground">{r.rank}</td>
                <td className="px-4 py-3 font-medium">
                  {r.name}
                  {r.tag && (
                    <span className="ml-2 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-400">
                      {r.tag}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.product}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.ship}</td>
                <td className="px-4 py-3 font-semibold">{r.total}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.best}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Margin table */}
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-semibold">Gross Margin at $25 Retail Price</p>
        <p className="text-xs text-muted-foreground">Before Shopify, card processing, ad costs, refunds, or customer service time</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Est. Cost</th>
              <th className="px-4 py-3">Gross Profit</th>
              <th className="px-4 py-3">Gross Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { name: "Printify", cost: "~$13.15", profit: "~$11.85", margin: "~47%", highlight: true },
              { name: "Gooten", cost: "~$13.60", profit: "~$11.40", margin: "~46%", highlight: false },
              { name: "Gelato with Gelato+", cost: "~$13.54", profit: "~$11.46", margin: "~46%", highlight: false },
              { name: "CustomCat Pro", cost: "~$13.66", profit: "~$11.34", margin: "~45%", highlight: false },
              { name: "Gelato Free", cost: "~$15.68", profit: "~$9.32", margin: "~37%", highlight: false },
              { name: "Printful", cost: "~$16.44", profit: "~$8.56", margin: "~34%", highlight: false },
              { name: "CustomCat Lite", cost: "~$16.46", profit: "~$8.54", margin: "~34%", highlight: false },
            ].map((r) => (
              <tr key={r.name} className={r.highlight ? "bg-yellow-400/5" : ""}>
                <td className="px-4 py-3 font-medium">{r.name}{r.highlight && <span className="ml-2 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-400">PRIMARY</span>}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.cost}</td>
                <td className="px-4 py-3">{r.profit}</td>
                <td className="px-4 py-3 font-semibold text-green-400">{r.margin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Sample checklist */}
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <p className="text-sm font-semibold">Sample Testing Checklist</p>
      <p className="text-xs text-muted-foreground">Order samples from Printify, Printful, and CustomCat before committing to a primary vendor.</p>
      <ul className="text-sm text-muted-foreground space-y-1 mt-2">
        {["Print sharpness and alignment", "Shirt fabric feel and fit consistency", "Wash test after 3–5 washes", "Packaging and presentation", "Actual order-to-delivery time", "Customer support response if there is an issue"].map(item => (
          <li key={item} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>

    <p className="text-xs text-muted-foreground">
      Bottom line: the winning vendor for bartender shirts isn't just the cheapest — it's the one that lets you sell at $28–$32, protect print quality after washing, and avoid apologizing to customers.
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// COST ANALYSIS content (from COST_ANALYSIS.md)
// ---------------------------------------------------------------------------
const COST_MD = `# Pournogravy — Cost Analysis
## Market Value vs. Actual Investment
**Prepared by:** Kristin Mitchell — Aethyx
**Last Updated:** April 29, 2026

---

## Overview

This document provides a transparent comparison between what the Pournogravy website build would have cost at standard market rates versus what Aethyx charged as a portfolio-rate engagement.

**Scope note:** The scope delivered includes a full serverless payment pipeline (Stripe + Webhook handling), transactional email system (Resend via Edge Functions), admin dashboard with role-based access control, multi-table database schema with complex RLS, and production-grade DevOps troubleshooting.

---

## Market Rate Breakdown

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
| Email verification Edge Function | $500–1,500 | $1,500–4,000 |
| Custom garment request system | $1,000–2,500 | $2,500–6,000 |
| Product variant/color system + static/DB merge hook | $750–2,000 | $2,000–5,000 |
| Hero carousel & animations | $500–1,500 | $1,500–3,500 |
| Humor/brand copy integration | $500–1,500 | $1,500–3,500 |
| **Phase 3 Subtotal** | **$21,250–55,000** | **$55,000–136,000** |

### Phase 4 — DevOps & Deployment

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| GitHub repo setup & workflow | $250–750 | $750–2,000 |
| Cloudflare Pages deployment & config | $500–1,500 | $1,500–4,000 |
| Custom domain & SSL setup | $250–500 | $500–1,500 |
| CI/CD pipeline (GitHub → CF Pages auto-deploy) | $500–1,500 | $1,500–4,000 |
| SPA routing config (wrangler.toml) | $250–750 | $750–2,000 |
| Environment variable architecture | $250–750 | $750–2,000 |
| **Phase 4 Subtotal** | **$2,000–5,750** | **$5,750–15,500** |

### Phase 5 — Debugging & QA

| Deliverable | Freelancer Rate | Boutique Agency Rate |
|-------------|---------------|---------------------|
| Cross-browser & device testing | $500–1,500 | $1,500–3,500 |
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

- These estimates reflect a full custom build — not a template, Shopify install, or no-code platform.
- Market rates sourced from Clutch.co, Upwork enterprise tier, and boutique agency pricing benchmarks (2025–2026).
- Aethyx charged the portfolio rate to acquire a real-world case study. This arrangement was mutually beneficial.
- As Aethyx takes on future clients, rates will reflect standard market pricing.

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProjectStatus() {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [changes, setChanges] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

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
        setResult({ ok: true, message: data.dryRun ? "Dry run (RESEND_API_KEY not set)." : `Email sent to ${data.sentTo ?? "Opie"}.` });
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build timeline, fulfillment research, and cost analysis — all in one place.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a href="https://github.com/kmitch2087-dot/pournogravy/blob/master/docs/PROJECT_STATUS.md" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              GitHub
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/docs/POD_research_report.pdf" target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-2" />
              POD Report
            </a>
          </Button>
          <Button size="sm" onClick={() => { setResult(null); setNotifyOpen(true); }} className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
            <Bell className="h-4 w-4 mr-2" />
            Notify Opie
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="status">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Project Status</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment Research</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <ProseBox content={renderMarkdown(STATUS_MD)} />
        </TabsContent>

        <TabsContent value="fulfillment" className="mt-4">
          <FulfillmentResearch />
        </TabsContent>

        <TabsContent value="cost" className="mt-4">
          <ProseBox content={renderMarkdown(COST_MD)} />
        </TabsContent>
      </Tabs>

      {/* Notify Opie dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notify Opie of Project Update</DialogTitle>
            <DialogDescription>
              Sends a branded email to aopie91@gmail.com with a link to this page. Limited to once per day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="summary">Summary <span className="text-red-500">*</span></Label>
              <Textarea id="summary" placeholder="Plain-English summary for Opie — no tech jargon needed." value={summary} onChange={e => setSummary(e.target.value)} rows={4} className="resize-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="changes">What Changed <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea id="changes" placeholder="• Checkout now stays on the site&#10;• Added User Manual to your dashboard&#10;• You can now message Kristin directly" value={changes} onChange={e => setChanges(e.target.value)} rows={4} className="resize-none" />
            </div>
            {result && (
              <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${result.ok ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"}`}>
                {result.ok ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{result.message}</span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNotifyOpen(false)} disabled={sending}>Cancel</Button>
              <Button onClick={handleNotify} disabled={sending || !summary.trim()} className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : <><Bell className="h-4 w-4 mr-2" />Send to Opie</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
