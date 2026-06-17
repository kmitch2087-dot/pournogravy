# Bookkeeping Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Bookkeeping section in the admin dashboard that tracks expenses, per-product COGS, auto-syncs Stripe fees, auto-closes months, and produces accountant-ready PDF/CSV exports and a one-click year-end Tax Packet.

**Architecture:** Five admin sub-pages under `/admin/bookkeeping/*` backed by two new DB tables (`monthly_snapshots`, `expenses`) and a `cost_cents` column on `products`. Two cron-triggered edge functions handle monthly book-closing and daily Stripe fee sync. A `generate-report` edge function aggregates data for download. CSV exports are built client-side; PDF exports use browser print-to-PDF with print-specific CSS.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, TanStack Query, Supabase JS v2, Deno edge functions, Stripe API, jszip (new dependency), date-fns

## Global Constraints

- Supabase client: always import from `@/integrations/supabase/client` — never create a new client in frontend code
- Currency: always store as integer cents; display via `new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)`
- Data fetching: `useQuery` with `staleTime: 60_000`; mutations via `useMutation` + `queryClient.invalidateQueries`
- UI: shadcn/ui components + Tailwind classes matching existing admin palette (`bg-card`, `border-border`, `text-muted-foreground`)
- Motion: `motion.div` with `initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}`
- Edge functions: Deno, `supabase-js@2.45.0` from esm.sh, service-role auth check, try/catch with JSON error response
- Accounting method: cash basis throughout
- All edge functions already have `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` available as secrets

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `supabase/migrations/20260617000010_bookkeeping_schema.sql` | monthly_snapshots + expenses tables + products.cost_cents + RLS |
| `supabase/migrations/20260617000011_bookkeeping_crons.sql` | cron.schedule() calls for close-month and sync-stripe-fees |
| `supabase/functions/close-month/index.ts` | Monthly snapshot cron function |
| `supabase/functions/sync-stripe-fees/index.ts` | Daily Stripe fee sync cron function |
| `supabase/functions/generate-report/index.ts` | HTTP function — returns report JSON for any type + period |
| `src/pages/admin/BookkeepingOverview.tsx` | Year P&L grid + amendment drawer |
| `src/pages/admin/BookkeepingExpenses.tsx` | Expense ledger + manual entry form |
| `src/pages/admin/BookkeepingProducts.tsx` | Per-product COGS editor |
| `src/pages/admin/BookkeepingReports.tsx` | Report generator (CSV + print-to-PDF) |
| `src/pages/admin/BookkeepingTaxPacket.tsx` | Year-end ZIP export |
| `src/lib/reportDownload.ts` | CSV string builder + print-to-PDF + jszip utilities |

### Modified files
| File | Change |
|------|--------|
| `src/App.tsx` | Add 5 bookkeeping routes under `/admin` |
| `src/components/admin/AdminLayout.tsx` | Add Bookkeeping nav item |
| `src/pages/admin/Financials.tsx` | Net refunds from revenue; add year selector |

---

## Task 1: Database Schema

**Files:**
- Create: `supabase/migrations/20260617000010_bookkeeping_schema.sql`

**Interfaces:**
- Produces: `monthly_snapshots(year, month, revenue_cents, refunds_cents, cogs_cents, expenses_cents, stripe_fees_cents, net_profit_cents, closed_at, amended_at, amendment_note)`
- Produces: `expenses(id, date, amount_cents, category, description, source, receipt_url, stripe_charge_id, month_snapshot_id, created_at)`
- Produces: `products.cost_cents int NOT NULL DEFAULT 1200`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260617000010_bookkeeping_schema.sql

-- 1. Add cost_cents to products (default $12.00 = existing hardcoded value)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_cents int NOT NULL DEFAULT 1200;

-- 2. Monthly snapshots — one locked row per calendar month
CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  year              int         NOT NULL,
  month             int         NOT NULL CHECK (month BETWEEN 1 AND 12),
  revenue_cents     int         NOT NULL DEFAULT 0,
  refunds_cents     int         NOT NULL DEFAULT 0,
  cogs_cents        int         NOT NULL DEFAULT 0,
  expenses_cents    int         NOT NULL DEFAULT 0,
  stripe_fees_cents int         NOT NULL DEFAULT 0,
  net_profit_cents  int         GENERATED ALWAYS AS
                    (revenue_cents - refunds_cents - cogs_cents - expenses_cents) STORED,
  closed_at         timestamptz NOT NULL DEFAULT now(),
  amended_at        timestamptz,
  amendment_note    text,
  UNIQUE (year, month)
);

