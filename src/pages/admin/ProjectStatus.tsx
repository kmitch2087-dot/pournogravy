import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Inline markdown → HTML renderer (handles the patterns in PROJECT_STATUS.md)
// ---------------------------------------------------------------------------
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let tableHeader = false;
  let inUl = false;

  const flushUl = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
  };
  const flushTable = () => {
    if (inTable) { out.push("</tbody></table>"); inTable = false; tableHeader = false; }
  };

  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Fenced code block — pass through as <pre><code>
    if (line.startsWith("```")) {
      flushUl(); flushTable();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      out.push(`<pre><code>${codeLines.join("\n").replace(/</g, "&lt;")}</code></pre>`);
      continue;
    }

    // Headings
    if (line.startsWith("#### ")) { flushUl(); flushTable(); out.push(`<h4>${inline(line.slice(5))}</h4>`); continue; }
    if (line.startsWith("### "))  { flushUl(); flushTable(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## "))   { flushUl(); flushTable(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("# "))    { flushUl(); flushTable(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }

    // Blockquote
    if (line.startsWith("> ")) {
      flushUl(); flushTable();
      out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // HR
    if (/^---+$/.test(line)) { flushUl(); flushTable(); out.push("<hr>"); continue; }

    // Table
    if (line.startsWith("|")) {
      flushUl();
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (!inTable) {
        out.push('<div class="overflow-x-auto"><table><thead><tr>');
        cells.forEach(c => out.push(`<th>${inline(c)}</th>`));
        out.push("</tr></thead>");
        inTable = true;
        tableHeader = true;
      } else if (tableHeader && cells.every(c => /^[-:]+$/.test(c))) {
        out.push("<tbody>");
        tableHeader = false;
      } else if (!tableHeader) {
        out.push("<tr>");
        cells.forEach(c => out.push(`<td>${inline(c)}</td>`));
        out.push("</tr>");
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Checkboxes and list items
    if (/^- \[x\] /i.test(line)) {
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true; }
      out.push(`<li class="task-item done"><span class="check">✓</span> ${inline(line.slice(6))}</li>`);
      continue;
    }
    if (/^- \[ \] /.test(line)) {
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true; }
      out.push(`<li class="task-item"><span class="check empty">○</span> ${inline(line.slice(6))}</li>`);
      continue;
    }
    if (/^[-*] /.test(line)) {
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      flushUl(); flushTable();
      out.push("");
      continue;
    }

    // Paragraph
    flushUl(); flushTable();
    out.push(`<p>${inline(line)}</p>`);
  }

  flushUl();
  flushTable();
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Static markdown content (baked in at build time — always current after deploy)
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
| May 5, 2026 | Hero mobile fix — background image shows full on mobile; navbar clearance. User Manual in admin dashboard, HelpPanel, ContactKristinModal, admin-contact edge function. Project Status admin tab with Notify Opie button. | Hero fix, User Manual in admin, Contact Kristin modal, Project Status tab | Push changes, verify mobile hero, select fulfillment partner |
| May 4, 2026 | Phase 2 audit complete — all features already built. Stripe checkout live (embedded Payment Element). Products seeded. All edge functions deployed. Webhook configured. Live Stripe key added. | **Real payments processing on pournogravy.com** | Verify DB order status, confirm Resend emails, select fulfillment partner |
| April 29, 2026 | Fixed black screen bug. Fixed auth race condition. Fixed admin REVOKE bug. Full code audit. Updated all docs. Created Phase 2/3 prompts. Created 3-day developer curriculum. | Black screen fixed, auth fixed, docs created, curriculum created | Stripe secrets, Resend key, seed tables |
| April 28, 2026 | Initial setup session. Diagnosed CF Pages build issue. Connected GitHub → Cloudflare Pages. Created full documentation suite. | CF deployment connected, docs created | Fix CF build command, start Stripe |

---

## ✅ Completed — Full Feature Inventory

### Infrastructure & Deployment
- [x] GitHub repo (kmitch2087-dot/pournogravy, master branch)
- [x] Cloudflare Pages connected to GitHub (project: pournogravydev)
- [x] pournogravy.com domain + SSL active
- [x] SPA routing via wrangler.toml
- [x] .env.production committed with Supabase vars
- [x] All Supabase Edge Function secrets set (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SIGNING_SECRET, RESEND_API_KEY)
- [x] VITE_STRIPE_PUBLISHABLE_KEY added to .env.production

### Database (Supabase)
- [x] products, cart_items, orders, order_items tables + RLS
- [x] custom_requests, profiles, admin_allowlist tables
- [x] settings table seeded (id=1 row)
- [x] email_templates, printer_queue tables
- [x] product_reviews table + RLS
- [x] discount_codes table + RLS
- [x] All 24 products seeded into DB
- [x] is_admin() SECURITY DEFINER function + GRANT EXECUTE fix applied
- [x] handle_new_user trigger (auto-creates profile, checks allowlist)
- [x] Row-Level Security on every table

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
- [x] Project Status (/admin/project-status) — this page
- [x] HelpPanel (? button), ContactKristinModal

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
- [ ] Select fulfillment partner (Printful or Printify) and wire API key into stripe-webhook
- [ ] Verify opie@pournogravy.com as sender domain in Resend
- [ ] Seed email_templates (order_confirmation + custom_request rows)
- [ ] Create Supabase Storage products bucket with public read

### 🟡 Code Hygiene
- [ ] Delete src/utils/supabase/ (dead second Supabase client)
- [ ] Delete src/lib/fulfillment.ts (dead code)
- [ ] Delete wrangler.jsonc (duplicate of wrangler.toml)
- [ ] Fix .env.local (rename VITE_SUPABASE_PUBLISHABLE_KEY → VITE_SUPABASE_ANON_KEY)

### 🟢 Phase 3 Features
- [ ] Cloudflare Workers proxy (security hardening)
- [ ] Analytics (Cloudflare Web Analytics or Plausible)
- [ ] Cart merge on login
- [ ] Bundle size optimization (currently ~972KB)
- [ ] Email marketing integration (Klaviyo or Mailchimp)
- [ ] Pour Points loyalty program
- [ ] Wishlist, product search, international shipping, wholesale portal
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
        setResult({ ok: true, message: data.dryRun ? "Dry run (RESEND_API_KEY not set) — rate limit updated." : `Email sent to ${data.sentTo ?? "Opie"}.` });
        setSummary("");
        setChanges("");
      } else {
        setResult({ ok: false, message: data?.error ?? "Unknown error" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setResult({ ok: false, message: msg });
    } finally {
      setSending(false);
    }
  };

  const htmlContent = renderMarkdown(STATUS_MD);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full build timeline and feature inventory — updated each development session.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href="https://github.com/kmitch2087-dot/pournogravy/blob/master/docs/PROJECT_STATUS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on GitHub
            </a>
          </Button>
          <Button
            size="sm"
            onClick={() => { setResult(null); setNotifyOpen(true); }}
            className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notify Opie
          </Button>
        </div>
      </div>

      {/* Markdown content */}
      <div
        className="prose prose-invert prose-sm max-w-none rounded-lg border bg-card p-6
          prose-h1:text-xl prose-h1:font-bold prose-h1:tracking-tight
          prose-h2:text-lg prose-h2:font-semibold prose-h2:border-b prose-h2:border-border prose-h2:pb-2
          prose-h3:text-base prose-h3:font-semibold
          prose-table:text-sm prose-th:text-left prose-th:font-semibold
          prose-a:text-yellow-400 prose-a:no-underline hover:prose-a:underline
          prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-pre:bg-muted prose-pre:text-xs prose-pre:overflow-x-auto
          prose-blockquote:border-yellow-400 prose-blockquote:text-muted-foreground prose-blockquote:text-sm"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Notify Opie dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notify Opie of Project Update</DialogTitle>
            <DialogDescription>
              Sends a branded email to aopie91@gmail.com with a link to this page.
              Limited to once per day.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="summary">Summary <span className="text-red-500">*</span></Label>
              <Textarea
                id="summary"
                placeholder="e.g. The shop and checkout are fully live — Opie can now take real orders. Payments go through Stripe and you'll get email confirmations automatically."
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Plain-English summary for Opie — no tech jargon needed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="changes">What Changed <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="changes"
                placeholder="e.g. • Checkout now stays on the site instead of redirecting&#10;• Added a User Manual to your admin dashboard&#10;• You can now message Kristin directly from the dashboard"
                value={changes}
                onChange={e => setChanges(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {result && (
              <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${result.ok ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"}`}>
                {result.ok
                  ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{result.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNotifyOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleNotify}
                disabled={sending || !summary.trim()}
                className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
              >
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
                ) : (
                  <><Bell className="h-4 w-4 mr-2" /> Send to Opie</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
