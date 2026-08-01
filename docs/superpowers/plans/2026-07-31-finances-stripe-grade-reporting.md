# Finances — Stripe-Grade Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/admin/finances` up to par with small-business bookkeeping and Stripe's own reporting — reorganized tabs, all orphaned pages wired, a unified report engine with on-screen + CSV/PDF output, five new reports (sales tax, top customers, refunds & disputes, payout reconciliation, tax estimate), a real-COGS fix, and Stripe Tax collection on the custom checkout.

**Architecture:** One extended `generate-report` edge function computes structured results and serializes to `json` (on-screen) / `csv` / `html` (PDF). The Finances page becomes a 7-tab container wiring the already-built pages. Sales tax is collected via the Stripe **Tax Calculation API** with a server round-trip on the custom PaymentIntent checkout (not `automatic_tax`). Payout reconciliation and disputes are fetched on-demand from Stripe; everything else reads local Supabase tables.

**Tech Stack:** React + TS + Vite + Tailwind + shadcn/ui + Framer Motion + `recharts@^2.15.4` (frontend); Supabase (Postgres, RLS, Deno edge functions); Stripe (`stripe@14.21.0` in edge fns, API `2024-06-20`); `@tanstack/react-query`; `date-fns`; `jszip`.

## Global Constraints

- **Money is integer cents** everywhere; format with `Intl.NumberFormat` (`fmt(cents)` = `cents/100`).
- **Supabase singleton:** import `supabase` from `@/integrations/supabase/client` — never the dead `src/utils/supabase/`.
- **No DB mocks in tests** — use the real Supabase project (project rule).
- **Auth in edge fns:** admin JWT *or* service-role key; copy the exact auth block from `generate-report/index.ts`.
- **Edge fns can't import frontend code** — duplicate small helpers.
- **RLS:** admins read `monthly_snapshots`/`expenses`; only `source='manual'` expenses are admin-writable; `stripe_auto` rows are service-role only.
- **Never blind-`UPDATE` editable `site_content`** via migration (unrelated table here, but the rule stands).
- **Migrations** live in `supabase/migrations/` named `YYYYMMDDHHMMSS_<name>.sql`, additive/idempotent (`ADD COLUMN IF NOT EXISTS`).
- **Tax changes are gated:** verify in Stripe **test mode**; do NOT enable on live checkout without explicit owner go-ahead. Guard behind a `settings.tax_enabled` flag (default `false`).
- **Branch:** `feat/finances-stripe-grade-reporting`. Commit after every task.
- **Commit trailer:** `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Phase 0 — Data model & COGS truth (backend foundation)

### Task 1: Migration — tax + snapshot columns

**Files:**
- Create: `supabase/migrations/20260731000000_finances_tax_columns.sql`

**Interfaces:**
- Produces: `orders.tax_cents int` (default 0), `orders.stripe_tax_calculation_id text`, `monthly_snapshots.tax_collected_cents int` (default 0). Consumed by Tasks 2, 9, 13–16.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260731000000_finances_tax_columns.sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_cents int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_tax_calculation_id text;

ALTER TABLE public.monthly_snapshots
  ADD COLUMN IF NOT EXISTS tax_collected_cents int NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Apply via Supabase MCP** — `apply_migration` with name `finances_tax_columns` and the SQL above. Expected: success, no error.

- [ ] **Step 3: Verify** — `execute_sql`: `select column_name from information_schema.columns where table_name='orders' and column_name in ('tax_cents','stripe_tax_calculation_id');` Expected: 2 rows.

- [ ] **Step 4: Regenerate types** — `generate_typescript_types`, write into `src/lib/database.types.ts` (only if the project keeps it in sync; otherwise skip and note the columns are accessed via `as any` like existing code does for `shipping_addresses`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260731000000_finances_tax_columns.sql src/lib/database.types.ts
git commit -m "feat(finances): add orders.tax_cents + calc id + snapshots.tax_collected_cents"
```

### Task 2: Fix Overview COGS to per-product cost

`close-month` and `generate-report` already use `quantity × products.cost_cents` (fallback 1200). Only `Financials.tsx` uses the flat constant. Align it.

**Files:**
- Modify: `src/pages/admin/Financials.tsx` (the `useFinancialsData` hook + live COGS math ~L124-288)

