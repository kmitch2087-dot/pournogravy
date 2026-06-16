import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { ShoppingBag, DollarSign, MessageSquare, Loader2, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";

const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ── Stat detail dialog ─────────────────────────────────────────────────────────

type DialogType = "orders-today" | "pending-requests" | "total-revenue" | "pending-fulfillment" | null;

const DIALOG_TITLES: Record<NonNullable<DialogType>, string> = {
  "orders-today": "Today's Orders",
  "pending-requests": "Pending Custom Requests",
  "total-revenue": "All Paid Orders",
  "pending-fulfillment": "Orders Awaiting Fulfillment",
};

const StatDetailDialog = ({
  open,
  type,
  onClose,
}: {
  open: boolean;
  type: DialogType;
  onClose: () => void;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["stat-detail", type],
    enabled: open && !!type,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!type) return null;

      if (type === "orders-today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data, error } = await supabase
          .from("orders")
          .select("id, email, total_cents, status, created_at")
          .gte("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false });
        if (error) throw error;
        return { kind: "orders" as const, rows: data ?? [] };
      }

      if (type === "pending-requests") {
        const { data, error } = await supabase
          .from("custom_requests")
          .select("id, name, email, garment, status, created_at")
          .in("status", ["new", "contacted", "quoted"])
          .order("created_at", { ascending: false });
        if (error) throw error;
        return { kind: "requests" as const, rows: data ?? [] };
      }

      if (type === "total-revenue") {
        const { data, error } = await supabase
          .from("orders")
          .select("id, email, total_cents, status, created_at")
          .in("status", ["paid", "fulfilled", "shipped", "delivered"])
          .order("created_at", { ascending: false });
        if (error) throw error;
        return { kind: "orders" as const, rows: data ?? [] };
      }

      if (type === "pending-fulfillment") {
        const { data, error } = await supabase
          .from("orders")
          .select("id, email, total_cents, status, created_at")
          .eq("status", "paid")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return { kind: "orders" as const, rows: data ?? [] };
      }

      return null;
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto font-ui">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-base uppercase">
            {type ? DIALOG_TITLES[type] : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? null : data.kind === "orders" ? (
          data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No records.</p>
          ) : (
            <div className="space-y-1">
              {data.rows.map((o) => (
                <Link
                  key={o.id}
                  to={`/admin/orders?id=${o.id}`}
                  onClick={onClose}
                  className="flex justify-between items-center text-sm hover:bg-muted/50 -mx-2 px-2 py-2 rounded transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{o.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(o.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                    <span className="font-display tracking-wider">{fmtMoney(o.total_cents)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : data.kind === "requests" ? (
          data.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No records.</p>
          ) : (
            <div className="space-y-1">
              {data.rows.map((r) => (
                <Link
                  key={r.id}
                  to={`/admin/custom-requests?id=${r.id}`}
                  onClick={onClose}
                  className="flex justify-between items-center text-sm hover:bg-muted/50 -mx-2 px-2 py-2 rounded transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.email} — {r.garment}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 ml-4">{r.status}</Badge>
                </Link>
              ))}
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [ordersToday, pendingRequests, allPaidOrders, pendingFulfillment] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_cents")
          .gte("created_at", todayIso),
        supabase
          .from("custom_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["new", "contacted", "quoted"]),
        supabase
          .from("orders")
          .select("total_cents")
          .in("status", ["paid", "fulfilled", "shipped", "delivered"]),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "paid"),
      ]);

      return {
        ordersToday: ordersToday.data?.length ?? 0,
        revenueToday: (ordersToday.data ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0),
        pendingRequests: pendingRequests.count ?? 0,
        totalRevenue: (allPaidOrders.data ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0),
        pendingFulfillment: pendingFulfillment.count ?? 0,
      };
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-recent-orders"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, email, status, total_cents, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-recent-requests"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_requests")
        .select("id, name, email, garment, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const statLoading = isLoading && !stats;

  return (
    <div className="space-y-6 font-ui">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={statLoading ? "—" : fmtMoney(stats?.totalRevenue ?? 0)}
          icon={TrendingUp}
          onClick={() => setActiveDialog("total-revenue")}
        />
        <StatCard
          label="Pending fulfillment"
          value={statLoading ? "—" : String(stats?.pendingFulfillment ?? 0)}
          icon={Clock}
          warning={(stats?.pendingFulfillment ?? 0) > 0}
          onClick={() => setActiveDialog("pending-fulfillment")}
        />
        <StatCard
          label="Pending requests"
          value={statLoading ? "—" : String(stats?.pendingRequests ?? 0)}
          icon={MessageSquare}
          onClick={() => setActiveDialog("pending-requests")}
        />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-2">
        <StatCard
          label="Orders today"
          value={statLoading ? "—" : String(stats?.ordersToday ?? 0)}
          icon={ShoppingBag}
          onClick={() => setActiveDialog("orders-today")}
        />
        <StatCard
          label="Revenue today"
          value={statLoading ? "—" : fmtMoney(stats?.revenueToday ?? 0)}
          icon={DollarSign}
          onClick={() => setActiveDialog("orders-today")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display tracking-widest">RECENT ORDERS</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading && !recentOrders ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !recentOrders || recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    to={`/admin/orders?id=${o.id}`}
                    className="flex justify-between items-center text-sm hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">{o.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(o.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {o.status}
                      </Badge>
                      <span className="font-display tracking-wider">
                        {fmtMoney(o.total_cents)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display tracking-widest">
              RECENT CUSTOM REQUESTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading && !recentRequests ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !recentRequests || recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nothing yet.</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((r) => (
                  <Link
                    key={r.id}
                    to={`/admin/custom-requests?id=${r.id}`}
                    className="flex justify-between items-center text-sm hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.garment}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {r.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StatDetailDialog
        open={activeDialog !== null}
        type={activeDialog}
        onClose={() => setActiveDialog(null)}
      />
    </div>
  );
};

// ── StatCard ───────────────────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  icon: Icon,
  warning,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  warning?: boolean;
  onClick?: () => void;
}) => (
  <Card
    className={[
      warning ? "border-destructive/50" : "",
      onClick ? "cursor-pointer hover:bg-muted/30 transition-colors" : "",
    ]
      .filter(Boolean)
      .join(" ")}
    onClick={onClick}
  >
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-marker text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl tracking-wider mt-2">{value}</p>
        </div>
        <Icon className={`h-5 w-5 ${warning ? "text-destructive" : "text-[#fde047]"}`} />
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
