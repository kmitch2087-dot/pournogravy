import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { TrendingUp, ShoppingCart, DollarSign, MousePointerClick, Eye, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyRevenue { day: string; revenue: number; purchases: number; }
interface FunnelRow    { event_type: string; sessions: number; }
interface TopProduct   { product_id: string; views: number; cart_adds: number; purchases: number; }

// ─── Data hooks ──────────────────────────────────────────────────────────────

const useRevenue = () =>
  useQuery<DailyRevenue[]>({
    queryKey: ["analytics-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_daily_revenue" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as DailyRevenue[];
    },
    staleTime: 60_000,
  });

const useFunnel = () =>
  useQuery<FunnelRow[]>({
    queryKey: ["analytics-funnel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_funnel" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as FunnelRow[];
    },
    staleTime: 60_000,
  });

const useTopProducts = () =>
  useQuery<TopProduct[]>({
    queryKey: ["analytics-top-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_top_products" as never)
        .select("*");
      if (error) throw error;
      return (data ?? []) as TopProduct[];
    },
    staleTime: 60_000,
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start"
  >
    <div className={`p-2.5 rounded-lg ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-display tracking-widest uppercase">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name === "revenue" ? `$${Number(p.value).toFixed(2)}` : p.value} {p.name}
        </p>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { data: revenue, isLoading: revLoading } = useRevenue();
  const { data: funnel,  isLoading: funnelLoading } = useFunnel();
  const { data: topProducts, isLoading: topLoading } = useTopProducts();

  // Derived stats
  const totalRevenue   = revenue?.reduce((s, r) => s + Number(r.revenue), 0) ?? 0;
  const totalOrders    = revenue?.reduce((s, r) => s + Number(r.purchases), 0) ?? 0;
  const avgOrderValue  = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const funnelMap = Object.fromEntries(
    (funnel ?? []).map((r) => [r.event_type, Number(r.sessions)])
  );
  const pageViews     = funnelMap["page_view"]      ?? 0;
  const cartAdds      = funnelMap["add_to_cart"]    ?? 0;
  const checkouts     = funnelMap["checkout_start"] ?? 0;
  const purchases     = funnelMap["purchase"]       ?? 0;
  const conversionPct = pageViews > 0 ? ((purchases / pageViews) * 100).toFixed(1) : "0.0";

  // Chart data — fill missing days with $0 so the area chart looks continuous
  const chartData = (revenue ?? []).map((r) => ({
    date: format(parseISO(r.day), "MMM d"),
    revenue: Number(r.revenue),
    orders: Number(r.purchases),
  }));

  // Funnel display rows
  const funnelSteps = [
    { label: "Page Views",      value: pageViews,  icon: Eye,             pct: 100 },
    { label: "Add to Cart",     value: cartAdds,   icon: ShoppingCart,    pct: pageViews > 0 ? Math.round((cartAdds / pageViews) * 100) : 0 },
    { label: "Checkout Start",  value: checkouts,  icon: MousePointerClick, pct: pageViews > 0 ? Math.round((checkouts / pageViews) * 100) : 0 },
    { label: "Purchase",        value: purchases,  icon: Package,         pct: pageViews > 0 ? Math.round((purchases / pageViews) * 100) : 0 },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl tracking-widest">ANALYTICS</h1>
        <p className="text-sm text-muted-foreground mt-1">Last 30 days · Updates on every page load</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Revenue"       value={`$${totalRevenue.toFixed(2)}`}  sub="last 30 days"  icon={DollarSign}       color="bg-amber-400/10 text-amber-400" />
        <StatCard label="Orders"        value={String(totalOrders)}            sub="paid orders"   icon={ShoppingCart}     color="bg-blue-400/10 text-blue-400"   />
        <StatCard label="Avg Order"     value={`$${avgOrderValue.toFixed(2)}`} sub="per purchase"  icon={TrendingUp}       color="bg-green-400/10 text-green-400" />
        <StatCard label="Conversion"    value={`${conversionPct}%`}            sub="view → buy"    icon={MousePointerClick} color="bg-purple-400/10 text-purple-400" />
      </div>

      {/* Revenue chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-6">Daily Revenue — Last 30 Days</h2>
        {revLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            No revenue data yet — first sale will light this up 🍺
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#fde047" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#fde047" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#fde047" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Funnel + Top Products row */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Conversion funnel */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-6">Conversion Funnel — Last 30 Days</h2>
          {funnelLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const Icon = step.icon;
                const barColors = ["#fde047", "#f59e0b", "#fb923c", "#22c55e"];
                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {step.label}
                      </span>
                      <span className="font-mono font-semibold">
                        {step.value.toLocaleString()}
                        <span className="text-muted-foreground text-xs ml-1">({step.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColors[i] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${step.pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-display text-sm tracking-widest text-muted-foreground uppercase mb-6">Top Products — Last 30 Days</h2>
          {topLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : !topProducts || topProducts.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Start getting traffic and products will rank here
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={topProducts.slice(0, 8).map((p) => ({
                  name: p.product_id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 22),
                  views: p.views,
                  cart: p.cart_adds,
                }))}
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="views" fill="#fde047" radius={[0, 4, 4, 0]} />
                <Bar dataKey="cart"  fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Empty state tip */}
      {!revLoading && totalOrders === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-6 text-center"
        >
          <p className="font-display tracking-widest text-amber-400 text-sm">ANALYTICS PIPELINE IS LIVE</p>
          <p className="text-sm text-muted-foreground mt-2">
            Page views are already being tracked. Revenue, funnel, and product data will populate as soon as real orders start flowing.
          </p>
        </motion.div>
      )}
    </div>
  );
}
