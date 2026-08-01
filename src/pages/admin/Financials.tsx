import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, Wallet,
  ChevronDown, ChevronUp, RefreshCw, Lock, Pencil, ShoppingCart, Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRINT_COST_PER_ITEM_CENTS = 1200; // $12/item — matches InvoiceTracker

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

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
  product_id: string | null;
  quantity: number;
}

interface ProductCostRow {
  id: string;
  cost_cents: number;
}

interface MonthlySnapshotRow {
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

interface StripeBalanceData {
  available_cents: number;
  pending_cents: number;
  next_payout: { amount_cents: number; arrival_date: number } | null;
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

// Fetched for every year (not just past years) — the monthly revenue chart and
// the monthly-close grid both need closed-month data even while viewing the
// current (in-progress) year.
function useMonthlySnapshots(selectedYear: number) {
  return useQuery<MonthlySnapshotRow[]>({
    queryKey: ["monthly_snapshots", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_snapshots")
        .select("id, year, month, revenue_cents, refunds_cents, cogs_cents, expenses_cents, stripe_fees_cents, net_profit_cents, closed_at, amended_at, amendment_note")
        .eq("year", selectedYear)
        .order("month");
      if (error) throw error;
      return (data ?? []) as MonthlySnapshotRow[];
    },
    staleTime: 5 * 60_000,
  });
}

function useStripeBalance() {
  return useQuery<StripeBalanceData>({
    queryKey: ["stripe-balance"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-balance");
      if (error) throw error;
      return data as StripeBalanceData;
    },
    staleTime: 60_000,
    retry: 1,
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
        .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered", "refunded", "disputed"])
        .eq("is_test", false)
        .gte("created_at", yearStart)
        .lte("created_at", yearEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
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
        .select("order_id, product_id, quantity")
        .in("order_id", orderIds);
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
    staleTime: 60_000,
  });

  const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter(Boolean))] as string[];

  const { data: productCosts, isLoading: productCostsLoading } = useQuery<ProductCostRow[]>({
    queryKey: ["financials-product-costs", productIds.join(",")],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, cost_cents")
        .in("id", productIds);
      if (error) throw error;
      return (data ?? []) as ProductCostRow[];
    },
    staleTime: 60_000,
  });

