# Finances — Stripe-Grade Small-Business Reporting

**Date:** 2026-07-31
**Author:** Kristin Mitchell (with Claude)
**Status:** Approved design — ready for implementation plan

## Goal

Bring the admin `/admin/finances` page up to par with what a small business needs
for its books **and** with the reporting capabilities Stripe itself provides — while
keeping everything inside the admin dashboard on the website (no external tools).

## Background / current state

`/admin/finances` (`src/pages/admin/Finances.tsx`) is a 6-tab container. It is the
product of a half-finished migration from the old `/admin/bookkeeping/*` routes:

| Tab | Status today | Backing file |
|-----|--------------|--------------|
| Overview | Live | `Financials.tsx` (P&L KPIs, P&L table, federal tax estimator, YTD orders) |
| Invoices | Live | `InvoiceTracker.tsx` (printer invoices) |
| Expenses | Live | `BookkeepingOverview.tsx` (monthly-close grid + accountant annotations) |
| Products | **"Coming soon" placeholder** | `BookkeepingProducts.tsx` **built but orphaned** (per-product COGS) |
| Reports | **"Coming soon" placeholder** | `BookkeepingReports.tsx` **built but orphaned** (5 report types) |
| Tax Packet | **"Coming soon" placeholder** | `BookkeepingTaxPacket.tsx` **built but orphaned** (year-end ZIP) |

Additional debt:
- `BookkeepingExpenses.tsx` (the real expense **ledger**) is also orphaned; the
  "Expenses" tab shows the monthly-close grid instead.
- `BookkeepingOverview`'s internal sub-nav links to `/admin/bookkeeping/*`, which now
  just redirect back to `/admin/finances` (dead loops).
- **COGS bug:** `Financials.tsx` and `close-month` use a hardcoded flat **$12/item**
  (`PRINT_COST_PER_ITEM_CENTS = 1200`) and ignore `products.cost_cents`. The
  `generate-report` engine already uses per-product cost (with a $12 fallback), so the
  Overview P&L and the Reports engine disagree on profit.

### Existing infrastructure to reuse (do not rebuild)
- **`generate-report`** edge function — returns CSV/HTML for `pl_statement`,
  `order_summary`, `expense_detail`, `sales_by_product`, `stripe_fee_summary`.
  Admin-JWT or service-role authorized.
- **`sync-stripe-fees`** — daily pg_cron; pulls Stripe Balance Transactions → `expenses` (source=`stripe_auto`).
- **`close-month`** — 1st-of-month pg_cron; locks a month into `monthly_snapshots`.
- **`refund-order`** — refunds via Stripe.
- Tables: `monthly_snapshots`, `expenses`, `products.cost_cents`, `orders`, `order_items`.
- `recharts@^2.15.4` is installed.

### Live Stripe account reality (verified 2026-07-31)
- Real live account (`acct_1TLxdVFT25csHYhO`), but **no real sales volume yet** — only
  the owner's own $1.01 test purchases. Reports will be near-empty until real orders arrive.
- **Payouts** exist (automatic, standard, to a bank account) → payout reconciliation feasible.
- **Zero disputes** so far → dispute reporting should be scaffolded.
- **Stripe Tax is `active`** (RI head office) **but `create-checkout` never enables
  `automatic_tax`** → **$0 sales tax is currently being collected.** Compliance gap.

## Decisions (from brainstorming)