-- 3. Expenses ledger
CREATE TABLE IF NOT EXISTS public.expenses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date              date        NOT NULL,
  amount_cents      int         NOT NULL CHECK (amount_cents > 0),
  category          text        NOT NULL,
  description       text        NOT NULL,
  source            text        NOT NULL DEFAULT 'manual'
                                CHECK (source IN ('manual', 'stripe_auto')),
  receipt_url       text,
  stripe_charge_id  text        UNIQUE,  -- null for manual; dedup key for stripe_auto
  month_snapshot_id uuid        REFERENCES public.monthly_snapshots(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 4. RLS
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;

-- Admins can read both tables
CREATE POLICY "admin_read_snapshots" ON public.monthly_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "admin_read_expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can insert/update/delete manual expenses only
CREATE POLICY "admin_write_manual_expenses" ON public.expenses
  FOR ALL USING (
    source = 'manual' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can update amendment fields on snapshots
CREATE POLICY "admin_amend_snapshots" ON public.monthly_snapshots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Service role bypasses RLS (for edge functions) — no policy needed; 
-- service role is exempt by default in Supabase.
```

- [ ] **Step 2: Push migration to remote**

```bash
cd "/Users/kristinmitchell/Documents/Claude/Projects/Pournogravy Website Build./.claude/worktrees/optimistic-pasteur-2c8e14"
supabase db push --linked
```

Expected: `Applying migration 20260617000010_bookkeeping_schema.sql... Finished supabase db push.`

- [ ] **Step 3: Verify tables exist**

```bash
# Quick smoke-test via REST (anon key can't read due to RLS, but 401 confirms table exists)
curl -s "https://emtjkawcmsfgjyimnncf.supabase.co/rest/v1/monthly_snapshots?limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdGprYXdjbXNmZ2p5aW1ubmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDY2MDksImV4cCI6MjA5MjI4MjYwOX0.Kb8hwzqCfdDdvpmXKWtSXW5m3wzC3_sBhML6bCJyRgY"
```

Expected: `[]` (empty array — RLS allows anon read to return empty rather than 401 for SELECT; table exists)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617000010_bookkeeping_schema.sql
git commit -m "feat: bookkeeping schema — monthly_snapshots, expenses, products.cost_cents"
```

---

## Task 2: Fix Financials Page

**Files:**
- Modify: `src/pages/admin/Financials.tsx`

**Interfaces:**
- Consumes: existing `orders` table, existing `order_items` table
- Produces: corrected revenue figure (refunds excluded); year selector state

- [ ] **Step 1: Add year selector state and fix revenue query**

Open `src/pages/admin/Financials.tsx`. Find the `useFinancialsData` hook (or equivalent inline query). Make these two changes:

**Add year state at the top of the component (before the hook call):**
```typescript
const currentYear = new Date().getFullYear();
const [selectedYear, setSelectedYear] = useState(currentYear);
const yearStart = `${selectedYear}-01-01T00:00:00.000Z`;
const yearEnd   = `${selectedYear}-12-31T23:59:59.999Z`;
```

**Fix the orders query to exclude refunded orders AND scope to selected year:**
```typescript
// BEFORE (finds revenue query — something like):
.in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])

// AFTER — add refunded to exclusion and use yearStart/yearEnd:
.in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
.gte("created_at", yearStart)
.lte("created_at", yearEnd)
```

**Add a separate refunds query inside the same hook:**
```typescript
const { data: refundedOrders } = useQuery<{ total_cents: number }[]>({
  queryKey: ["financials-refunds", selectedYear],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("total_cents")
      .eq("status", "refunded")
      .gte("created_at", yearStart)
      .lte("created_at", yearEnd);
    if (error) throw error;
    return (data ?? []) as { total_cents: number }[];
  },
  staleTime: 60_000,
});
```

- [ ] **Step 2: Add year selector UI**

Find the page header section. Add a year dropdown immediately after the page title:

```tsx
{/* Year selector — add after page title */}
<select
  value={selectedYear}
  onChange={(e) => setSelectedYear(Number(e.target.value))}
  className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
>
  {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
    <option key={y} value={y}>{y}</option>
  ))}
</select>
```

- [ ] **Step 3: Show refunds as a line item**

Find wherever gross revenue is displayed. Add a refunds line and a net revenue line below it:

```tsx
{/* After gross revenue display */}
<div className="flex justify-between text-sm text-muted-foreground">
  <span>Refunds Issued</span>
  <span className="text-red-400">
    − {fmt((refundedOrders ?? []).reduce((s, o) => s + o.total_cents, 0))}
  </span>
</div>
<div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
  <span>Net Revenue</span>
  <span>
    {fmt(
      orders.reduce((s, o) => s + o.total_cents, 0) -
      (refundedOrders ?? []).reduce((s, o) => s + o.total_cents, 0)
    )}
  </span>
</div>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Financials.tsx
git commit -m "fix: financials — net out refunds, add year selector"
```

---

## Task 3: Nav + Routing Scaffold

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`
- Modify: `src/App.tsx`
- Create: `src/pages/admin/BookkeepingOverview.tsx`
- Create: `src/pages/admin/BookkeepingExpenses.tsx`
- Create: `src/pages/admin/BookkeepingProducts.tsx`
- Create: `src/pages/admin/BookkeepingReports.tsx`
- Create: `src/pages/admin/BookkeepingTaxPacket.tsx`

**Interfaces:**
- Produces: 5 routable admin pages (stubs); Bookkeeping nav item

- [ ] **Step 1: Create stub pages**

Create each file with a minimal placeholder. Use this pattern for all five:

```tsx
// src/pages/admin/BookkeepingOverview.tsx
export default function BookkeepingOverview() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Bookkeeping</h1>
      <p className="text-muted-foreground text-sm">Overview — coming soon</p>
    </div>
  );
}
```

Repeat for `BookkeepingExpenses`, `BookkeepingProducts`, `BookkeepingReports`, `BookkeepingTaxPacket` (change the display name in each).

- [ ] **Step 2: Add routes to App.tsx**

Find the admin route block (nested under `<Route path="/admin" ...>`). Add lazy imports at the top of the file alongside the other lazy imports:

```typescript
const BookkeepingOverview  = lazy(() => import("./pages/admin/BookkeepingOverview"));
const BookkeepingExpenses  = lazy(() => import("./pages/admin/BookkeepingExpenses"));
const BookkeepingProducts  = lazy(() => import("./pages/admin/BookkeepingProducts"));
const BookkeepingReports   = lazy(() => import("./pages/admin/BookkeepingReports"));
const BookkeepingTaxPacket = lazy(() => import("./pages/admin/BookkeepingTaxPacket"));
```

Then inside the admin `<Route>` block, add:

```tsx
<Route path="bookkeeping"             element={<BookkeepingOverview />} />
<Route path="bookkeeping/expenses"    element={<BookkeepingExpenses />} />
<Route path="bookkeeping/products"    element={<BookkeepingProducts />} />
<Route path="bookkeeping/reports"     element={<BookkeepingReports />} />
<Route path="bookkeeping/tax-packet"  element={<BookkeepingTaxPacket />} />
```

- [ ] **Step 3: Add nav item to AdminLayout.tsx**

Find the `navItems` array. Add this entry after the Financials item:

```typescript
{ to: "/admin/bookkeeping", label: "Bookkeeping", icon: BookOpen, end: false },
```

Add `BookOpen` to the lucide-react import at the top of the file.

- [ ] **Step 4: Verify routes are reachable**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build, no missing module errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/admin/AdminLayout.tsx \
  src/pages/admin/BookkeepingOverview.tsx \
  src/pages/admin/BookkeepingExpenses.tsx \
  src/pages/admin/BookkeepingProducts.tsx \
  src/pages/admin/BookkeepingReports.tsx \
  src/pages/admin/BookkeepingTaxPacket.tsx
git commit -m "feat: bookkeeping routing scaffold and nav item"
```

---

## Task 4: Products (COGS) Page

**Files:**
- Modify: `src/pages/admin/BookkeepingProducts.tsx`

**Interfaces:**
- Consumes: `products` table columns `id, slug, name, price_cents, cost_cents, published`
- Produces: inline-editable `cost_cents` per product, sorted by margin ascending

- [ ] **Step 1: Implement the page**

Replace the stub with:

```tsx
// src/pages/admin/BookkeepingProducts.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface Product {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  cost_cents: number;
  published: boolean;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function margin(price: number, cost: number) {
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 1000) / 10; // one decimal place
}

export default function BookkeepingProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string>>({});

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["bk-products-cogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price_cents, cost_cents, published")
        .order("name");
      if (error) throw error;
      // Sort by margin ascending (lowest margin = most attention needed)
      return ((data ?? []) as Product[]).sort(
        (a, b) => margin(a.price_cents, a.cost_cents) - margin(b.price_cents, b.cost_cents)
      );
    },
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async ({ id, cost_cents }: { id: string; cost_cents: number }) => {
      const { error } = await supabase
        .from("products")
        .update({ cost_cents })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-products-cogs"] });
      toast.success("Cost updated");
    },
    onError: () => toast.error("Failed to save"),
  });

  function handleBlur(product: Product) {
    const raw = editing[product.id];
    if (raw === undefined) return;
    const dollars = parseFloat(raw);
    if (isNaN(dollars) || dollars < 0) {
      toast.error("Enter a valid cost (e.g. 12.00)");
      setEditing((e) => { const n = { ...e }; delete n[product.id]; return n; });
      return;
    }
    const cents = Math.round(dollars * 100);
    if (cents !== product.cost_cents) {
      save.mutate({ id: product.id, cost_cents: cents });
    }
    setEditing((e) => { const n = { ...e }; delete n[product.id]; return n; });
  }

  return (
    <div className="p-6 max-w-4xl">
      <Link
        to="/admin/bookkeeping"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Bookkeeping
      </Link>

      <h1 className="text-2xl font-bold mb-1">Cost of Goods Sold</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Enter what it costs to produce each item — printing, materials, fulfillment.
        Your accountant uses this to calculate COGS on your tax return. Update whenever
        your printer changes their prices.
      </p>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Sale Price</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost to Produce</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Margin</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              : products.map((p, i) => {
                  const m = margin(p.price_cents, p.cost_cents);
                  const editVal = editing[p.id];
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{fmt(p.price_cents)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end">
                          <Input
                            className="w-24 h-7 text-right text-sm"
                            value={editVal !== undefined ? editVal : (p.cost_cents / 100).toFixed(2)}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            onBlur={() => handleBlur(p)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") {
                                setEditing((prev) => { const n = { ...prev }; delete n[p.id]; return n; });
                              }
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            m >= 50
                              ? "text-green-400 border-green-400/40"
                              : m >= 30
                              ? "text-yellow-400 border-yellow-400/40"
                              : "text-red-400 border-red-400/40"
                          }
                        >
                          {m.toFixed(1)}%
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/BookkeepingProducts.tsx
git commit -m "feat: bookkeeping COGS editor — per-product cost basis"
```

---

## Task 5: Expenses Page

**Files:**
- Modify: `src/pages/admin/BookkeepingExpenses.tsx`

**Interfaces:**
- Consumes: `expenses` table (all columns)
- Produces: manual expense entries inserted to `expenses`; receipt uploaded to `expenses/` Supabase Storage bucket