  return {
    orders: orders ?? [],
    items: items ?? [],
    productCosts: productCosts ?? [],
    isLoading:
      ordersLoading ||
      (orderIds.length > 0 && itemsLoading) ||
      (productIds.length > 0 && productCostsLoading),
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

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground font-semibold mb-1">{label}</p>
      <p className="flex justify-between gap-4" style={{ color: "#eab308" }}>
        <span>Net Revenue</span>
        <span className="font-bold tabular-nums">${Number(payload[0].value).toFixed(2)}</span>
      </p>
    </div>
  );
};

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
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { orders, items, productCosts, isLoading: liveLoading, refetch } = useFinancialsData(selectedYear);
  const { data: snapshots, isLoading: snapshotsLoading } = useMonthlySnapshots(selectedYear);
  const { data: stripeBalance, isLoading: stripeLoading, isError: stripeError } = useStripeBalance();

  // ── Monthly-close grid / amendment drawer state ──
  const [activeSnap, setActiveSnap] = useState<MonthlySnapshotRow | null>(null);
  const [noteText, setNoteText] = useState("");
  const saveAmendment = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from("monthly_snapshots")
        .update({ amendment_note: note || null, amended_at: note ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_snapshots"] });
      setActiveSnap(null);
      toast.success("Annotation saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const isPastYear = selectedYear !== currentYear;
  // Use snapshots when viewing a past year that has closed months on record
  const useSnapshots = isPastYear && (snapshots ?? []).length > 0;

  // ── Per-order item counts (live path) ──
  const itemCountByOrder = new Map<string, number>();
  for (const it of items) {
    itemCountByOrder.set(it.order_id, (itemCountByOrder.get(it.order_id) ?? 0) + it.quantity);
  }

  // ── Per-product cost lookup (live path) — real cost_cents, fallback to flat estimate ──
  const costByProduct = new Map<string, number>();
  for (const p of productCosts) costByProduct.set(p.id, p.cost_cents ?? PRINT_COST_PER_ITEM_CENTS);
  const cogsForOrder = (orderId: string) =>
    items
      .filter((it) => it.order_id === orderId)
      .reduce((s, it) => s + (it.quantity ?? 0) * (costByProduct.get(it.product_id ?? "") ?? PRINT_COST_PER_ITEM_CENTS), 0);

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
  const paidOrders            = orders.filter((o) => o.status !== "refunded" && o.status !== "disputed");
  const refundedOrdersLive    = orders.filter((o) => o.status === "refunded" || o.status === "disputed");
  const grossRevenueLive      = paidOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const refundsTotalLive      = refundedOrdersLive.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const netRevenueLive        = grossRevenueLive - refundsTotalLive;
  const totalShippingLive     = paidOrders.reduce((s, o) => s + (o.shipping_cents ?? 0), 0);
  const totalItemsLive        = paidOrders.reduce((s, o) => s + (itemCountByOrder.get(o.id) ?? 0), 0);
  const printCogsLive         = paidOrders.reduce((s, o) => s + cogsForOrder(o.id), 0);
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

  const isLoading = liveLoading || snapshotsLoading;

  // ── Extra KPI tiles ──
  const totalOrderCount    = orders.length;
  const refundedOrderCount = refundedOrdersLive.length;
  const refundRatePct      = totalOrderCount > 0 ? (refundedOrderCount / totalOrderCount) * 100 : 0;
  const aovCents            = paidOrders.length > 0 ? netRevenueCents / paidOrders.length : 0;
  const grossMarginPct      = productRevenue > 0 ? (grossProfitCents / productRevenue) * 100 : 0;

  // ── Monthly-close grid lookup ──
  const snapMap = Object.fromEntries((snapshots ?? []).map((s) => [s.month, s]));

  // ── Monthly revenue chart data — closed months from snapshots, live months from orders ──
  const liveRevenueByMonth = new Map<number, { revenue: number; refunds: number }>();
  for (const o of orders) {
    const m = new Date(o.created_at).getUTCMonth() + 1;
    const rec = liveRevenueByMonth.get(m) ?? { revenue: 0, refunds: 0 };
    if (o.status === "refunded" || o.status === "disputed") rec.refunds += o.total_cents ?? 0;
    else rec.revenue += o.total_cents ?? 0;
    liveRevenueByMonth.set(m, rec);
  }

  const monthlyChartData = MONTH_NAMES
    .map((name, idx) => {
      const m = idx + 1;
      const snap = snapMap[m];
      if (snap) {
        return { month: name, netRevenue: (snap.revenue_cents - snap.refunds_cents) / 100 };
      }
      const live = liveRevenueByMonth.get(m);
      return { month: name, netRevenue: live ? (live.revenue - live.refunds) / 100 : 0 };
    })
    .filter((_, idx) => (selectedYear === currentYear ? idx + 1 <= currentMonth : true));

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
          sub={useSnapshots ? "from closed month records" : `${totalItems} items · per-product cost`}
          icon={Receipt}       color="bg-orange-400/10 text-orange-400"
        />
        <MetricCard
          delay={0.12} label="Gross Profit"      value={fmt(grossProfitCents)}
          sub="before taxes"
          icon={grossProfitCents >= 0 ? TrendingUp : TrendingDown}
          color={grossProfitCents >= 0 ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}
        />
        <MetricCard
          delay={0.16} label="Avg Order Value"   value={fmt(aovCents)}
          sub={`${paidOrders.length} paid orders`}
          icon={ShoppingCart}  color="bg-cyan-400/10 text-cyan-400"
        />
        <MetricCard
          delay={0.20} label="Refund Rate"       value={fmtPct(refundRatePct)}
          sub={`${refundedOrderCount} of ${totalOrderCount} orders`}
          icon={TrendingDown}  color="bg-rose-400/10 text-rose-400"
        />
        <MetricCard
          delay={0.24} label="Gross Margin"      value={fmtPct(grossMarginPct)}
          sub="gross profit ÷ product revenue"
          icon={Percent}       color="bg-emerald-400/10 text-emerald-400"
        />
        <MetricCard
          delay={0.28} label="Stripe Balance"
          value={stripeLoading ? "…" : stripeError ? "—" : fmt((stripeBalance?.available_cents ?? 0) + (stripeBalance?.pending_cents ?? 0))}
          sub={
            stripeLoading
              ? "Loading…"
              : stripeError
              ? "Unable to load — check STRIPE_SECRET_KEY"
              : stripeBalance?.next_payout
              ? `Next payout ${fmt(stripeBalance.next_payout.amount_cents)} · ${format(new Date(stripeBalance.next_payout.arrival_date * 1000), "MMM d")}`
              : "No payout scheduled"
          }
          icon={Wallet}        color="bg-indigo-400/10 text-indigo-400"
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
              ["Print COGS",              `(${fmt(printCogsCents)})`, useSnapshots ? "from closed month records" : `${totalItems} items × per-product print cost`],
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

      {/* Monthly revenue chart */}
      <SectionCard title={`Monthly Net Revenue — ${selectedYear}`}>
        {monthlyChartData.every((d) => d.netRevenue === 0) ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            No revenue recorded yet for {selectedYear}.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
              <Bar dataKey="netRevenue" name="Net Revenue" fill="#fde047" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Monthly-close grid */}
      <SectionCard title={`Monthly Close — ${selectedYear}`}>
        <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground mb-5">
          Books close automatically on the 1st of each month. If something looks off in a closed month,
          click it to add an annotation — your accountant will see it. Do not panic.
        </div>

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
                {snap ? (
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
            <p>For POURnogravy, your main cost is the print shop. The numbers here use each product&apos;s actual per-item cost (set on the Products tab), falling back to a ~$12/item estimate for anything without a cost on file.</p>
            <p>You can also deduct: platform/tool subscriptions, shipping supplies, advertising, home office if applicable. Keep receipts.</p>
            <p>The actual print cost is on the Invoice Tracker page — that&apos;s what you actually owe the printer.</p>
          </Disclosure>

          <Disclosure title="Why doesn't this match my bank balance?">
            <p>This page shows <em>accrual-basis</em> numbers — revenue when orders are placed, costs at each product&apos;s actual per-item cost. Your bank shows cash when Stripe settles (usually 2 business days).</p>
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
                  const isRefunded = order.status === "refunded";
                  const isDisputed = order.status === "disputed";
                  const isNeutral  = isRefunded || isDisputed;
                  const revCents   = (order.total_cents ?? 0) - (order.shipping_cents ?? 0);
                  const cogsCents  = cogsForOrder(order.id);
                  const profCents  = isNeutral ? 0 : revCents - cogsCents;
                  return (
                    <tr key={order.id} className={`transition-colors ${isNeutral ? "opacity-50" : "hover:bg-muted/30"}`}>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.created_at), "MMM d")}
                      </td>
                      <td className={`py-2.5 pr-4 font-mono text-xs tabular-nums ${isNeutral ? "line-through text-muted-foreground" : ""}`}>
                        {fmt(revCents)}
                      </td>
                      <td className={`py-2.5 pr-4 font-mono text-xs tabular-nums ${isNeutral ? "text-muted-foreground" : "text-orange-400"}`}>
                        {isNeutral ? "—" : `(${fmt(cogsCents)})`}
                      </td>
                      <td className={`py-2.5 pr-4 font-mono text-xs tabular-nums font-semibold ${isNeutral ? "text-muted-foreground" : profCents >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {isNeutral ? "—" : fmt(profCents)}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${isRefunded ? "border-rose-500/40 text-rose-400" : isDisputed ? "border-amber-500/40 text-amber-400" : ""}`}
                        >
                          {order.status}
                        </Badge>
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
