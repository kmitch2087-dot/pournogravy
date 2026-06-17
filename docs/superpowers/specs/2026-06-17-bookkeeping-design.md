# Bookkeeping Module — Design Spec
**Date:** 2026-06-17  
**Project:** Pournogravy Admin Dashboard  
**Author:** Kristin Mitchell / Aethyx  
**Status:** Approved — ready for implementation planning

---

## Overview

A new **Bookkeeping** section in the admin dashboard that gives Opie (Adam Oppenheimer) a complete, organized financial record without any external accounting software. Designed to produce clean exports for his accountant at tax time and quarterly, with zero manual assembly required.

The existing **Financials** page remains as an at-a-glance P&L dashboard but receives two fixes: refunds netted out of revenue, and a year selector for historical access.

---

## Goals

- Replace the hardcoded $12/item COGS with actual per-product cost basis
- Auto-sync Stripe processing fees as categorized business expenses
- Auto-close each month's books on the 1st, producing a stable locked snapshot
- Allow Opie to annotate (not alter) closed months to explain corrections
- Generate accountant-ready PDF and CSV reports for any period
- Produce a one-click year-end Tax Packet ZIP for handoff to accountant
- Use cash-basis accounting throughout (matches how a sole proprietor typically files)

---

## Navigation

New **"Bookkeeping"** item added to the admin sidebar, between Financials and Analytics.

Five sub-pages:

| Route | Sub-page | Purpose |
|-------|----------|---------|
| `/admin/bookkeeping` | Overview | Year P&L grid with monthly close status |
| `/admin/bookkeeping/expenses` | Expenses | Manual expense entry + Stripe auto-sync |
| `/admin/bookkeeping/products` | Products (COGS) | Per-product cost basis editor |
| `/admin/bookkeeping/reports` | Reports | Generate and download reports by period |
| `/admin/bookkeeping/tax-packet` | Tax Packet | Year-end export bundle for accountant |

---

## Sub-page Designs

### 1. Overview

Default view when entering Bookkeeping. Year selector (dropdown, defaults to current year) at the top.

**Summary cards (4):**
- Annual Gross Revenue
- Annual Total Expenses
- Annual Net Profit
- Stripe Fees Paid (YTD)

**Monthly grid (12 cards):**
Each month card shows:
- Month name
- Gross revenue
- Total expenses
- Net profit
- Status badge: **Open** (current month, live data) | **Closed** (locked snapshot) | **Amended** (closed + annotation added)

Clicking any closed or amended month opens a drawer showing:
- Snapshot details (revenue, expenses, COGS, Stripe fees, refunds, net profit)
- Amendment note (if any)
- "Add / Edit Annotation" button — opens a textarea for Opie to explain any correction
  - Saves to `monthly_snapshots.amendment_note` and stamps `amended_at`
  - Does NOT change any dollar amounts in the snapshot
- If amended, the annotation is shown visibly in the drawer and appended to PDF reports

**Guidance text:** A persistent callout at the top of the page reads:
> "Books close automatically on the 1st of each month. If something looks off in a closed month, click it to add an annotation — your accountant will see it. Do not panic."

---

### 2. Expenses

A full ledger of all business expenses.

**Two entry sources:**

**Stripe Auto-Sync (read-only rows):**
- Daily cron (`sync-stripe-fees` edge function) fetches Stripe Balance Transactions API
- Extracts `fee` from each charge transaction
- Upserts into `expenses` table: category = "Merchant Fees — Stripe", source = "stripe_auto"
- Rows display a locked padlock icon and "Stripe" source badge
- Opie cannot edit or delete these rows
- Opie can add a note to any auto-synced row

**Manual Entries:**
"Add Expense" button opens a form:
- Date (date picker, defaults to today)
- Amount ($)
- Category (dropdown):
  - Cost of Goods Sold
  - Merchant / Processing Fees
  - Advertising & Marketing
  - Shipping Paid
  - Software & Subscriptions
  - Supplies & Equipment
  - Contract Labor
  - Other Business Expense
- Description (free text, required)
- Receipt (optional image upload → `expenses/` folder in Supabase Storage)

**Ledger display:**
- Filterable by month, category, source
- Sortable by date or amount
- Running total updates with filters
- Closed months: all rows locked, edit/delete buttons hidden, amendment flow available via Overview