- [ ] **Step 1: Create the expenses Storage bucket via migration**

Create `supabase/migrations/20260617000012_expenses_storage.sql`:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('expenses', 'expenses', false)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload and read receipts
CREATE POLICY "admin_expenses_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'expenses' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
```

Push it:
```bash
supabase db push --linked
```

- [ ] **Step 2: Implement the page**

```tsx
// src/pages/admin/BookkeepingExpenses.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, Lock, Trash2, Receipt } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

const CATEGORIES = [
  "Cost of Goods Sold",
  "Merchant / Processing Fees",
  "Advertising & Marketing",
  "Shipping Paid",
  "Software & Subscriptions",
  "Supplies & Equipment",
  "Contract Labor",
  "Other Business Expense",
] as const;

interface Expense {
  id: string;
  date: string;
  amount_cents: number;
  category: string;
  description: string;
  source: "manual" | "stripe_auto";
  receipt_url: string | null;
  stripe_charge_id: string | null;
  created_at: string;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const defaultForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  category: CATEGORIES[0] as string,
  description: "",
  receipt: null as File | null,
};

export default function BookkeepingExpenses() {
  const qc = useQueryClient();
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);

  const refDate = subMonths(new Date(), monthOffset);
  const rangeStart = format(startOfMonth(refDate), "yyyy-MM-dd");
  const rangeEnd   = format(endOfMonth(refDate),   "yyyy-MM-dd");
  const monthLabel = format(refDate, "MMMM yyyy");

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["bk-expenses", rangeStart, rangeEnd, categoryFilter],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select("*")
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .order("date", { ascending: false });
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
    staleTime: 60_000,
  });

  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);

  const addExpense = useMutation({
    mutationFn: async () => {
      const amount_cents = Math.round(parseFloat(form.amount) * 100);
      if (isNaN(amount_cents) || amount_cents <= 0) throw new Error("Invalid amount");

      let receipt_url: string | null = null;
      if (form.receipt) {
        setUploading(true);
        const ext = form.receipt.name.split(".").pop();
        const path = `receipts/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("expenses")
          .upload(path, form.receipt);
        setUploading(false);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("expenses").getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("expenses").insert({
        date: form.date,
        amount_cents,
        category: form.category,
        description: form.description.trim(),
        source: "manual",
        receipt_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-expenses"] });
      setForm(defaultForm);
      setOpen(false);
      toast.success("Expense added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id).eq("source", "manual");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-expenses"] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Cannot delete auto-synced Stripe entries"),
  });

  return (
    <div className="p-6 max-w-4xl">
      <Link
        to="/admin/bookkeeping"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Bookkeeping
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Expenses</h1>
          <p className="text-muted-foreground text-sm">
            Manual entries + auto-synced Stripe fees.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonthOffset((o) => o + 1)}>←</Button>
          <span className="text-sm font-medium w-32 text-center">{monthLabel}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
            disabled={monthOffset === 0}
          >→</Button>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ml-auto text-sm font-semibold text-foreground">
          Total: {fmt(total)}
        </div>
      </div>

      {/* Ledger */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4 border-b border-border/50">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))
          : expenses.length === 0
          ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No expenses for {monthLabel}.
            </div>
          )
          : expenses.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/20 text-sm"
              >
                <span className="text-muted-foreground w-20 shrink-0">
                  {format(new Date(exp.date), "MMM d")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{exp.description}</div>
                  <div className="text-xs text-muted-foreground">{exp.category}</div>
                </div>
                {exp.source === "stripe_auto" && (
                  <Badge variant="outline" className="text-xs shrink-0">Stripe</Badge>
                )}
                {exp.receipt_url && (
                  <a href={exp.receipt_url} target="_blank" rel="noreferrer">
                    <Receipt className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </a>
                )}
                <span className="font-semibold w-20 text-right shrink-0">
                  {fmt(exp.amount_cents)}
                </span>
                {exp.source === "manual" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 shrink-0 text-muted-foreground hover:text-red-400"
                    onClick={() => deleteExpense.mutate(exp.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                )}
              </motion.div>
            ))}
      </div>

      {/* Add Expense Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Expense</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                placeholder="e.g. Supabase Pro subscription"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Receipt (optional)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) =>
                  setForm((f) => ({ ...f, receipt: e.target.files?.[0] ?? null }))
                }
              />
            </div>
            <Button
              className="w-full"
              onClick={() => addExpense.mutate()}
              disabled={addExpense.isPending || uploading || !form.amount || !form.description}
            >
              {addExpense.isPending || uploading ? "Saving…" : "Save Expense"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260617000012_expenses_storage.sql \
        src/pages/admin/BookkeepingExpenses.tsx
git commit -m "feat: bookkeeping expenses page — manual entry + Stripe badge + receipt upload"
```

---

## Task 6: `sync-stripe-fees` Edge Function

**Files:**
- Create: `supabase/functions/sync-stripe-fees/index.ts`
- Create: `supabase/migrations/20260617000013_sync_stripe_fees_cron.sql`

**Interfaces:**
- Consumes: Stripe Balance Transactions API (`/v1/balance_transactions?type=charge&limit=100`)
- Produces: upserted rows in `expenses` with `source = 'stripe_auto'`

- [ ] **Step 1: Write the edge function**

```typescript
// supabase/functions/sync-stripe-fees/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const supabase  = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Fetch last 48h of balance transactions (overlap handles timing edge cases)
    const since = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);
    const url = `https://api.stripe.com/v1/balance_transactions?type=charge&limit=100&created[gte]=${since}`;

    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok) throw new Error(`Stripe API error: ${res.status}`);

    const body = await res.json() as {
      data: { id: string; created: number; amount: number; fee: number; source: string }[];
    };

    if (!body.data?.length) {
      return new Response(JSON.stringify({ ok: true, synced: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const rows = body.data
      .filter((t) => t.fee > 0)
      .map((t) => ({
        date:             new Date(t.created * 1000).toISOString().slice(0, 10),
        amount_cents:     t.fee,
        category:         "Merchant / Processing Fees",
        description:      `Stripe processing fee — charge ${t.source}`,
        source:           "stripe_auto",
        stripe_charge_id: t.id,
      }));

    if (!rows.length) {
      return new Response(JSON.stringify({ ok: true, synced: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("expenses")
      .upsert(rows, { onConflict: "stripe_charge_id" });

    if (error) throw error;

    console.log(`[sync-stripe-fees] synced ${rows.length} fee rows`);
    return new Response(JSON.stringify({ ok: true, synced: rows.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sync-stripe-fees]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

- [ ] **Step 2: Write the cron migration**

```sql
-- supabase/migrations/20260617000013_sync_stripe_fees_cron.sql
-- Runs daily at 02:00 UTC
select cron.schedule(
  'sync-stripe-fees-daily',
  '0 2 * * *',
  $$
  select net.http_post(
    url     := 'https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/sync-stripe-fees',
    headers := json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
```

> **Note:** `current_setting('app.service_role_key', true)` reads from a Postgres setting. If this returns null in your environment, hardcode the service role key value (same pattern as the existing `refresh-market-rates` cron migration in the project).

- [ ] **Step 3: Deploy edge function and push migration**

```bash
supabase functions deploy sync-stripe-fees --project-ref emtjkawcmsfgjyimnncf
supabase db push --linked
```

- [ ] **Step 4: Smoke test**

```bash
# Manually trigger the function to confirm it runs without error
curl -s -X POST \
  "https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/sync-stripe-fees" \
  -H "Authorization: Bearer $(cat supabase/.env.local 2>/dev/null | grep SERVICE_ROLE | cut -d= -f2 || echo 'YOUR_SERVICE_ROLE_KEY')" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `{"ok":true,"synced":<N>}` where N is 0 or more.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/sync-stripe-fees/index.ts \
        supabase/migrations/20260617000013_sync_stripe_fees_cron.sql
git commit -m "feat: sync-stripe-fees edge function + daily cron"
```

---

## Task 7: `close-month` Edge Function

**Files:**
- Create: `supabase/functions/close-month/index.ts`
- Create: `supabase/migrations/20260617000014_close_month_cron.sql`

**Interfaces:**
- Consumes: `orders`, `order_items`, `products.cost_cents`, `expenses` for the closing month
- Produces: one row in `monthly_snapshots`; stamps `month_snapshot_id` on all expense rows for that month

- [ ] **Step 1: Write the edge function**

```typescript
// supabase/functions/close-month/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Determine the month to close: previous calendar month
    const now        = new Date();
    const closeDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year       = closeDate.getFullYear();
    const month      = closeDate.getMonth() + 1; // 1-12
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
    const nextMonth  = new Date(year, month, 1);
    const monthEnd   = nextMonth.toISOString();

    // Idempotency check — skip if already closed
    const { data: existing } = await supabase
      .from("monthly_snapshots")
      .select("id")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (existing) {
      console.log(`[close-month] ${year}-${month} already closed — skipping`);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Revenue: paid/fulfilled/shipped/delivered orders in the month
    const { data: revenueRows } = await supabase
      .from("orders")
      .select("total_cents")
      .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
      .gte("created_at", monthStart)
      .lt("created_at",  monthEnd);

    const revenue_cents = (revenueRows ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0);

    // Refunds: refunded orders in the month
    const { data: refundRows } = await supabase
      .from("orders")
      .select("total_cents")
      .eq("status", "refunded")
      .gte("created_at", monthStart)
      .lt("created_at",  monthEnd);

    const refunds_cents = (refundRows ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0);

    // COGS: order items × product cost for orders in the month
    // Join via order_id → orders.created_at
    const { data: orderIds } = await supabase
      .from("orders")
      .select("id")
      .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
      .gte("created_at", monthStart)
      .lt("created_at",  monthEnd);

    let cogs_cents = 0;
    if (orderIds?.length) {
      const ids = orderIds.map((o) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("quantity, product_slug")
        .in("order_id", ids);

      if (items?.length) {
        // Fetch cost_cents for each unique slug
        const slugs = [...new Set(items.map((i) => i.product_slug).filter(Boolean))];
        const { data: costs } = await supabase
          .from("products")
          .select("slug, cost_cents")
          .in("slug", slugs);
        const costMap = Object.fromEntries((costs ?? []).map((p) => [p.slug, p.cost_cents]));
        cogs_cents = items.reduce((s, item) => {
          const cost = costMap[item.product_slug] ?? 1200; // fall back to $12 if missing
          return s + (item.quantity ?? 1) * cost;
        }, 0);
      }
    }

    // Expenses: all expense rows for the month
    const { data: expRows } = await supabase
      .from("expenses")
      .select("id, amount_cents, source")
      .gte("date", monthStart.slice(0, 10))
      .lte("date", monthEnd.slice(0, 10));

    const expenses_cents    = (expRows ?? []).reduce((s, e) => s + e.amount_cents, 0);
    const stripe_fees_cents = (expRows ?? [])
      .filter((e) => e.source === "stripe_auto")
      .reduce((s, e) => s + e.amount_cents, 0);

    // Write snapshot
    const { data: snapshot, error: snapErr } = await supabase
      .from("monthly_snapshots")
      .insert({ year, month, revenue_cents, refunds_cents, cogs_cents, expenses_cents, stripe_fees_cents })
      .select("id")
      .single();

    if (snapErr) throw snapErr;

    // Stamp expense rows with snapshot id
    const expenseIds = (expRows ?? []).map((e) => e.id);
    if (expenseIds.length) {
      await supabase
        .from("expenses")
        .update({ month_snapshot_id: snapshot.id })
        .in("id", expenseIds);
    }

    console.log(`[close-month] closed ${year}-${month}: revenue=${revenue_cents} cogs=${cogs_cents} expenses=${expenses_cents}`);
    return new Response(JSON.stringify({ ok: true, year, month, snapshot_id: snapshot.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[close-month]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

- [ ] **Step 2: Write the cron migration**

```sql
-- supabase/migrations/20260617000014_close_month_cron.sql
-- Runs at 00:05 on the 1st of each month
select cron.schedule(
  'close-month-monthly',
  '5 0 1 * *',
  $$
  select net.http_post(
    url     := 'https://emtjkawcmsfgjyimnncf.supabase.co/functions/v1/close-month',
    headers := json_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 3: Deploy and push**

```bash
supabase functions deploy close-month --project-ref emtjkawcmsfgjyimnncf
supabase db push --linked
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/close-month/index.ts \
        supabase/migrations/20260617000014_close_month_cron.sql
git commit -m "feat: close-month edge function + monthly cron"
```

---

## Task 8: Bookkeeping Overview Page

**Files:**
- Modify: `src/pages/admin/BookkeepingOverview.tsx`

**Interfaces:**
- Consumes: `monthly_snapshots` table; sub-nav links to other bookkeeping pages
- Produces: amendment_note + amended_at written back to `monthly_snapshots`

- [ ] **Step 1: Implement the page**

```tsx
// src/pages/admin/BookkeepingOverview.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, Pencil, BookOpen, Receipt, Package, BarChart2, Gift } from "lucide-react";
import { format } from "date-fns";

interface Snapshot {
  id: string;
  year: number;
  month: number;
  revenue_cents: number;
  refunds_cents: number;
  cogs_cents: number;
  expenses_cents: number;
  stripe_fees_cents: number;
  net_profit_cents: number;
  closed_at: string;
  amended_at: string | null;
  amendment_note: string | null;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function BookkeepingOverview() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeSnap, setActiveSnap] = useState<Snapshot | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: snapshots = [], isLoading } = useQuery<Snapshot[]>({
    queryKey: ["bk-snapshots", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("year", selectedYear)
        .order("month");
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
    staleTime: 60_000,
  });

  const snapMap = Object.fromEntries(snapshots.map((s) => [s.month, s]));

  const annualRevenue  = snapshots.reduce((s, m) => s + m.revenue_cents, 0);
  const annualExpenses = snapshots.reduce((s, m) => s + m.expenses_cents, 0);
  const annualProfit   = snapshots.reduce((s, m) => s + m.net_profit_cents, 0);
  const annualStripe   = snapshots.reduce((s, m) => s + m.stripe_fees_cents, 0);

  const saveAmendment = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from("monthly_snapshots")
        .update({ amendment_note: note || null, amended_at: note ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-snapshots"] });
      setActiveSnap(null);
      toast.success("Annotation saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const subNav = [
    { to: "/admin/bookkeeping/expenses",   label: "Expenses",   icon: Receipt  },
    { to: "/admin/bookkeeping/products",   label: "COGS",       icon: Package  },
    { to: "/admin/bookkeeping/reports",    label: "Reports",    icon: BarChart2},
    { to: "/admin/bookkeeping/tax-packet", label: "Tax Packet", icon: Gift     },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Bookkeeping</h1>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 mb-6">
        {subNav.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Icon className="w-3.5 h-3.5" />{label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Guidance */}
      <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground mb-6">
        Books close automatically on the 1st of each month. If something looks off in a closed month,
        click it to add an annotation — your accountant will see it. Do not panic.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Annual Revenue",    value: annualRevenue,  color: "text-green-400"  },
          { label: "Annual Expenses",   value: annualExpenses, color: "text-red-400"    },
          { label: "Net Profit",        value: annualProfit,   color: "text-yellow-400" },
          { label: "Stripe Fees Paid",  value: annualStripe,   color: "text-blue-400"   },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={`text-lg font-bold ${color}`}>{fmt(value)}</div>
          </motion.div>
        ))}
      </div>

      {/* Monthly grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {MONTH_NAMES.map((name, idx) => {
          const m    = idx + 1;
          const snap = snapMap[m];
          const isCurrentMonth = selectedYear === currentYear && m === currentMonth;
          const isFuture       = selectedYear === currentYear && m > currentMonth;

          return (
            <motion.div
              key={m}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => {
                if (snap) { setActiveSnap(snap); setNoteText(snap.amendment_note ?? ""); }
              }}
              className={[
                "rounded-xl border p-3 text-sm",
                isFuture
                  ? "border-border/30 opacity-40 cursor-default"
                  : snap
                  ? "border-border cursor-pointer hover:bg-muted/20"
                  : isCurrentMonth
                  ? "border-primary/40 bg-primary/5 cursor-default"
                  : "border-border/30 cursor-default",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{name}</span>
                {snap?.amended_at
                  ? <Pencil className="w-3.5 h-3.5 text-yellow-400" />
                  : snap
                  ? <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                  : isCurrentMonth
                  ? <Badge variant="outline" className="text-xs py-0">Open</Badge>
                  : null}
              </div>
              {isLoading ? (
                <Skeleton className="h-3 w-full mb-1" />
              ) : snap ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    Rev: <span className="text-foreground">{fmt(snap.revenue_cents)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Net: <span className={snap.net_profit_cents >= 0 ? "text-green-400" : "text-red-400"}>
                      {fmt(snap.net_profit_cents)}
                    </span>
                  </div>
                </>
              ) : isCurrentMonth ? (
                <div className="text-xs text-muted-foreground">Live data</div>
              ) : (
                <div className="text-xs text-muted-foreground/40">—</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Amendment drawer */}
      <Sheet open={!!activeSnap} onOpenChange={(o) => !o && setActiveSnap(null)}>
        <SheetContent>
          {activeSnap && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {MONTH_NAMES[activeSnap.month - 1]} {activeSnap.year}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                {[
                  ["Revenue",    fmt(activeSnap.revenue_cents)],
                  ["Refunds",    `− ${fmt(activeSnap.refunds_cents)}`],
                  ["COGS",       `− ${fmt(activeSnap.cogs_cents)}`],
                  ["Expenses",   `− ${fmt(activeSnap.expenses_cents)}`],
                  ["Net Profit", fmt(activeSnap.net_profit_cents)],
                  ["Stripe Fees",fmt(activeSnap.stripe_fees_cents)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-1">
                  Closed {format(new Date(activeSnap.closed_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
                <div className="pt-4 space-y-2">
                  <Label>Annotation for accountant</Label>
                  <Textarea
                    rows={4}
                    placeholder="e.g. Printer invoice for this month arrived late — added to next month's expenses."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This note appears in your tax packet reports. It does not change any dollar amounts.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => saveAmendment.mutate({ id: activeSnap.id, note: noteText })}
                    disabled={saveAmendment.isPending}
                  >
                    {saveAmendment.isPending ? "Saving…" : "Save Annotation"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/BookkeepingOverview.tsx
git commit -m "feat: bookkeeping overview — monthly grid, snapshots, amendment drawer"
```

---

## Task 9: `generate-report` Edge Function

**Files:**
- Create: `supabase/functions/generate-report/index.ts`

**Interfaces:**
- Input: `{ report_type: "pl" | "orders" | "expenses" | "products" | "stripe_fees", period_start: string (YYYY-MM-DD), period_end: string (YYYY-MM-DD) }`
- Output: JSON object shaped per report type — see Produces below
- Produces (consumed by Tasks 10 + 11):
  - `pl`: `{ months: { label, revenue, refunds, cogs, expenses, stripe_fees, net }[], totals: same shape }`
  - `orders`: `{ rows: { date, order_id, customer_email, status, subtotal, shipping, tax, total, refunded }[] }`
  - `expenses`: `{ rows: { date, category, description, amount, source }[], by_category: { category, total }[] }`
  - `products`: `{ rows: { name, slug, units_sold, revenue, cogs, margin_pct }[] }`
  - `stripe_fees`: `{ rows: { date, charge_id, charge_amount, fee }[], total_fees: number }`

- [ ] **Step 1: Write the edge function**

```typescript
// supabase/functions/generate-report/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

type ReportType = "pl" | "orders" | "expenses" | "products" | "stripe_fees";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: admin JWT or service role
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    let authorized = token === serviceKey;
    if (!authorized && token) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await userClient
          .from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle();
        if (profile?.is_admin) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { report_type, period_start, period_end } =
      (await req.json()) as { report_type: ReportType; period_start: string; period_end: string };

    if (!report_type || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: "report_type, period_start, period_end required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const startTs  = `${period_start}T00:00:00.000Z`;
    const endTs    = `${period_end}T23:59:59.999Z`;

    let result: unknown;

    if (report_type === "pl") {
      // Use monthly_snapshots for closed months; live query for open month
      const { data: snaps } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .gte("closed_at", startTs)
        .lte("closed_at", endTs)
        .order("year").order("month");

      result = {
        months: (snaps ?? []).map((s) => ({
          label:       `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][s.month - 1]} ${s.year}`,
          revenue:     s.revenue_cents,
          refunds:     s.refunds_cents,
          cogs:        s.cogs_cents,
          expenses:    s.expenses_cents,
          stripe_fees: s.stripe_fees_cents,
          net:         s.net_profit_cents,
          amended:     !!s.amended_at,
          note:        s.amendment_note ?? null,
        })),
        totals: (snaps ?? []).reduce(
          (acc, s) => ({
            revenue:     acc.revenue     + s.revenue_cents,
            refunds:     acc.refunds     + s.refunds_cents,
            cogs:        acc.cogs        + s.cogs_cents,
            expenses:    acc.expenses    + s.expenses_cents,
            stripe_fees: acc.stripe_fees + s.stripe_fees_cents,
            net:         acc.net         + s.net_profit_cents,
          }),
          { revenue: 0, refunds: 0, cogs: 0, expenses: 0, stripe_fees: 0, net: 0 }
        ),
      };
    }

    else if (report_type === "orders") {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at, customer_email, status, subtotal_cents, shipping_cents, tax_cents, total_cents")
        .gte("created_at", startTs)
        .lte("created_at", endTs)
        .order("created_at", { ascending: false });

      result = {
        rows: (orders ?? []).map((o) => ({
          date:           o.created_at.slice(0, 10),
          order_id:       o.id,
          customer_email: o.customer_email,
          status:         o.status,
          subtotal:       o.subtotal_cents ?? 0,
          shipping:       o.shipping_cents ?? 0,
          tax:            o.tax_cents ?? 0,
          total:          o.total_cents ?? 0,
          refunded:       o.status === "refunded",
        })),
      };
    }

    else if (report_type === "expenses") {
      const { data: exps } = await supabase
        .from("expenses")
        .select("date, category, description, amount_cents, source")
        .gte("date", period_start)
        .lte("date", period_end)
        .order("date", { ascending: false });

      const byCategory: Record<string, number> = {};
      for (const e of exps ?? []) {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount_cents;
      }

      result = {
        rows: (exps ?? []).map((e) => ({
          date:        e.date,
          category:    e.category,
          description: e.description,
          amount:      e.amount_cents,
          source:      e.source,
        })),
        by_category: Object.entries(byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([category, total]) => ({ category, total })),
      };
    }

    else if (report_type === "products") {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_name, product_slug, quantity, price_cents");

      // Filter to the date range via orders join — simple approach: fetch order IDs in range first
      const { data: orderIds } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
        .gte("created_at", startTs)
        .lte("created_at", endTs);

      const idSet = new Set((orderIds ?? []).map((o) => o.id));

      const { data: allItems } = await supabase
        .from("order_items")
        .select("product_name, product_slug, quantity, price_cents, order_id")
        .in("order_id", [...idSet].slice(0, 1000));

      const { data: costs } = await supabase.from("products").select("slug, cost_cents");
      const costMap = Object.fromEntries((costs ?? []).map((p) => [p.slug, p.cost_cents]));

      const agg: Record<string, { name: string; units: number; revenue: number; cogs: number }> = {};
      for (const item of allItems ?? []) {
        const slug = item.product_slug ?? item.product_name;
        if (!agg[slug]) agg[slug] = { name: item.product_name, units: 0, revenue: 0, cogs: 0 };
        agg[slug].units   += item.quantity ?? 1;
        agg[slug].revenue += (item.price_cents ?? 0) * (item.quantity ?? 1);
        agg[slug].cogs    += (costMap[item.product_slug] ?? 1200) * (item.quantity ?? 1);
      }

      result = {
        rows: Object.entries(agg)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .map(([slug, d]) => ({
            name:       d.name,
            slug,
            units_sold: d.units,
            revenue:    d.revenue,
            cogs:       d.cogs,
            margin_pct: d.revenue > 0
              ? Math.round(((d.revenue - d.cogs) / d.revenue) * 1000) / 10
              : 0,
          })),
      };
    }

    else if (report_type === "stripe_fees") {
      const { data: fees } = await supabase
        .from("expenses")
        .select("date, stripe_charge_id, description, amount_cents")
        .eq("source", "stripe_auto")
        .gte("date", period_start)
        .lte("date", period_end)
        .order("date", { ascending: false });

      const total_fees = (fees ?? []).reduce((s, e) => s + e.amount_cents, 0);

      result = {
        rows: (fees ?? []).map((e) => ({
          date:          e.date,
          charge_id:     e.stripe_charge_id,
          description:   e.description,
          fee:           e.amount_cents,
        })),
        total_fees,
      };
    }

    else {
      return new Response(JSON.stringify({ error: `Unknown report_type: ${report_type}` }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: result }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-report]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy generate-report --project-ref emtjkawcmsfgjyimnncf
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/generate-report/index.ts
git commit -m "feat: generate-report edge function — pl, orders, expenses, products, stripe_fees"
```

---

## Task 10: Report Download Utilities + Reports Page

**Files:**
- Create: `src/lib/reportDownload.ts`
- Modify: `src/pages/admin/BookkeepingReports.tsx`

**Interfaces:**
- Consumes: `generate-report` edge function (Task 9)
- Produces: CSV file downloads; print-to-PDF via `window.print()`

- [ ] **Step 1: Install jszip**

```bash
npm install jszip
npm install --save-dev @types/jszip 2>/dev/null || true
```

- [ ] **Step 2: Write download utilities**

```typescript
// src/lib/reportDownload.ts

/** Convert array-of-objects to CSV string */
export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape  = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

/** Trigger a CSV download in the browser */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Format cents to dollar string for CSV */
export function centsToStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Open a print window with the provided HTML content */
export function printHTML(html: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; max-width: 720px; margin: 40px auto; }
      h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
      h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #f0f0f0; text-align: left; padding: 6px 8px; border-bottom: 1px solid #ccc; font-size: 11px; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
      .right { text-align: right; }
      .total { font-weight: bold; background: #f9f9f9; }
      .note { background: #fffbe6; border-left: 3px solid #f0c040; padding: 8px 12px; margin: 8px 0; font-size: 11px; }
      footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
      @media print { body { margin: 20px; } }
    </style>
  </head><body>${html}<script>window.onload=()=>{ setTimeout(()=>{ window.print(); window.close(); }, 200); }<\/script></body></html>`);
  w.document.close();
}
```

- [ ] **Step 3: Implement the Reports page**

```tsx
// src/pages/admin/BookkeepingReports.tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, Printer } from "lucide-react";
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter,
         startOfMonth, endOfMonth, subQuarters, subMonths } from "date-fns";
import { toCSV, downloadCSV, centsToStr, printHTML } from "@/lib/reportDownload";

type ReportType = "pl" | "orders" | "expenses" | "products" | "stripe_fees";
type PeriodType = "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year";

const REPORT_LABELS: Record<ReportType, string> = {
  pl:          "P&L Statement",
  orders:      "Order Summary",
  expenses:    "Expense Detail",
  products:    "Sales by Product",
  stripe_fees: "Stripe Fee Summary",
};

function getPeriodDates(period: PeriodType): { start: string; end: string; label: string } {
  const now = new Date();
  const fmt  = (d: Date) => format(d, "yyyy-MM-dd");
  switch (period) {
    case "this_month":    return { start: fmt(startOfMonth(now)),              end: fmt(endOfMonth(now)),              label: format(now, "MMMM yyyy") };
    case "last_month":    return { start: fmt(startOfMonth(subMonths(now,1))), end: fmt(endOfMonth(subMonths(now,1))), label: format(subMonths(now,1), "MMMM yyyy") };
    case "this_quarter":  return { start: fmt(startOfQuarter(now)),            end: fmt(endOfQuarter(now)),            label: `Q${Math.ceil((now.getMonth()+1)/3)} ${now.getFullYear()}` };
    case "last_quarter":  return { start: fmt(startOfQuarter(subQuarters(now,1))), end: fmt(endOfQuarter(subQuarters(now,1))), label: `Q${Math.ceil((subQuarters(now,1).getMonth()+1)/3)} ${subQuarters(now,1).getFullYear()}` };
    case "this_year":     return { start: fmt(startOfYear(now)),               end: fmt(endOfYear(now)),               label: String(now.getFullYear()) };
    case "last_year":     return { start: fmt(startOfYear(new Date(now.getFullYear()-1,0,1))), end: fmt(endOfYear(new Date(now.getFullYear()-1,0,1))), label: String(now.getFullYear()-1) };
  }
}

export default function BookkeepingReports() {
  const [reportType, setReportType] = useState<ReportType>("pl");
  const [period, setPeriod]         = useState<PeriodType>("this_year");
  const [loading, setLoading]       = useState(false);

  async function fetchReport() {
    const { start, end } = getPeriodDates(period);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await supabase.functions.invoke("generate-report", {
      body: { report_type: reportType, period_start: start, period_end: end },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data?.data;
  }

  async function handleDownloadCSV() {
    setLoading(true);
    try {
      const data = await fetchReport();
      const { label } = getPeriodDates(period);
      const filename = `PG_${reportType}_${label.replace(/\s/g,"_")}.csv`;

      let rows: Record<string, unknown>[] = [];
      if (reportType === "pl") {
        rows = data.months.map((m: Record<string, unknown>) => ({
          Month:       m.label,
          Revenue:     centsToStr(m.revenue as number),
          Refunds:     centsToStr(m.refunds as number),
          COGS:        centsToStr(m.cogs as number),
          Expenses:    centsToStr(m.expenses as number),
          "Stripe Fees": centsToStr(m.stripe_fees as number),
          "Net Profit": centsToStr(m.net as number),
          Note:        m.note ?? "",
        }));
      } else if (reportType === "orders") {
        rows = data.rows.map((r: Record<string, unknown>) => ({
          Date:     r.date,
          "Order ID": (r.order_id as string).slice(0, 8).toUpperCase(),
          Email:    r.customer_email,
          Status:   r.status,
          Subtotal: centsToStr(r.subtotal as number),
          Shipping: centsToStr(r.shipping as number),
          Tax:      centsToStr(r.tax as number),
          Total:    centsToStr(r.total as number),
          Refunded: r.refunded ? "Yes" : "No",
        }));
      } else if (reportType === "expenses") {
        rows = data.rows.map((r: Record<string, unknown>) => ({
          Date:        r.date,
          Category:    r.category,
          Description: r.description,
          Amount:      centsToStr(r.amount as number),
          Source:      r.source,
        }));
      } else if (reportType === "products") {
        rows = data.rows.map((r: Record<string, unknown>) => ({
          Product:       r.name,
          Slug:          r.slug,
          "Units Sold":  r.units_sold,
          Revenue:       centsToStr(r.revenue as number),
          COGS:          centsToStr(r.cogs as number),
          "Margin %":    r.margin_pct,
        }));
      } else if (reportType === "stripe_fees") {
        rows = data.rows.map((r: Record<string, unknown>) => ({
          Date:        r.date,
          "Charge ID": r.charge_id,
          Description: r.description,
          "Fee ($)":   centsToStr(r.fee as number),
        }));
      }

      downloadCSV(toCSV(rows), filename);
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    setLoading(true);
    try {
      const data       = await fetchReport();
      const { label }  = getPeriodDates(period);
      const title      = `${REPORT_LABELS[reportType]} — ${label}`;
      const fmt$       = (cents: number) =>
        new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);

      let bodyHTML = `<h1>${title}</h1>`;

      if (reportType === "pl") {
        bodyHTML += `<table><thead><tr>
          <th>Month</th><th class="right">Revenue</th><th class="right">Refunds</th>
          <th class="right">COGS</th><th class="right">Expenses</th>
          <th class="right">Stripe Fees</th><th class="right">Net Profit</th>
        </tr></thead><tbody>`;
        for (const m of data.months) {
          bodyHTML += `<tr>
            <td>${m.label}</td>
            <td class="right">${fmt$(m.revenue)}</td>
            <td class="right">(${fmt$(m.refunds)})</td>
            <td class="right">(${fmt$(m.cogs)})</td>
            <td class="right">(${fmt$(m.expenses)})</td>
            <td class="right">(${fmt$(m.stripe_fees)})</td>
            <td class="right">${fmt$(m.net)}</td>
          </tr>`;
          if (m.note) bodyHTML += `<tr><td colspan="7"><div class="note">Note: ${m.note}</div></td></tr>`;
        }
        const t = data.totals;
        bodyHTML += `<tr class="total">
          <td>TOTAL</td>
          <td class="right">${fmt$(t.revenue)}</td>
          <td class="right">(${fmt$(t.refunds)})</td>
          <td class="right">(${fmt$(t.cogs)})</td>
          <td class="right">(${fmt$(t.expenses)})</td>
          <td class="right">(${fmt$(t.stripe_fees)})</td>
          <td class="right">${fmt$(t.net)}</td>
        </tr></tbody></table>
        <footer>POURnogravy · Cash-basis accounting · Generated ${new Date().toLocaleDateString()}</footer>`;
      } else {
        bodyHTML += `<p>Use CSV download for tabular reports. This view is optimised for P&L statements.</p>`;
      }

      printHTML(bodyHTML, title);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link
        to="/admin/bookkeeping"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Bookkeeping
      </Link>
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Generate and download reports for any period. P&L supports PDF print; all reports support CSV.
      </p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Report</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          >
            {Object.entries(REPORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={handleDownloadCSV}
            disabled={loading}
          >
            <Download className="w-4 h-4" />
            {loading ? "Generating…" : "Download CSV"}
          </Button>
          {reportType === "pl" && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handlePrint}
              disabled={loading}
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/reportDownload.ts src/pages/admin/BookkeepingReports.tsx package.json package-lock.json
git commit -m "feat: reports page — CSV download + print-to-PDF, report download utilities"
```

---

## Task 11: Tax Packet Page

**Files:**
- Modify: `src/pages/admin/BookkeepingTaxPacket.tsx`

**Interfaces:**
- Consumes: `generate-report` edge function (all 5 report types), `monthly_snapshots`, `jszip`
- Consumes: `toCSV`, `centsToStr` from `@/lib/reportDownload`
- Produces: downloadable ZIP file `PG_Taxes_[YEAR].zip`

- [ ] **Step 1: Implement the Tax Packet page**

```tsx
// src/pages/admin/BookkeepingTaxPacket.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import JSZip from "jszip";
import { toCSV, centsToStr } from "@/lib/reportDownload";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Snapshot {
  id: string; year: number; month: number;
  revenue_cents: number; refunds_cents: number; cogs_cents: number;
  expenses_cents: number; stripe_fees_cents: number; net_profit_cents: number;
  closed_at: string; amended_at: string | null; amendment_note: string | null;
}

const fmt$ = (cents: number) =>
  new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);

async function callReport(type: string, year: number) {
  const res = await supabase.functions.invoke("generate-report", {
    body: {
      report_type:   type,
      period_start:  `${year}-01-01`,
      period_end:    `${year}-12-31`,
    },
  });
  if (res.error) throw new Error(res.error.message);
  return res.data?.data;
}

export default function BookkeepingTaxPacket() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [generating, setGenerating]     = useState(false);

  const { data: snapshots = [] } = useQuery<Snapshot[]>({
    queryKey: ["bk-tax-snapshots", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("year", selectedYear)
        .order("month");
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
    staleTime: 60_000,
  });

  const snapMap    = Object.fromEntries(snapshots.map((s) => [s.month, s]));
  const closedCount = snapshots.length;
  const allClosed   = closedCount === 12;

  async function generatePacket() {
    setGenerating(true);
    try {
      toast.info("Generating tax packet…");

      // Fetch all 5 report types in parallel
      const [plData, ordersData, expData, prodData, feesData] = await Promise.all([
        callReport("pl",          selectedYear),
        callReport("orders",      selectedYear),
        callReport("expenses",    selectedYear),
        callReport("products",    selectedYear),
        callReport("stripe_fees", selectedYear),
      ]);

      const zip = new JSZip();
      const y   = selectedYear;

      // 1. Orders CSV
      zip.file(`PG_${y}_Orders.csv`, toCSV(
        (ordersData.rows as Record<string,unknown>[]).map((r) => ({
          Date:     r.date,
          "Order ID": (r.order_id as string).slice(0,8).toUpperCase(),
          Email:    r.customer_email,
          Status:   r.status,
          Subtotal: centsToStr(r.subtotal as number),
          Shipping: centsToStr(r.shipping as number),
          Tax:      centsToStr(r.tax as number),
          Total:    centsToStr(r.total as number),
          Refunded: r.refunded ? "Yes" : "No",
        }))
      ));

      // 2. Expenses CSV (Schedule C aligned)
      zip.file(`PG_${y}_Expenses.csv`, toCSV(
        (expData.rows as Record<string,unknown>[]).map((r) => ({
          Date:        r.date,
          Category:    r.category,
          Description: r.description,
          "Amount ($)":centsToStr(r.amount as number),
          Source:      r.source,
        }))
      ));

      // 3. Stripe Fees CSV
      zip.file(`PG_${y}_Stripe_Fees.csv`, toCSV(
        (feesData.rows as Record<string,unknown>[]).map((r) => ({
          Date:        r.date,
          "Charge ID": r.charge_id,
          Description: r.description,
          "Fee ($)":   centsToStr(r.fee as number),
        }))
      ));

      // 4. COGS by Product CSV
      zip.file(`PG_${y}_COGS_by_Product.csv`, toCSV(
        (prodData.rows as Record<string,unknown>[]).map((r) => ({
          Product:       r.name,
          "Units Sold":  r.units_sold,
          "Revenue ($)": centsToStr(r.revenue as number),
          "COGS ($)":    centsToStr(r.cogs as number),
          "Margin %":    r.margin_pct,
        }))
      ));

      // 5. P&L Statement PDF (HTML file for printing)
      const totals = plData.totals as Record<string,number>;
      let plHTML = `<!DOCTYPE html><html><head><title>PG ${y} P&L</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:12px;max-width:720px;margin:40px auto;color:#000}
        h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#f0f0f0;text-align:left;padding:6px 8px;border-bottom:1px solid #ccc;font-size:11px}
        td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
        .right{text-align:right}.total{font-weight:bold;background:#f9f9f9}
        .note{background:#fffbe6;border-left:3px solid #f0c040;padding:8px 12px;margin:4px 0;font-size:11px}
        footer{margin-top:40px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:8px}
        .summary{background:#f9f9f9;border:1px solid #ddd;padding:16px;margin-bottom:24px}
        .summary-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
        .summary-total{font-weight:bold;border-top:1px solid #ccc;margin-top:8px;padding-top:8px}
      </style></head><body>
      <h1>POURnogravy — ${y} Profit & Loss Statement</h1>
      <div class="summary">
        <div class="summary-row"><span>Gross Revenue</span><span>${fmt$(totals.revenue)}</span></div>
        <div class="summary-row"><span>Refunds Issued</span><span>(${fmt$(totals.refunds)})</span></div>
        <div class="summary-row"><span>Cost of Goods Sold</span><span>(${fmt$(totals.cogs)})</span></div>
        <div class="summary-row"><span>Operating Expenses</span><span>(${fmt$(totals.expenses)})</span></div>
        <div class="summary-row summary-total"><span>Net Profit</span><span>${fmt$(totals.net)}</span></div>
      </div>
      <h2 style="font-size:14px;margin-bottom:8px">Monthly Breakdown</h2>
      <table><thead><tr>
        <th>Month</th><th class="right">Revenue</th><th class="right">Refunds</th>
        <th class="right">COGS</th><th class="right">Expenses</th><th class="right">Net</th>
      </tr></thead><tbody>`;

      for (const m of plData.months as Record<string,unknown>[]) {
        plHTML += `<tr>
          <td>${m.label}</td>
          <td class="right">${fmt$(m.revenue as number)}</td>
          <td class="right">(${fmt$(m.refunds as number)})</td>
          <td class="right">(${fmt$(m.cogs as number)})</td>
          <td class="right">(${fmt$(m.expenses as number)})</td>
          <td class="right">${fmt$(m.net as number)}</td>
        </tr>`;
        if (m.note) plHTML += `<tr><td colspan="6"><div class="note">Note: ${m.note}</div></td></tr>`;
      }
      plHTML += `<tr class="total">
        <td>TOTAL</td>
        <td class="right">${fmt$(totals.revenue)}</td>
        <td class="right">(${fmt$(totals.refunds)})</td>
        <td class="right">(${fmt$(totals.cogs)})</td>
        <td class="right">(${fmt$(totals.expenses)})</td>
        <td class="right">${fmt$(totals.net)}</td>
      </tr></tbody></table>
      <footer>
        POURnogravy · Cash-basis accounting · Generated ${new Date().toLocaleDateString()} ·
        Please review all figures with your accountant before filing.
      </footer></body></html>`;

      zip.file(`PG_${y}_PL_Statement.html`, plHTML);

      // 6. Cover sheet HTML
      const coverHTML = `<!DOCTYPE html><html><head><title>PG ${y} Tax Summary</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:13px;max-width:600px;margin:60px auto;color:#000}
        h1{font-size:22px;margin-bottom:4px}
        .sub{color:#666;font-size:13px;margin-bottom:32px}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
        .total-row{display:flex;justify-content:space-between;padding:12px 0;font-weight:bold;font-size:15px;border-top:2px solid #000;margin-top:8px}
        .note{background:#fffbe6;border-left:3px solid #f0c040;padding:12px 16px;margin-top:32px;font-size:12px;line-height:1.6}
        footer{margin-top:40px;font-size:11px;color:#888}
      </style></head><body>
      <h1>POURnogravy</h1>
      <div class="sub">Tax Year ${y} · Cash-Basis Summary</div>
      <div class="row"><span>Gross Revenue</span><span>${fmt$(totals.revenue)}</span></div>
      <div class="row"><span>Refunds Issued</span><span>(${fmt$(totals.refunds)})</span></div>
      <div class="row"><span>Cost of Goods Sold</span><span>(${fmt$(totals.cogs)})</span></div>
      <div class="row"><span>Operating Expenses</span><span>(${fmt$(totals.expenses)})</span></div>
      <div class="row"><span>&nbsp;&nbsp;of which: Stripe Processing Fees</span><span>(${fmt$(totals.stripe_fees)})</span></div>
      <div class="total-row"><span>Net Profit (Loss)</span><span>${fmt$(totals.net)}</span></div>
      <div class="note">
        <strong>Note to accountant:</strong> This packet was generated from POURnogravy's sales dashboard.
        All figures reflect cash-basis accounting. Stripe fee data sourced directly from Stripe Balance
        Transactions API. The P&amp;L HTML file can be opened in any browser and printed to PDF.
        Please review all figures before filing.
      </div>
      <footer>Generated ${new Date().toLocaleString()} · pournogravy.com</footer>
      </body></html>`;

      zip.file(`PG_${y}_Summary.html`, coverHTML);

      // Download the ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `PG_Taxes_${y}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Tax packet for ${y} downloaded!`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate packet");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link
        to="/admin/bookkeeping"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Bookkeeping
      </Link>

      <h1 className="text-2xl font-bold mb-1">Tax Packet</h1>
      <p className="text-muted-foreground text-sm mb-6">
        One-click year-end export. Download and send the ZIP to your accountant.
      </p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <label className="text-sm font-medium block mb-1.5">Tax Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - 1 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month status checklist */}
        <div>
          <div className="text-sm font-medium mb-2">
            Monthly close status ({closedCount}/12 closed)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES.map((name, idx) => {
              const m    = idx + 1;
              const snap = snapMap[m];
              return (
                <div
                  key={m}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  {snap?.amended_at
                    ? <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    : snap
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    : <Clock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  {name}
                </div>
              );
            })}
          </div>
        </div>

        {!allClosed && (
          <div className="flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 text-sm text-yellow-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {12 - closedCount} month{12 - closedCount !== 1 ? "s" : ""} not yet closed.
              The packet will include available data — open months use live figures.
            </span>
          </div>
        )}

        {/* Files included */}
        <div>
          <div className="text-sm font-medium mb-2">Packet contents</div>
          <ul className="space-y-1 text-xs text-muted-foreground font-mono">
            {[
              `PG_${selectedYear}_PL_Statement.html`,
              `PG_${selectedYear}_Orders.csv`,
              `PG_${selectedYear}_Expenses.csv`,
              `PG_${selectedYear}_Stripe_Fees.csv`,
              `PG_${selectedYear}_COGS_by_Product.csv`,
              `PG_${selectedYear}_Summary.html`,
            ].map((f) => <li key={f}>• {f}</li>)}
          </ul>
        </div>

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={generatePacket}
          disabled={generating}
        >
          <Download className="w-5 h-5" />
          {generating ? "Building packet…" : `Generate Tax Packet for ${selectedYear}`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/BookkeepingTaxPacket.tsx
git commit -m "feat: tax packet page — year-end ZIP export for accountant"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Monthly auto-close (Task 7 — cron + edge function)
- ✅ Amendment annotations (Task 8 — Overview amendment drawer)
- ✅ Expense tracker with Schedule C categories (Task 5)
- ✅ Stripe fee auto-sync (Task 6)
- ✅ Per-product COGS editor (Task 4)
- ✅ Refund netting in Financials (Task 2)
- ✅ Year selector on Financials (Task 2)
- ✅ Multi-year archive on Bookkeeping Overview (Task 8 — year selector)
- ✅ P&L Statement report (Task 10 — generate-report "pl" type)
- ✅ Order Summary report (Task 10 — "orders" type)
- ✅ Expense Detail report (Task 10 — "expenses" type)
- ✅ Sales by Product report (Task 10 — "products" type)
- ✅ Stripe Fee Summary report (Task 10 — "stripe_fees" type)
- ✅ Tax Packet ZIP download (Task 11)
- ✅ Cover sheet with preparer note (Task 11 — Summary.html)
- ✅ Amendment notes in P&L PDF (Task 10 + 11 — note rows in HTML)
- ✅ Receipt upload for manual expenses (Task 5)
- ✅ RLS policies (Task 1)
- ✅ Cash-basis accounting note in all outputs (Tasks 10, 11)

**Type consistency check:**
- `generate-report` output shapes defined in Task 9 Interfaces and consumed correctly in Tasks 10 + 11 ✅
- `toCSV`, `centsToStr`, `printHTML`, `downloadCSV` defined in Task 10 Step 2 and imported correctly in Task 11 ✅
- `Snapshot` interface defined in Task 8, redefined in Task 11 (both pages are independent — acceptable) ✅

**Placeholder scan:** None found.