1. **Scope:** Full Stripe-grade suite.
2. **Sales tax:** Enable `automatic_tax` at checkout **and** build the sales-tax report.
   The checkout change is a live pricing change — build/stage/test in Stripe test mode
   and **flag for explicit go-ahead before deploying to live checkout** (Opie's call).
3. **Report delivery:** On-screen view **and** CSV/PDF export for every report.
4. **Approach A:** One report engine, reorganized tabs, all inside the Finances page.

## Target information architecture (7 tabs)

| Tab | Job | Source |
|-----|-----|--------|
| **Overview** | Dashboard: KPI tiles + revenue chart + monthly-close grid | Rework `Financials.tsx`, fold in `BookkeepingOverview` grid |
| **Reports** | Unified runner: pick report + period → on-screen table/summary + CSV/PDF | Rework `BookkeepingReports.tsx` |
| **Payouts** | Stripe payout reconciliation (live) | New component |
| **Expenses** | Expense ledger (add/edit/categorize/receipts; Stripe fees read-only) | Wire `BookkeepingExpenses.tsx` |
| **Products** | Per-product COGS editor | Wire `BookkeepingProducts.tsx` |
| **Invoices** | Printer invoice tracking | Keep `InvoiceTracker.tsx` |
| **Tax Packet** | Year-end ZIP for accountant (incl. new reports) | Wire `BookkeepingTaxPacket.tsx` |

Moves: monthly-close grid → Overview; federal tax estimator → a "Tax Estimate" report in
Reports; remove dead `/admin/bookkeeping/*` sub-nav.

## Report engine (extended `generate-report`)

Compute one structured result internally, serialize to the requested `format`:
- `json` → on-screen rendering **(new)**: `{ title, period, columns[], rows[][], totals{}, notes[] }`
- `csv` → download (exists)
- `html` → printable PDF (exists)

Report catalog (● local data · ★ needs Stripe API):

| Report | Source | Status |
|--------|--------|--------|
| P&L Statement ● | snapshots + live current month | exists; fix COGS |
| Order Summary ● | orders | exists |
| Sales by Product ● | order_items × products.cost_cents | exists |
| Expense Detail ● | expenses | exists |
| Stripe Fee Summary ● | expenses (stripe_auto) | exists |
| **Sales Tax Collected** ● | `orders.tax_cents` grouped by ship-to state | **new** |
| **Top Customers / LTV** ● | orders grouped by email | **new** |
| **Refunds & Disputes** ★ | orders (refunds) + Stripe disputes API | **new** |
| **Payout Reconciliation** ★ | Stripe payouts + balance-transaction breakdown | **new** |
| **Tax Estimate** ● | SE tax + brackets (moved from Overview) | **new (moved)** |

Payout reconciliation and disputes are fetched **on-demand** from Stripe inside the edge
function (no new table/cron). Everything else reads local DB.

## Data-model changes

1. **`orders.tax_cents int NOT NULL DEFAULT 0`** — migration; populated by `stripe-webhook`
   from the checkout session's `total_details.amount_tax`.
2. **`monthly_snapshots.tax_collected_cents int NOT NULL DEFAULT 0`** — migration +
   `close-month` update, so sales-tax history survives `archive-orders` purges.
3. **COGS consistency** — align Overview P&L, `close-month`, and `generate-report` to
   `quantity × products.cost_cents` (fallback $12). Note: slightly changes historical P&L
   vs. the flat $12.

## Checkout change (staged, gated)

Enable `automatic_tax: { enabled: true }` in `create-checkout` (Stripe computes tax from
the already-collected ship-to address). Capture `amount_tax` in the webhook. **Test in
Stripe test mode; do not deploy to live checkout without explicit go-ahead** — it changes
what customers pay.

## Frontend details

- **Reports tab:** report picker + period picker with preset ranges **and a custom date
  range**; on-screen styled table with totals + notes; contextual chart where it adds
  signal (Sales-by-Product bar, Sales-Tax-by-state bar); CSV + Print/PDF on every report.
- **Payouts tab:** payout list (date/status/arrival/amount); expand → gross − refunds −
  fees ± adjustments = net deposit.
- **Overview tab:** KPI tiles (Gross Rev, Net Rev, Gross Profit + margin %, AOV, Refund
  rate, Orders, Stripe balance / next payout); monthly revenue chart; monthly-close grid.
- **Expenses / Products / Tax Packet:** wire the orphaned pages; add Sales Tax + Payout
  Reconciliation to the Tax Packet ZIP.
- Charts follow the `dataviz` skill.

## Non-goals (YAGNI)
- No new payouts/reconciliation table or cron (on-demand is enough for this volume).
- No subscriptions/MRR reporting (no subscriptions).
- No failed-payment/abandoned-checkout report in this pass.
- No multi-user/multi-filer tax logic (single-filer sole prop, as today).

## Testing / verification
- Extend `generate-report` with unit-style checks on each new report's aggregation
  against known fixture rows (real Supabase, per project rule — no DB mocks).
- `automatic_tax` verified end-to-end in **Stripe test mode** (a test order shows tax;
  webhook writes `orders.tax_cents`; Sales Tax report reflects it).
- Payout reconciliation verified against the live Payouts dashboard figures.
- Drive each tab in the running admin app (`verify` skill) before claiming done.

## Rollout order (for the plan)
1. Data-model migrations + COGS consistency (backend truth first).
2. Extend `generate-report` (json format + new report types).
3. Wire orphaned tabs + new IA (Reports, Expenses, Products, Tax Packet, tab reorg).
4. Payouts tab + Overview dashboard rework.
5. Checkout `automatic_tax` (staged, gated) + webhook `tax_cents` capture.
6. Tax Packet additions.