---

### 3. Products (COGS)

Simple table of all active products with editable cost basis.

**Columns:**
| Product Name | Sale Price | Cost to Produce | Gross Margin |
|-------------|-----------|----------------|-------------|

- Cost to Produce: inline editable (click to edit, Enter to save)
- Saves immediately to `products.cost_cents`
- Gross Margin calculated live: `(price - cost) / price × 100`
- Sorted by margin ascending (lowest margin products shown first — most actionable)

**COGS snapshot behavior:**
When `close-month` runs, it records the cost basis active at that moment per product. If costs change later, closed months are unaffected.

**Guidance text:**
> "This is what it costs you to make each item — printing, materials, fulfillment. Your accountant uses this to calculate Cost of Goods Sold on your tax return. Update it whenever your printer changes their prices."

---

### 4. Reports

Generate any report by selecting period and format.

**Period selector:** Month | Quarter | Year | Custom date range  
**Format selector:** PDF | CSV

**Report types:**

| Report | Contents |
|--------|---------|
| P&L Statement | Revenue, refunds/returns, gross profit, expenses by category, net profit. Month-by-month breakdown for multi-month periods. |
| Order Summary | Order count, revenue, refunds, net — one row per month. Includes status breakdown (paid, fulfilled, shipped, delivered, refunded). |
| Expense Detail | Every expense entry: date, category, description, amount, source. Subtotals by category. |
| Sales by Product | Units sold, revenue, COGS, gross margin per product. Sorted by revenue descending. |
| Stripe Fee Summary | Per-transaction Stripe fees: date, order ID, charge amount, fee amount. Monthly subtotals. |

**Data sourcing:**
- Closed months: pull from `monthly_snapshots` (stable, locked)
- Current open month: pull from live tables
- Reports spanning both: hybrid (snapshots for closed, live for open month)

**PDF format:** Clean, professional. Header with business name (POURnogravy), report title, date range. Footer with "Generated [date] — Cash basis accounting." Amendment annotations appended as a notes page if any months were amended.

**CSV format:** All columns, headers included, UTF-8 encoded.

---

### 5. Tax Packet

One page. One action per year.

**Year selector** (dropdown, shows all years with at least one closed month).

**Month status checklist:** All 12 months shown with open/closed/amended status. A warning banner appears if any months are still open, but generation is not blocked.

**"Generate Tax Packet for [Year]" button** → downloads a ZIP file named `PG_Taxes_[YEAR].zip` containing:

| Filename | Contents |
|----------|---------|
| `PG_[YEAR]_PL_Statement.pdf` | Full-year P&L, month by month, with amendment notes page if applicable |
| `PG_[YEAR]_Orders.csv` | All orders: date, customer email, status, subtotal, shipping, tax, total, refund flag |
| `PG_[YEAR]_Expenses.csv` | All expenses: date, category, description, amount, source — Schedule C aligned |
| `PG_[YEAR]_Stripe_Fees.csv` | All Stripe processing fees: date, order ID, charge, fee |
| `PG_[YEAR]_COGS_by_Product.csv` | Units sold × cost per product = total COGS contribution |
| `PG_[YEAR]_Summary.pdf` | Cover sheet: business name, tax year, gross revenue, total expenses, net profit, Stripe fees, preparer note |

**Cover sheet preparer note (static):**
> "This packet was generated from POURnogravy's sales dashboard. All figures reflect cash-basis accounting. Stripe fee data sourced directly from Stripe Balance Transactions API. Please review all figures with your accountant before filing."

---

## Monthly Auto-Close

**Trigger:** Supabase cron job (`close-month` edge function), runs at 00:05 on the 1st of each month.

**What it does:**
1. Identifies the month that just ended (previous calendar month)
2. Checks if a snapshot already exists — skips if so (idempotent)
3. Queries live tables for that month:
   - Revenue: sum of `orders.total_cents` where status in (paid, fulfilled, shipped, delivered) and `created_at` in month range
   - Refunds: sum of refunded orders
   - COGS: sum of `order_items.quantity × products.cost_cents` for orders in month
   - Expenses: sum of `expenses.amount_cents` where `date` in month range
   - Stripe fees: sum of auto-synced Stripe expense rows for the month