**Interfaces:**
- Consumes: `order_items(order_id, product_id, quantity)`, `products(id, cost_cents)`.
- Produces: live `printCogsLive` computed from real per-product cost.

- [ ] **Step 1: Extend the items query** to include `product_id`, and add a products-cost query.

```tsx
// in useFinancialsData: items query select becomes:
.select("order_id, product_id, quantity")
// add after items load:
const productIds = [...new Set((items ?? []).map(i => i.product_id).filter(Boolean))];
const { data: productCosts } = useQuery<{ id: string; cost_cents: number }[]>({
  queryKey: ["financials-product-costs", productIds.join(",")],
  enabled: productIds.length > 0,
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("id, cost_cents").in("id", productIds);
    if (error) throw error;
    return (data ?? []) as { id: string; cost_cents: number }[];
  },
  staleTime: 60_000,
});
```

- [ ] **Step 2: Replace the flat-cost math.** Build a `costByProduct` map (fallback `1200`) and compute per-order COGS as `Σ quantity × cost`. Replace `PRINT_COST_PER_ITEM_CENTS` usages in `printCogsLive` and the per-row order table with the map. Keep `PRINT_COST_PER_ITEM_CENTS = 1200` only as the fallback constant.

```tsx
const costByProduct = new Map<string, number>();
for (const p of (productCosts ?? [])) costByProduct.set(p.id, p.cost_cents ?? 1200);
const cogsForOrder = (orderId: string) =>
  items.filter(it => it.order_id === orderId)
       .reduce((s, it) => s + (it.quantity ?? 0) * (costByProduct.get(it.product_id ?? "") ?? 1200), 0);
const printCogsLive = paidOrders.reduce((s, o) => s + cogsForOrder(o.id), 0);
```
Update the YTD order-table row to use `cogsForOrder(order.id)` instead of `itemCount × PRINT_COST_PER_ITEM_CENTS`.

- [ ] **Step 3: Verify build** — `npm run build`. Expected: exit 0, no TS errors.

