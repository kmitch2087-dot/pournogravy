import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, Info,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter, addMonths } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRINT_COST_PER_ITEM_CENTS = 1200; // $12/item — matches InvoiceTracker

// 2025 SE tax: 15.3% on 92.35% of net profit (up to $176,100 SS wage base)
// For simplicity we apply the full 15.3% to the 92.35% portion.
const SE_RATE = 0.153;
const SE_NET_FACTOR = 0.9235;

// Simplified single-filer federal income tax brackets (2025)
const BRACKETS: [number, number, number][] = [
  // [from, to, rate]
  [0, 11_925, 0.10],
  [11_925, 48_475, 0.12],
  [48_475, 103_350, 0.22],
  [103_350, 197_300, 0.24],
  [197_300, 250_525, 0.32],
  [250_525, 626_350, 0.35],
  [626_350, Infinity, 0.37],
];

const QUARTERLY_DUE_DATES = [
  { label: "Q1 (Jan–Mar)", due: "April 15, 2026" },
  { label: "Q2 (Apr–May)", due: "June 16, 2026" },
  { label: "Q3 (Jun–Aug)", due: "September 15, 2026" },
  { label: "Q4 (Sep–Dec)", due: "January 15, 2027" },
];

// ─── Tax helpers ──────────────────────────────────────────────────────────────

function calcSETax(netProfit: number): number {
  if (netProfit <= 0) return 0;
  const seTaxableBase = netProfit * SE_NET_FACTOR;
  return seTaxableBase * SE_RATE;
}

function calcIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  for (const [from, to, rate] of BRACKETS) {
    if (taxableIncome <= from) break;
    const slice = Math.min(taxableIncome, to) - from;
    tax += slice * rate;
  }
  return tax;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const fmtDollar = (dollars: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);

// ─── Queries ──────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  total_cents: number;
  shipping_cents: number;
  status: string;
  created_at: string;
}

interface ItemRow {
  order_id: string;
  quantity: number;
}

interface MonthlySnapshotRow {
  year: number;
  month: number;
  revenue_cents: number;
  refunds_cents: number;
  cogs_cents: number;
  expenses_cents: number;
  stripe_fees_cents: number;
  net_profit_cents: number;
}

/** Aggregated totals derived from monthly_snapshots for a past year. */
interface SnapshotTotals {
  revenueCents: number;
  refundsCents: number;
  cogsCents: number;
  expensesCents: number;
  stripeFeesCents: number;
  netProfitCents: number;
}

function useMonthlySnapshots(selectedYear: number, currentYear: number) {
  const isPastYear = selectedYear !== currentYear;
  return useQuery<MonthlySnapshotRow[]>({
    queryKey: ["monthly_snapshots", selectedYear],
    enabled: isPastYear,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_snapshots")
        .select("year, month, revenue_cents, refunds_cents, cogs_cents, expenses_cents, stripe_fees_cents, net_profit_cents")
        .eq("year", selectedYear);
      if (error) throw error;
      return (data ?? []) as MonthlySnapshotRow[];
    },
    staleTime: 5 * 60_000,
  });
}

