import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  TrendingUp, ShoppingCart, DollarSign, MousePointerClick,
  Eye, Package, AlertTriangle, RefreshCw, ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRevenue  { day: string; revenue: number; purchases: number; }
interface FunnelRow     { event_type: string; sessions: number; }
interface TopProduct    { product_id: string; views: number; cart_adds: number; purchases: number; }
interface RecentOrder   { id: string; created_at: string; total_cents: number; status: string; email?: string; }
interface RevenueByProduct { product_name: string; revenue: number; units: number; }
interface SizeRow       { size: string; count: number; }
interface RepeatCustomer { email: string; order_count: number; }

// ─── Data hooks ───────────────────────────────────────────────────────────────

const useRevenue = () =>
  useQuery<DailyRevenue[]>({
    queryKey: ["analytics-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.from("analytics_daily_revenue" as never).select("*");
      if (error) throw error;
      return (data ?? []) as DailyRevenue[];
    },
    staleTime: 60_000,
  });

const useFunnel = () =>
  useQuery<FunnelRow[]>({
    queryKey: ["analytics-funnel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("analytics_funnel" as never).select("*");
      if (error) throw error;
      return (data ?? []) as FunnelRow[];
    },
    staleTime: 60_000,
  });

const useTopProducts = () =>
  useQuery<TopProduct[]>({
    queryKey: ["analytics-top-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("analytics_top_products" as never).select("*");
      if (error) throw error;
      return (data ?? []) as TopProduct[];
    },
    staleTime: 60_000,
  });

const useRecentOrders = () =>
  useQuery<RecentOrder[]>({
    queryKey: ["analytics-recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total_cents, status, email")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as RecentOrder[];
    },
    staleTime: 30_000,
  });