- [ ] **Step 4: Verify in app** — load `/admin/finances`, Overview: Print COGS now reflects per-product cost (change a product's cost on the Products tab later and confirm it moves).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Financials.tsx
git commit -m "fix(finances): Overview P&L uses per-product cost_cents, not flat \$12"
```

---

## Phase 1 — Report engine: structured JSON output

### Task 3: `generate-report` returns `json` + shared result shape

**Files:**
- Modify: `supabase/functions/generate-report/index.ts`

**Interfaces:**
- Produces: when `format:"json"`, returns `application/json`:
  `{ title:string, period:{start,end}, columns:string[], rows:string[][], totals:Record<string,string>, notes:string[] }`.
  `csv`/`html` unchanged. Consumed by Task 10 (Reports UI) and Task 11 (Tax Packet).

- [ ] **Step 1: Add `json` to the format union + validation.** `type ReportFormat = "csv"|"html"|"json";` and add `"json"` to `validFormats`.

- [ ] **Step 2: Compute a `totals` row per report** where meaningful (sum of numeric money columns). Add a helper:

```ts
function sumColumn(rows: string[][], colIndex: number): number {
  return rows.reduce((s, r) => {
    const n = Number((r[colIndex] ?? "").replace(/[$,()]/g, "")) || 0;
    return s + n;
  }, 0);
}
```
For each existing report, after building `rows`, build a `totals` object (e.g. P&L: `{ "Net Profit": cents(sumCents...) }`). Keep it simple: total the last money column.

- [ ] **Step 3: Add the `json` serializer branch** before the `csv`/`html` branches:

```ts
if (format === "json") {
  return new Response(JSON.stringify({ title, period: { start: period_start, end: period_end }, columns: headers, rows, totals, notes }), {
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
```
Declare `let totals: Record<string,string> = {}; let notes: string[] = [];` near `let headers`/`rows`, and set them inside each report block.

- [ ] **Step 4: Deploy** — Supabase MCP `deploy_edge_function` name `generate-report`.

- [ ] **Step 5: Smoke test** — from the app or `supabase.functions.invoke("generate-report", { body:{ report_type:"pl_statement", period_start:"2026-01-01", period_end:"2026-12-31", format:"json" }})`. Expected: JSON with `columns`, `rows`, `totals`.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/generate-report/index.ts
git commit -m "feat(reports): generate-report emits structured json for on-screen rendering"
```

---

## Phase 2 — New report types (backend)

Each new report is added inside `generate-report` as another `report_type` branch, then exposed in the UI in Phase 3. Add each to the `ReportType` union + `validTypes`.

### Task 4: Sales Tax Collected report

**Files:**
- Modify: `supabase/functions/generate-report/index.ts`

**Interfaces:**
- Produces: `report_type:"sales_tax"` → columns `["State","Orders","Taxable Sales","Tax Collected"]`, grouped by ship-to state from `orders.shipping_address` for paid orders in range.

- [ ] **Step 1: Add the branch.**

```ts
else if (report_type === "sales_tax") {
  title = "Sales Tax Collected";
  headers = ["State", "Orders", "Taxable Sales", "Tax Collected"];
  const { data: orders, error } = await supabase
    .from("orders")
    .select("shipping_address, subtotal_cents, tax_cents, status")
    .in("status", ["paid","in_production","fulfilled","shipped","delivered"])
    .eq("is_test", false)
    .gte("created_at", startTs).lt("created_at", endTsExcl);
  if (error) throw new Error(`Sales tax query failed: ${error.message}`);
  const byState: Record<string, { orders: number; sales: number; tax: number }> = {};
  for (const o of orders ?? []) {
    const addr = (o.shipping_address ?? {}) as any;
    const st = String(addr?.address?.state ?? addr?.state ?? "—").toUpperCase();
    if (!byState[st]) byState[st] = { orders: 0, sales: 0, tax: 0 };
    byState[st].orders++; byState[st].sales += o.subtotal_cents ?? 0; byState[st].tax += o.tax_cents ?? 0;
  }
  rows = Object.entries(byState).sort((a,b) => b[1].tax - a[1].tax)
    .map(([st,d]) => [st, String(d.orders), cents(d.sales), cents(d.tax)]);
  totals = { "Tax Collected": cents(sumColumn(rows, 3) * 100) };
  notes = ["Tax is remitted per-state. File with each state where you have nexus.",
           "Zero until Stripe Tax collection is enabled on checkout."];
}
```

- [ ] **Step 2: Add `"sales_tax"` to `ReportType` + `validTypes`.**
- [ ] **Step 3: Deploy + smoke test** (`format:"json"`). Expected: JSON (empty rows OK today).
- [ ] **Step 4: Commit** — `feat(reports): sales tax collected by state`.

### Task 5: Top Customers report

**Files:** Modify `supabase/functions/generate-report/index.ts`

**Interfaces:** `report_type:"top_customers"` → `["Customer","Orders","Total Spent","Avg Order","Last Order"]`, grouped by `orders.email`.

- [ ] **Step 1: Add branch** — query paid orders `email, total_cents, shipping_cents, created_at`; group by email; compute count, sum(total−shipping), avg, max(created_at); sort by total desc; limit 100 rows. `totals = { "Total Spent": cents(...) }`.
- [ ] **Step 2: Register type + validate.**
- [ ] **Step 3: Deploy + smoke test.**
- [ ] **Step 4: Commit** — `feat(reports): top customers / LTV`.

### Task 6: Refunds & Disputes report (Stripe)

**Files:** Modify `supabase/functions/generate-report/index.ts`

**Interfaces:** `report_type:"refunds_disputes"` → `["Date","Type","Order/Charge","Amount","Reason/Status"]`. Refunds from local `orders` (status `refunded`); disputes from Stripe `GET /v1/disputes` filtered to range. Needs `STRIPE_SECRET_KEY` (add `const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")` guard).

- [ ] **Step 1: Add branch.** Fetch refunded/disputed orders in range → rows tagged `Refund`. Then `fetch("https://api.stripe.com/v1/disputes?limit=100&created[gte]=<unix>", { headers:{Authorization:`Bearer ${stripeKey}`}})` (or Stripe SDK) → rows tagged `Dispute` with `status`. Sort by date desc. `totals = { Amount: cents(...) }`.
- [ ] **Step 2: Register type + validate.**
- [ ] **Step 3: Deploy + smoke test** (disputes empty today; refunded test order should appear).
- [ ] **Step 4: Commit** — `feat(reports): refunds & disputes`.

### Task 7: Payout Reconciliation report (Stripe)

**Files:** Modify `supabase/functions/generate-report/index.ts`

**Interfaces:** `report_type:"payout_reconciliation"` → `["Payout Date","Status","Gross","Fees","Refunds","Net Deposit"]`. Fetch `GET /v1/payouts?limit=100&arrival_date[gte]/[lte]` in range; for each payout, list its balance transactions (`GET /v1/balance_transactions?payout=<id>&limit=100`) and sum `type` groups: gross = charges (`type=charge`/`payment`), fees = Σ`fee`, refunds = `type=refund`/`payment_refund`. Net = payout `amount`.

- [ ] **Step 1: Add branch** using the Stripe SDK (`new Stripe(stripeKey,{apiVersion:"2024-06-20"})`) — `stripe.payouts.list`, then `stripe.balanceTransactions.list({ payout: p.id })`. Build one row per payout. `totals = { "Net Deposit": cents(Σ p.amount) }`. `notes = ["Net Deposit matches your bank deposit for each payout."]`.
- [ ] **Step 2: Register type + validate.**
- [ ] **Step 3: Deploy + smoke test** (one $0 payout exists — expect 1 row).
- [ ] **Step 4: Commit** — `feat(reports): stripe payout reconciliation`.

### Task 8: Tax Estimate report (moved from Overview)

**Files:**
- Create: `supabase/functions/generate-report/tax_estimate.ts` *(optional helper)* OR inline branch.
- Reference: port SE-tax + bracket logic from `src/pages/admin/Financials.tsx:16-61`.

**Interfaces:** `report_type:"tax_estimate"` → `["Line","Amount"]` rows: Net Profit, SE Tax (15.3%), SE Deduction, Taxable Income, Federal Income Tax, Total Tax, Quarterly Est. Net profit = P&L net for the period (reuse the P&L snapshot/live aggregation).

- [ ] **Step 1: Add branch** — compute net profit for the period (same source as `pl_statement`), then `calcSETax`/`calcIncomeTax` (copy the constants + fns from `Financials.tsx`). `notes = ["Estimates only — single filer, 2025 tables. Talk to a CPA."]`.
- [ ] **Step 2: Register type + validate.**
- [ ] **Step 3: Deploy + smoke test.**
- [ ] **Step 4: Commit** — `feat(reports): tax estimate report (SE + federal + quarterly)`.

---

## Phase 3 — Frontend: tabs, Reports UI, Payouts, Overview

### Task 9: Rework `Finances.tsx` tab container (new IA)

**Files:**
- Modify: `src/pages/admin/Finances.tsx`

**Interfaces:**
- Produces: 7 tabs `overview · reports · payouts · expenses · products · invoices · tax-packet`, lazy-loading the real pages (no more `PLACEHOLDER`).

- [ ] **Step 1: Replace TABS + lazy imports.**

```tsx
const OverviewPage    = lazy(() => import("./Financials"));
const ReportsPage     = lazy(() => import("./BookkeepingReports"));
const PayoutsPage     = lazy(() => import("./Payouts"));          // Task 12
const ExpensesPage    = lazy(() => import("./BookkeepingExpenses"));
const ProductsPage    = lazy(() => import("./BookkeepingProducts"));
const InvoicesPage    = lazy(() => import("./InvoiceTracker"));
const TaxPacketPage   = lazy(() => import("./BookkeepingTaxPacket"));

const TABS = [
  { id: "overview",   label: "Overview" },
  { id: "reports",    label: "Reports" },
  { id: "payouts",    label: "Payouts" },
  { id: "expenses",   label: "Expenses" },
  { id: "products",   label: "Products" },
  { id: "invoices",   label: "Invoices" },
  { id: "tax-packet", label: "Tax Packet" },
];
```
Render each tab in its own `<Suspense fallback={TAB_LOADER}>`; delete the `PLACEHOLDER` const and the `Coming soon` branches.

- [ ] **Step 2: Persist active tab in the URL** (`?tab=`) so refresh/links work — read `useSearchParams`, default `overview`.

- [ ] **Step 3: Remove dead sub-nav** in `BookkeepingOverview.tsx` (the `subNav` array + its render block, L80-114) and its `/admin/bookkeeping` back-`Link`; likewise remove the `/admin/bookkeeping` back-links in `BookkeepingExpenses.tsx`, `BookkeepingProducts.tsx`, `BookkeepingReports.tsx`, `BookkeepingTaxPacket.tsx` (they now live inside tabs).

- [ ] **Step 4: `npm run build`** — expect exit 0. Load each tab in the app; all render (Payouts will 404-import until Task 12 — do Task 12 before building, or stub `Payouts.tsx` returning `null` now).

- [ ] **Step 5: Commit** — `feat(finances): 7-tab IA, wire orphaned pages, drop dead sub-nav`.

### Task 10: Reports tab — on-screen render + export-all

**Files:**
- Modify: `src/pages/admin/BookkeepingReports.tsx`
- Create: `src/components/admin/ReportTable.tsx` (renders the json shape)

**Interfaces:**
- Consumes: `generate-report` `format:"json"` (Task 3) and the new report types (Tasks 4–8).
- `ReportTable` props: `{ data: { title; period; columns; rows; totals; notes } }`.

- [ ] **Step 1: `ReportTable.tsx`** — styled table (match `Financials.tsx` `SectionCard` look): header row from `columns`, body from `rows`, a bold totals row from `totals`, and `notes` as muted footnotes below.
- [ ] **Step 2: Expand `REPORT_LABELS`/`REPORT_TYPE_MAP`** to include `sales_tax`, `top_customers`, `refunds_disputes`, `payout_reconciliation`, `tax_estimate` (+ existing five).
- [ ] **Step 3: Add a custom date range** — two `<input type="date">` shown when period = `custom`; `getPeriodDates` returns them.
- [ ] **Step 4: Fetch + render on-screen** — on report/period change, `fetchReportRaw("json")` → `JSON.parse` → `<ReportTable>`. Keep the existing CSV + Print handlers; enable **Print/PDF for all reports** (remove the `reportType === "pl"` gate).
- [ ] **Step 5: Add a contextual chart** — for `sales_by_product` and `sales_tax`, render a small recharts `BarChart` above the table (follow the `dataviz` skill for colors/labels).
- [ ] **Step 6: `npm run build`** + drive in app: each report renders on-screen; CSV + PDF download.
- [ ] **Step 7: Commit** — `feat(reports): on-screen rendering + charts + export-all + custom range`.

### Task 11: Tax Packet — add new reports to the ZIP

**Files:** Modify `src/pages/admin/BookkeepingTaxPacket.tsx`

**Interfaces:** Consumes new report types via existing `callReport(type, year, fmt)`.

- [ ] **Step 1: Add `sales_tax` + `payout_reconciliation` CSVs** to the `Promise.all` and to the ZIP + README + packet-contents list.
- [ ] **Step 2: Build + generate a packet** in-app; confirm the ZIP contains the new files.
- [ ] **Step 3: Commit** — `feat(tax-packet): include sales tax + payout reconciliation`.

### Task 12: Payouts tab (Stripe reconciliation, on-screen)

**Files:**
- Create: `src/pages/admin/Payouts.tsx`

**Interfaces:** Consumes `generate-report` `report_type:"payout_reconciliation", format:"json"` (Task 7). Renders the payout list; each row expandable to the gross/fees/refunds/net breakdown (reuse `ReportTable` or a bespoke list). Year/period selector + CSV/PDF buttons (reuse Task 10 handlers).

- [ ] **Step 1: Build the page** — period selector → fetch json → render rows; "Net Deposit ties to your bank" note. Empty-state when no payouts.
- [ ] **Step 2: Build + drive in app** (expect the one $0 payout row).
- [ ] **Step 3: Commit** — `feat(finances): Payouts reconciliation tab`.

### Task 13: Overview dashboard rework

**Files:**
- Modify: `src/pages/admin/Financials.tsx`
- Create: `supabase/functions/stripe-balance/index.ts` (tiny: returns `GET /v1/balance` + next payout; admin/service auth like `generate-report`).

**Interfaces:** Overview shows KPI tiles (Gross Rev, Net Rev, Gross Profit + margin %, AOV, Refund rate, Orders, **Stripe balance / next payout**), a monthly revenue `recharts` chart, and the **monthly-close grid** (ported from `BookkeepingOverview.tsx`). Remove the federal tax estimator (now the `tax_estimate` report).

- [ ] **Step 1: `stripe-balance` edge fn** — copy auth block from `generate-report`; return `{ available_cents, pending_cents, next_payout: { amount, arrival_date } | null }`. Deploy.
- [ ] **Step 2: Add KPI tiles** — compute AOV (`netRevenue/orderCount`), refund rate (`refundedCount/orderCount`), margin % (`grossProfit/productRevenue`); add a Stripe balance tile fed by `stripe-balance`.
- [ ] **Step 3: Add monthly revenue chart** (recharts `BarChart`, per-month net revenue from snapshots/live) — follow `dataviz` skill.
- [ ] **Step 4: Port the monthly-close grid** from `BookkeepingOverview.tsx` (the grid + amendment `Sheet`) into an Overview section; then reduce `BookkeepingOverview.tsx` to just what `Expenses`/`close` still needs — OR retire it (Expenses tab now uses `BookkeepingExpenses`). Confirm nothing else imports `BookkeepingOverview`.
- [ ] **Step 5: Remove the tax-estimator section** (`SectionCard "Federal Tax Estimator"` + `otherIncome` state + `calc*` usage on the page).
- [ ] **Step 6: Build + drive in app** — Overview shows tiles + chart + month grid; no estimator.
- [ ] **Step 7: Commit** — `feat(finances): Overview dashboard — KPIs, revenue chart, Stripe balance, month grid`.

---

## Phase 4 — Sales tax collection (Stripe Tax Calculation API, gated)

> All of Phase 4 is verified in **Stripe test mode** and guarded by `settings.tax_enabled` (default false). Do not enable on live checkout without explicit owner go-ahead.

### Task 14: `settings.tax_enabled` flag + migration

**Files:** Create `supabase/migrations/20260731000100_tax_enabled_flag.sql`

- [ ] **Step 1:** `ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false;`
- [ ] **Step 2:** Apply via MCP + verify column exists.
- [ ] **Step 3:** Add a read-only toggle note in Admin Settings (optional) or leave DB-controlled.
- [ ] **Step 4: Commit** — `feat(tax): settings.tax_enabled gate (default off)`.

### Task 15: `calculate-tax` edge function

**Files:** Create `supabase/functions/calculate-tax/index.ts`

**Interfaces:**
- Consumes: POST `{ orderId: string, address: { line1, line2?, city, state, postal_code, country } }`.
- Produces: `{ taxCents: number, totalCents: number }`; side effects: updates the order's PaymentIntent amount, stores `stripe_tax_calculation_id` + `tax_cents` on the order.

- [ ] **Step 1: Write the function** — service-role Supabase; load order (`subtotal_cents, discount_cents, shipping_cents, stripe_payment_intent_id`); if `settings.tax_enabled` is false, return `{ taxCents: 0, totalCents: subtotal−discount+shipping }` (no-op). Else:

```ts
const calc = await stripe.tax.calculations.create({
  currency: "usd",
  line_items: [{ amount: subtotalAfterDiscount, reference: orderId, tax_behavior: "exclusive" }],
  shipping_cost: { amount: shippingCents },
  customer_details: { address: { line1, city, state, postal_code, country }, address_source: "shipping" },
});
const taxCents = calc.tax_amount_exclusive;
const totalCents = subtotalAfterDiscount + shippingCents + taxCents;
await stripe.paymentIntents.update(pi_id, { amount: totalCents });
await supabase.from("orders").update({ tax_cents: taxCents, stripe_tax_calculation_id: calc.id, total_cents: totalCents }).eq("id", orderId);
```

- [ ] **Step 2: CORS + error handling** — copy the `corsHeaders(req)` pattern from `create-checkout`.
- [ ] **Step 3: Deploy** (`verify_jwt` default; called from browser with anon — but it mutates orders, so use service-role internally; validate `orderId` belongs to a pending order).
- [ ] **Step 4: Test-mode smoke** — invoke with a RI address on a test order; expect non-zero `taxCents` when `tax_enabled=true`.
- [ ] **Step 5: Commit** — `feat(tax): calculate-tax edge fn (Tax Calculation API + PI amount update)`.

### Task 16: Checkout tax round-trip + webhook + refund reversal

**Files:**
- Modify: `src/pages/Checkout.tsx`
- Modify: `supabase/functions/stripe-webhook/index.ts`
- Modify: `supabase/functions/refund-order/index.ts`

- [ ] **Step 1: `Checkout.tsx`** — before `confirmPayment`, call `calculate-tax` with `shipAddr`; on success set `taxCents`/`serverTotal` state, render a **Sales Tax** line in the order summary, and update the Pay button total. (Also recalc when a saved address / new address becomes complete, for pre-submit display.)
- [ ] **Step 2: `stripe-webhook`** — in the `if (orderId)` block, after marking paid: if the order has `stripe_tax_calculation_id`, `stripe.tax.transactions.createFromCalculation({ calculation, reference: orderId })` and ensure `tax_cents` persisted. Wrap in the existing try-catch.
- [ ] **Step 3: `refund-order`** — after issuing the Stripe refund, if the order had tax, `stripe.tax.transactions.createReversal({ mode:"full", original_transaction, reference:`refund_${orderId}` })`.
- [ ] **Step 4: Deploy both fns; build frontend.**
- [ ] **Step 5: End-to-end test in Stripe test mode** — place a test order to a RI address with `tax_enabled=true`: tax line shows, PI amount includes tax, webhook writes `orders.tax_cents`, Sales Tax report reflects it, refund creates a reversal.
- [ ] **Step 6: Commit** — `feat(tax): checkout tax round-trip + webhook tax transaction + refund reversal`.

### Task 17: `close-month` records tax collected

**Files:** Modify `supabase/functions/close-month/index.ts`

- [ ] **Step 1:** In the month aggregation, sum `orders.tax_cents` for the month → write to the new `monthly_snapshots.tax_collected_cents`.
- [ ] **Step 2: Deploy; smoke-test** by invoking close-month for a prior month (idempotent — safe).
- [ ] **Step 3: Commit** — `feat(finances): close-month records tax_collected_cents`.

---

## Phase 5 — Docs & finish

### Task 18: Update docs + session logs

**Files:** `CLAUDE.md` (recent-commits row), `docs/HANDOFF.md`, `docs/PROJECT_STATUS.md`, `docs/USER_MANUAL.md` (Opie-facing: how to run reports, what each means, the tax toggle).

- [ ] **Step 1:** Add a HANDOFF section on the report engine + tax collection architecture + the `tax_enabled` gate.
- [ ] **Step 2:** USER_MANUAL: "Running reports", "Reading payout reconciliation", "Turning on sales tax".
- [ ] **Step 3: Commit** — `docs(finances): reporting suite + tax collection`.

### Task 19: Finish the branch

- [ ] Use `superpowers:finishing-a-development-branch` to decide merge/PR. Confirm with Kristin before enabling `tax_enabled` on live.

---

## Self-Review

**Spec coverage:**
- 7-tab IA → Task 9. Wire orphaned pages → Task 9. ✓
- Report engine json → Task 3. Five new reports → Tasks 4–8. On-screen + export-all → Task 10. ✓
- Payout reconciliation → Task 7 (data) + Task 12 (UI). ✓
- Overview dashboard + Stripe balance + month grid → Task 13. ✓
- COGS fix → Task 2. Data columns → Tasks 1, 14. ✓
- Sales tax collection (Tax Calc API, gated) → Tasks 14–17. ✓
- Tax Packet additions → Task 11. Docs → Task 18. ✓

**Placeholder scan:** No TBD/TODO. Optional `dataviz` skill invoked at chart steps (10, 13). Type-regen step 1.4 is conditional on how the project tracks `database.types.ts` (existing code uses `as any` for newer tables — acceptable).

**Type consistency:** json shape `{title, period, columns, rows, totals, notes}` defined in Task 3, consumed identically in Tasks 10/11/12. `calculate-tax` I/O (`{taxCents,totalCents}`) consistent across Tasks 15/16. Report-type slugs consistent between engine (Tasks 4–8) and `REPORT_TYPE_MAP` (Task 10).

**Ordering note:** Task 9 lazy-imports `./Payouts` (Task 12) — create a stub `Payouts.tsx` in Task 9 or reorder Task 12 before Task 9's build step (flagged in Task 9 Step 4).