4. Writes one row to `monthly_snapshots`
5. Stamps all `expenses` rows for that month with the snapshot ID (`month_snapshot_id`)

**Amendment flow:**
- Opie clicks a closed month in Overview
- Adds annotation text → saved to `monthly_snapshots.amendment_note`, `amended_at` stamped
- No dollar amounts change
- Reports and Tax Packet include the annotation as a footnote

---

## Financials Page Fixes (existing page)

Two targeted changes, no redesign:

1. **Refund netting:** Revenue query excludes orders with status = "refunded". A separate "Refunds Issued" line item is shown below gross revenue so the deduction is visible.

2. **Year selector:** Dropdown added to Financials header. Selecting a past year pulls from `monthly_snapshots` for all closed months and shows YTD live data for the current year.

---

## Database Schema

### New table: `monthly_snapshots`
```sql
CREATE TABLE monthly_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year            int NOT NULL,
  month           int NOT NULL,  -- 1-12
  revenue_cents   int NOT NULL DEFAULT 0,
  refunds_cents   int NOT NULL DEFAULT 0,
  cogs_cents      int NOT NULL DEFAULT 0,
  expenses_cents  int NOT NULL DEFAULT 0,
  stripe_fees_cents int NOT NULL DEFAULT 0,
  net_profit_cents  int GENERATED ALWAYS AS
                    (revenue_cents - refunds_cents - cogs_cents - expenses_cents) STORED,
  closed_at       timestamptz NOT NULL DEFAULT now(),
  amended_at      timestamptz,
  amendment_note  text,
  UNIQUE (year, month)
);
```

### New table: `expenses`
```sql
CREATE TABLE expenses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date                date NOT NULL,
  amount_cents        int NOT NULL,
  category            text NOT NULL,
  description         text NOT NULL,
  source              text NOT NULL DEFAULT 'manual',  -- 'manual' | 'stripe_auto'
  receipt_url         text,
  stripe_charge_id    text,  -- populated for stripe_auto rows, used for upsert dedup
  month_snapshot_id   uuid REFERENCES monthly_snapshots(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_charge_id)  -- prevents duplicate Stripe fee imports
);
```

### Column added to existing `products` table
```sql
ALTER TABLE products ADD COLUMN cost_cents int NOT NULL DEFAULT 1200;
```
Default of 1200 (= $12.00) preserves existing behavior until Opie updates costs.

---

## New Edge Functions

### `sync-stripe-fees`
- **Trigger:** Daily cron at 02:00 UTC
- **Logic:** Fetch Stripe Balance Transactions for the past 48 hours (overlap handles timing edge cases). For each `type = charge`, extract `fee`. Upsert into `expenses` by `stripe_charge_id`. Category = "Merchant Fees — Stripe", source = "stripe_auto".
- **Required secrets:** `STRIPE_SECRET_KEY` (already set)

### `close-month`
- **Trigger:** Cron at 00:05 on 1st of each month
- **Logic:** As described in Monthly Auto-Close section above. Idempotent — safe to re-run.
- **Required secrets:** `SUPABASE_SERVICE_ROLE_KEY` (already set)

### `generate-report`
- **Trigger:** Admin HTTP call from Reports page
- **Input:** `{ report_type, period_start, period_end, format }`
- **Logic:** Queries snapshots + live tables depending on period. Builds PDF via HTML-to-PDF rendering (using a headless approach or a Deno-compatible PDF library). Returns file as base64 or streams download.
- **Required secrets:** `SUPABASE_SERVICE_ROLE_KEY`

---

## RLS Policies

- `monthly_snapshots`: service_role write, admin read
- `expenses`: service_role write for stripe_auto rows; admin read/write for manual rows; RLS policy checks `source = 'manual'` for update/delete permissions
- `products.cost_cents`: existing admin write policy covers this column

---

## Accounting Method

**Cash basis** throughout. Revenue is recognized when payment is received (order status = paid/fulfilled/shipped/delivered). Expenses are recognized on the date entered. This is standard for a sole proprietor at this revenue level and matches how most small business accountants expect to receive records.

---

## Out of Scope (this phase)

- State sales tax calculation or nexus tracking
- 1099 vendor payment tracking
- Inventory / stock level management
- Multi-user bookkeeping roles
- QuickBooks / Wave direct integration
- Payroll or contractor payment processing