function useFinancialsData(selectedYear: number) {
  const yearStart = `${selectedYear}-01-01T00:00:00.000Z`;
  const yearEnd   = `${selectedYear}-12-31T23:59:59.999Z`;

  const { data: orders, isLoading: ordersLoading, refetch } = useQuery<OrderRow[]>({
    queryKey: ["financials-orders", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_cents, shipping_cents, status, created_at")
        .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
        .eq("is_test", false)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
    staleTime: 60_000,
  });

  const { data: refundedOrders } = useQuery<{ total_cents: number }[]>({
    queryKey: ["financials-refunds", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total_cents")
        .eq("status", "refunded")
        .eq("is_test", false)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd);
      if (error) throw error;
      return (data ?? []) as { total_cents: number }[];
    },
    staleTime: 60_000,
  });

  const orderIds = (orders ?? []).map((o) => o.id);

  const { data: items, isLoading: itemsLoading } = useQuery<ItemRow[]>({
    queryKey: ["financials-items", orderIds.join(",")],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, quantity")
        .in("order_id", orderIds);
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
    staleTime: 60_000,
  });

  return {
    orders: orders ?? [],
    refundedOrders: refundedOrders ?? [],
    items: items ?? [],
    isLoading: ordersLoading || (orderIds.length > 0 && itemsLoading),
    refetch,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricCard = ({
  label, value, sub, icon: Icon, color, delay = 0,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start"
  >
    <div className={`p-2.5 rounded-lg shrink-0 ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground font-display tracking-widest uppercase truncate">{label}</p>
      <p className="text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const SectionCard = ({ title, children, className = "" }: {
  title: string; children: React.ReactNode; className?: string;
}) => (
  <div className={`bg-card border border-border rounded-xl p-6 ${className}`}>
    <h2 className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase mb-5">{title}</h2>
    {children}
  </div>
);

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border text-sm text-muted-foreground space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Financials() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { orders, refundedOrders, items, isLoading: liveLoading, refetch } = useFinancialsData(selectedYear);
  const { data: snapshots, isLoading: snapshotsLoading } = useMonthlySnapshots(selectedYear, currentYear);

  const isPastYear = selectedYear !== currentYear;
  // Use snapshots when viewing a past year that has closed months on record
  const useSnapshots = isPastYear && (snapshots ?? []).length > 0;

  // ── Per-order item counts (live path) ──
  const itemCountByOrder = new Map<string, number>();
  for (const it of items) {
    itemCountByOrder.set(it.order_id, (itemCountByOrder.get(it.order_id) ?? 0) + it.quantity);
  }

  // ── Aggregate revenue (snapshot path) ──
  const snapshotTotals: SnapshotTotals | null = useSnapshots
    ? (snapshots ?? []).reduce<SnapshotTotals>(
        (acc, row) => ({
          revenueCents:    acc.revenueCents    + row.revenue_cents,
          refundsCents:    acc.refundsCents    + row.refunds_cents,
          cogsCents:       acc.cogsCents       + row.cogs_cents,
          expensesCents:   acc.expensesCents   + row.expenses_cents,
          stripeFeesCents: acc.stripeFeesCents + row.stripe_fees_cents,
          netProfitCents:  acc.netProfitCents  + row.net_profit_cents,
        }),
        { revenueCents: 0, refundsCents: 0, cogsCents: 0, expensesCents: 0, stripeFeesCents: 0, netProfitCents: 0 }
      )
    : null;

  // ── Aggregate revenue (live path — also used as fallback for past years with no snapshots) ──
  const grossRevenueLive      = orders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const refundsTotalLive      = refundedOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const netRevenueLive        = grossRevenueLive - refundsTotalLive;
  const totalShippingLive     = orders.reduce((s, o) => s + (o.shipping_cents ?? 0), 0);
  const totalItemsLive        = orders.reduce((s, o) => s + (itemCountByOrder.get(o.id) ?? 0), 0);
  const printCogsLive         = totalItemsLive * PRINT_COST_PER_ITEM_CENTS;
  const productRevenueLive    = netRevenueLive - totalShippingLive;
  const grossProfitLive       = productRevenueLive - printCogsLive;

  // ── Final display values ──
  const grossRevenue      = snapshotTotals ? snapshotTotals.revenueCents    : grossRevenueLive;
  const refundsTotalCents = snapshotTotals ? snapshotTotals.refundsCents    : refundsTotalLive;
  const netRevenueCents   = grossRevenue - refundsTotalCents;
  // For snapshot path: shipping is embedded in cogs; we approximate totalShipping as 0
  // since snapshot data doesn't break it out separately.
  const totalShipping     = snapshotTotals ? 0                              : totalShippingLive;
  const productRevenue    = snapshotTotals ? (snapshotTotals.revenueCents - snapshotTotals.refundsCents) : productRevenueLive;
  const totalItems        = snapshotTotals ? 0                              : totalItemsLive;
  const printCogsCents    = snapshotTotals ? snapshotTotals.cogsCents       : printCogsLive;
  const grossProfitCents  = snapshotTotals ? snapshotTotals.netProfitCents  : grossProfitLive;

  const isLoading = liveLoading || (isPastYear && snapshotsLoading);

  // ── Tax estimates (dollars for tax math) ──
  const netProfitDollars = grossProfitCents / 100;
  const seTaxDollars     = calcSETax(netProfitDollars);
  // Half of SE tax is deductible from income
  const seDeductDollars  = seTaxDollars / 2;
  const taxableIncome    = Math.max(0, netProfitDollars - seDeductDollars);
  const incomeTaxDollars = calcIncomeTax(taxableIncome);
  const totalTaxDollars  = seTaxDollars + incomeTaxDollars;
  const quarterlyEst     = totalTaxDollars / 4;

  // ── Adjustable other-income (for tax estimate) ──
  const [otherIncome, setOtherIncome] = useState("");
  const otherIncomeDollars = parseFloat(otherIncome) || 0;
  const adjustedTaxableIncome = Math.max(0, taxableIncome + otherIncomeDollars);
  const adjustedIncomeTax     = calcIncomeTax(adjustedTaxableIncome);
  const adjustedTotal         = seTaxDollars + adjustedIncomeTax;
  const adjustedQuarterly     = adjustedTotal / 4;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-widest">FINANCIALS</h1>
          <p className="text-xs text-muted-foreground mt-1 font-marker tracking-widest">
            {selectedYear}{isPastYear ? " FULL YEAR" : " YTD"} ·{" "}
            {useSnapshots
              ? `${(snapshots ?? []).length} CLOSED MONTHS`
              : `${orders.length} ORDERS`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label="Select year"
            className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
          >
            {Array.from({ length: currentYear - 2024 + 1 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* P&L KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          delay={0}    label="Gross Revenue"    value={fmt(grossRevenue)}
          sub={`incl. ${fmt(totalShipping)} shipping`}
          icon={DollarSign}    color="bg-amber-400/10 text-amber-400"
        />
        <MetricCard
          delay={0.04} label="Product Revenue"  value={fmt(productRevenue)}
          sub="excl. pass-through shipping"
          icon={TrendingUp}    color="bg-blue-400/10 text-blue-400"
        />
        <MetricCard
          delay={0.08} label="Print COGS"        value={fmt(printCogsCents)}
          sub={useSnapshots ? "from closed month records" : `${totalItems} items × $12 est.`}
          icon={Receipt}       color="bg-orange-400/10 text-orange-400"
        />
        <MetricCard
          delay={0.12} label="Gross Profit"      value={fmt(grossProfitCents)}
          sub="before taxes"
          icon={grossProfitCents >= 0 ? TrendingUp : TrendingDown}
          color={grossProfitCents >= 0 ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}
        />
      </div>

      {/* P&L breakdown table */}
      <SectionCard title="Profit & Loss Summary — YTD">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {([
              ["Gross Revenue",           fmt(grossRevenue),         "Total collected incl. shipping"],
              ["Refunds Issued",          `(${fmt(refundsTotalCents)})`, "Returned to customers"],
              ["Net Revenue",             fmt(netRevenueCents),       "After refunds"],
              ["Shipping (pass-through)", `(${fmt(totalShipping)})`, "Goes to carrier — not your income"],
              ["Product Revenue",         fmt(productRevenue),        "What you actually keep from sales"],
              ["Print COGS",              `(${fmt(printCogsCents)})`, useSnapshots ? "from closed month records" : `${totalItems} items × $12 est. print cost`],
              ["Gross Profit",            fmt(grossProfitCents),      "Before SE tax & income tax"],
            ] as [string, string, string][]).map(([label, value, note]) => (
              <tr key={label} className={label === "Gross Profit" ? "font-semibold" : ""}>
                <td className="py-3 pr-4 text-muted-foreground">{label}</td>
                <td className={`py-3 pr-4 text-right font-mono tabular-nums ${
                  value.startsWith("(") ? "text-red-400" : ""
                }`}>{value}</td>
                <td className="py-3 text-xs text-muted-foreground/60 hidden md:table-cell">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Federal Tax Estimator */}
      <SectionCard title="Federal Tax Estimator — Self-Employment">

        <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-4 mb-5 text-xs text-muted-foreground space-y-1">
          <p className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 text-amber-400 shrink-0" />
            These are estimates only. They assume single-filer status, no other deductions, and 2025 tax tables.
            <strong className="text-foreground ml-1">Talk to a CPA before filing.</strong>
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">

          {/* Left: calculated breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Net Profit (gross profit)</span>
              <span className="font-mono font-semibold">{fmtDollar(netProfitDollars)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Self-Employment Tax (15.3%)</span>
              <span className="font-mono text-red-400">({fmtDollar(seTaxDollars)})</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">SE Deduction (½ of SE tax)</span>
              <span className="font-mono text-green-400">({fmtDollar(seDeductDollars)})</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Taxable Income</span>
              <span className="font-mono font-semibold">{fmtDollar(adjustedTaxableIncome)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border">
              <span className="text-muted-foreground">Federal Income Tax (est.)</span>
              <span className="font-mono text-red-400">({fmtDollar(adjustedIncomeTax)})</span>
            </div>
            <div className="flex justify-between text-sm py-2 bg-muted/20 rounded px-3">
              <span className="font-semibold">Total Tax Estimate</span>
              <span className="font-mono font-bold text-red-400">{fmtDollar(adjustedTotal)}</span>
            </div>
          </div>

          {/* Right: quarterly schedule */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Other Income This Year (optional)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={otherIncome}
                  onChange={(e) => setOtherIncome(e.target.value)}
                  className="h-8 text-xs w-32"
                />
                <span className="text-xs text-muted-foreground">salary, tips, etc.</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-display tracking-widest uppercase mt-4 mb-2">Quarterly Estimated Payments</p>
            <div className="space-y-2">
              {QUARTERLY_DUE_DATES.map((q) => (
                <div key={q.label} className="flex items-center justify-between text-sm bg-muted/20 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="font-medium">{q.label}</p>
                    <p className="text-xs text-muted-foreground">Due {q.due}</p>
                  </div>
                  <span className="font-mono font-bold tabular-nums text-amber-400">
                    {fmtDollar(adjustedQuarterly)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* How this works */}
      <SectionCard title="How This Works — Notes for Opie">
        <div className="space-y-3">
          <Disclosure title="What is self-employment tax?">
            <p>Because Pournogravy is your own business, you pay both the employer AND employee sides of Social Security and Medicare — that&apos;s 15.3% total on 92.35% of your net profit.</p>
            <p>The good news: you get to deduct half of it from your taxable income (the &quot;SE Deduction&quot; line above).</p>
          </Disclosure>

          <Disclosure title="What are quarterly estimated payments?">
            <p>The IRS expects self-employed people to pay taxes as they earn, not all at once in April. You send a check (or pay online) 4 times a year.</p>
            <p>If you underpay, there&apos;s a small penalty. It&apos;s not jail-worthy — but paying quarterly keeps things clean.</p>
            <p>Pay online at: <strong>irs.gov/payments</strong> using IRS Direct Pay (free, no account needed).</p>
          </Disclosure>

          <Disclosure title="What counts as my COGS (cost of goods)?">
            <p>For POURnogravy, your main cost is the print shop: ~$12/item. The numbers here use that estimate.</p>
            <p>You can also deduct: platform/tool subscriptions, shipping supplies, advertising, home office if applicable. Keep receipts.</p>
            <p>The actual print cost is on the Invoice Tracker page — that&apos;s what you actually owe the printer.</p>
          </Disclosure>

          <Disclosure title="Why doesn't this match my bank balance?">
            <p>This page shows <em>accrual-basis</em> numbers — revenue when orders are placed, costs at $12/item estimate. Your bank shows cash when Stripe settles (usually 2 business days).</p>
            <p>Stripe fees (~2.9% + 30¢/order) are also not deducted here. Export your Stripe payout summary for exact net deposits.</p>
          </Disclosure>

          <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground mt-2">
            <p className="font-semibold text-foreground mb-1">Reminder</p>
            <p>These tax numbers are ballpark estimates. Your actual tax bill depends on all your income, deductions, credits, and filing status. A CPA who works with small creative/product businesses can save you way more than their fee.</p>
          </div>
        </div>
      </SectionCard>

      {/* YTD order table */}
      <SectionCard title={`${selectedYear} Orders`}>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No orders yet this year.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Order", "Date", "Revenue", "Print COGS", "Gross Profit", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-display tracking-widest uppercase pb-3 pr-4 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.slice(0, 30).map((order) => {
                  const itemCount  = itemCountByOrder.get(order.id) ?? 0;
                  const revCents   = (order.total_cents ?? 0) - (order.shipping_cents ?? 0);
                  const cogsCents  = itemCount * PRINT_COST_PER_ITEM_CENTS;
                  const profCents  = revCents - cogsCents;
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.created_at), "MMM d")}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs tabular-nums">{fmt(revCents)}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs tabular-nums text-orange-400">({fmt(cogsCents)})</td>
                      <td className={`py-2.5 pr-4 font-mono text-xs tabular-nums font-semibold ${profCents >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {fmt(profCents)}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {orders.length > 30 && (
                  <tr>
                    <td colSpan={6} className="py-3 text-center text-xs text-muted-foreground">
                      Showing first 30 of {orders.length} orders — export for full data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

    </div>
  );
}