const useRevenueByProduct = () =>
  useQuery<RevenueByProduct[]>({
    queryKey: ["analytics-revenue-by-product"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("unit_price_cents, quantity, product_snapshot");
      if (error) throw error;
      const map = new Map<string, { revenue: number; units: number }>();
      for (const row of (data ?? [])) {
        const snap = row.product_snapshot as Record<string, unknown> | null;
        const name = (snap?.name as string | null) ?? "Unknown Product";
        const rev = ((row.unit_price_cents ?? 0) * (row.quantity ?? 1)) / 100;
        const existing = map.get(name) ?? { revenue: 0, units: 0 };
        map.set(name, { revenue: existing.revenue + rev, units: existing.units + (row.quantity ?? 1) });
      }
      return Array.from(map.entries())
        .map(([product_name, vals]) => ({ product_name, ...vals }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 12);
    },
    staleTime: 60_000,
  });

const useSizeDistribution = () =>
  useQuery<SizeRow[]>({
    queryKey: ["analytics-size-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("product_snapshot, quantity");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of (data ?? [])) {
        const snap = row.product_snapshot as Record<string, unknown> | null;
        const size = (snap?.size as string | null) ?? (snap?.variant as string | null) ?? "N/A";
        map.set(size, (map.get(size) ?? 0) + (row.quantity ?? 1));
      }
      return Array.from(map.entries())
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000,
  });

const useRepeatCustomers = () =>
  useQuery<{ repeatCount: number; totalCount: number }>({
    queryKey: ["analytics-repeat-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("email")
        .not("email", "is", null);
      if (error) throw error;
      const emailCounts = new Map<string, number>();
      for (const row of (data ?? [])) {
        if (row.email) emailCounts.set(row.email, (emailCounts.get(row.email) ?? 0) + 1);
      }
      const totalCount = emailCounts.size;
      const repeatCount = [...emailCounts.values()].filter((c) => c > 1).length;
      return { repeatCount, totalCount };
    },
    staleTime: 60_000,
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({
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

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-6">
    <h2 className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase mb-5">{title}</h2>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg space-y-1">
      <p className="text-muted-foreground font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4">
          <span className="capitalize">{p.name}</span>
          <span className="font-bold tabular-nums">
            {p.name === "revenue" ? `$${Number(p.value).toFixed(2)}` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

const orderStatusColor: Record<string, string> = {
  paid:      "bg-green-500/10 text-green-400 border-green-500/20",
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  refunded:  "bg-red-500/10 text-red-400 border-red-500/20",
  fulfilled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { data: revenue,        isLoading: revLoading,    refetch: refetchRevenue } = useRevenue();
  const { data: funnel,         isLoading: funnelLoading                          } = useFunnel();
  const { data: topProducts,    isLoading: topLoading                             } = useTopProducts();
  const { data: recentOrders,   isLoading: ordersLoading                          } = useRecentOrders();
  const { data: revenueByProd,  isLoading: revByProdLoading                       } = useRevenueByProduct();
  const { data: sizeData,       isLoading: sizeLoading                            } = useSizeDistribution();
  const { data: repeatData                                                         } = useRepeatCustomers();

  // ── Derived KPIs ──
  const totalRevenue  = revenue?.reduce((s, r) => s + Number(r.revenue), 0)   ?? 0;
  const totalOrders   = revenue?.reduce((s, r) => s + Number(r.purchases), 0) ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const funnelMap  = Object.fromEntries((funnel ?? []).map((r) => [r.event_type, Number(r.sessions)]));
  const pageViews  = funnelMap["page_view"]      ?? 0;
  const cartAdds   = funnelMap["add_to_cart"]    ?? 0;
  const checkouts  = funnelMap["checkout_start"] ?? 0;
  const purchases  = funnelMap["purchase"]       ?? 0;

  const conversionPct      = pageViews > 0   ? ((purchases  / pageViews)  * 100).toFixed(1) : "0.0";
  const abandonmentPct     = cartAdds  > 0   ? (((cartAdds  - purchases)  / cartAdds) * 100).toFixed(1) : "0.0";

  // ── Funnel steps with step-to-step conversion ──
  const funnelSteps = [
    {
      label: "Page Views",
      value: pageViews,
      icon: Eye,
      color: "#fde047",
      barPct: 100,
      stepLabel: null,
      stepPct: null,
    },
    {
      label: "Add to Cart",
      value: cartAdds,
      icon: ShoppingCart,
      color: "#f59e0b",
      barPct: pageViews > 0 ? Math.round((cartAdds / pageViews) * 100) : 0,
      stepLabel: "view → cart",
      stepPct: pageViews > 0 ? ((cartAdds / pageViews) * 100).toFixed(1) : null,
    },
    {
      label: "Checkout Start",
      value: checkouts,
      icon: MousePointerClick,
      color: "#fb923c",
      barPct: pageViews > 0 ? Math.round((checkouts / pageViews) * 100) : 0,
      stepLabel: "cart → checkout",
      stepPct: cartAdds > 0 ? ((checkouts / cartAdds) * 100).toFixed(1) : null,
    },
    {
      label: "Purchase",
      value: purchases,
      icon: Package,
      color: "#22c55e",
      barPct: pageViews > 0 ? Math.round((purchases / pageViews) * 100) : 0,
      stepLabel: "checkout → buy",
      stepPct: checkouts > 0 ? ((purchases / checkouts) * 100).toFixed(1) : null,
    },
  ];

  // ── Revenue chart ──
  const chartData = (revenue ?? []).map((r) => ({
    date:    format(parseISO(r.day.replace(" ", "T")), "MMM d"),
    revenue: Number(r.revenue),
    orders:  Number(r.purchases),
  }));

  // ── Top products chart data ──
  const topChartData = (topProducts ?? []).slice(0, 8).map((p) => ({
    name:     p.product_id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 22),
    views:    p.views,
    cart:     p.cart_adds,
    purchases: p.purchases,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-widest">ANALYTICS</h1>
          <p className="text-xs text-muted-foreground mt-1 font-marker tracking-widest">
            LAST 30 DAYS · LIVE DATA
          </p>
        </div>
        <button
          onClick={() => refetchRevenue()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI cards — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard delay={0}    label="Revenue"        value={`$${totalRevenue.toFixed(2)}`}  sub="last 30 days"   icon={DollarSign}        color="bg-amber-400/10 text-amber-400"  />
        <StatCard delay={0.04} label="Orders"         value={String(totalOrders)}            sub="paid orders"    icon={ShoppingCart}      color="bg-blue-400/10 text-blue-400"    />
        <StatCard delay={0.08} label="Avg Order"      value={`$${avgOrderValue.toFixed(2)}`} sub="per purchase"   icon={TrendingUp}        color="bg-green-400/10 text-green-400"  />
        <StatCard delay={0.12} label="Conversion"     value={`${conversionPct}%`}            sub="view → buy"     icon={MousePointerClick} color="bg-purple-400/10 text-purple-400" />
        <StatCard delay={0.16} label="Cart Abandon"   value={`${abandonmentPct}%`}           sub="added, didn't buy" icon={AlertTriangle} color="bg-red-400/10 text-red-400"     />
      </div>

      {/* Revenue + Orders chart */}
      <SectionCard title="Revenue & Orders — Last 30 Days">
        {revLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            No revenue data yet — first sale will light this up 🍺
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#fde047" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fde047" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="rev"    tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area yAxisId="rev"    type="monotone" dataKey="revenue" stroke="#fde047" strokeWidth={2} fill="url(#revenueGrad)" />
              <Area yAxisId="orders" type="monotone" dataKey="orders"  stroke="#60a5fa" strokeWidth={1.5} fill="url(#ordersGrad)" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Funnel + Top Products */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Conversion funnel — step to step */}
        <SectionCard title="Conversion Funnel — Last 30 Days">
          {funnelLoading ? (
            <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <div className="space-y-4">
              {funnelSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    {/* Step-to-step arrow */}
                    {step.stepPct && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 pl-0.5">
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span>{step.stepLabel}:</span>
                        <span className="font-bold" style={{ color: step.color }}>{step.stepPct}%</span>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" style={{ color: step.color }} />
                          {step.label}
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {step.value.toLocaleString()}
                          <span className="text-muted-foreground text-xs ml-1.5">of total</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: step.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${step.barPct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.08 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Top products */}
        <SectionCard title="Top Products — Last 30 Days">
          {topLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !topProducts || topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm text-center">
              Start getting traffic and products will rank here
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                layout="vertical"
                data={topChartData}
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="views"     fill="#fde047" radius={[0, 3, 3, 0]} />
                <Bar dataKey="cart"      fill="#f59e0b" radius={[0, 3, 3, 0]} />
                <Bar dataKey="purchases" fill="#22c55e" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Recent Orders table */}
      <SectionCard title="Recent Orders">
        {ordersLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !recentOrders || recentOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <Package className="h-8 w-8 mx-auto mb-3 opacity-30" />
            No orders yet. The tab's still open.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-display tracking-widest uppercase pb-3 pr-4">Order</th>
                  <th className="text-left text-xs text-muted-foreground font-display tracking-widest uppercase pb-3 pr-4">Date</th>
                  <th className="text-left text-xs text-muted-foreground font-display tracking-widest uppercase pb-3 pr-4">Customer</th>
                  <th className="text-right text-xs text-muted-foreground font-display tracking-widest uppercase pb-3 pr-4">Amount</th>
                  <th className="text-left text-xs text-muted-foreground font-display tracking-widest uppercase pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.created_at), "MMM d, h:mm a")}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground truncate max-w-[160px]">
                      {order.email ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums">
                      ${((order.total_cents ?? 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${orderStatusColor[order.status] ?? "bg-muted/30 text-muted-foreground border-border"}`}>
                        {order.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Repeat Customer Rate + Revenue by Product */}
      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Revenue by Product">
          {revByProdLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : !revenueByProd || revenueByProd.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={revenueByProd} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="product_name" width={120} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#fde047" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Size Distribution">
          {sizeLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : !sizeData || sizeData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No order data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sizeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="size" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Repeat Customer Rate */}
      {repeatData && repeatData.totalCount > 0 && (
        <SectionCard title="Customer Loyalty">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-bold tabular-nums">
                {repeatData.totalCount > 0
                  ? `${((repeatData.repeatCount / repeatData.totalCount) * 100).toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">repeat customer rate</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{repeatData.repeatCount} customers ordered more than once</p>
              <p>{repeatData.totalCount} unique customers total</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Pipeline live notice */}
      {!revLoading && totalOrders === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-5 text-center"
        >
          <p className="font-display tracking-widest text-amber-400 text-xs">ANALYTICS PIPELINE IS LIVE</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            Page views are already being tracked via the <code className="text-amber-400">track-event</code> edge function.
            Revenue, funnel, and order data populate the moment real sales start flowing.
          </p>
        </motion.div>
      )}

    </div>
  );
}
