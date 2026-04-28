import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ShoppingBag, DollarSign, MessageSquare, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [ordersToday, pendingRequests, lowStock] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_cents")
          .gte("created_at", todayIso),
        supabase
          .from("custom_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["new", "contacted", "quoted"]),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .lt("inventory_count", 5)
          .eq("is_active", true),
      ]);

      return {
        ordersToday: ordersToday.data?.length ?? 0,
        revenueToday: (ordersToday.data ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0),
        pendingRequests: pendingRequests.count ?? 0,
        lowStock: lowStock.count ?? 0,
      };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-recent-orders"],
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

  const { data: recentRequests } = useQuery({
    queryKey: ["admin-recent-requests"],
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders today"
          value={isLoading ? "—" : String(stats?.ordersToday ?? 0)}
          icon={ShoppingBag}
        />
        <StatCard
          label="Revenue today"
          value={isLoading ? "—" : fmtMoney(stats?.revenueToday ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          label="Pending requests"
          value={isLoading ? "—" : String(stats?.pendingRequests ?? 0)}
          icon={MessageSquare}
        />
        <StatCard
          label="Low stock"
          value={isLoading ? "—" : String(stats?.lowStock ?? 0)}
          icon={AlertTriangle}
          warning={(stats?.lowStock ?? 0) > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display tracking-widest">RECENT ORDERS</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentOrders ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No orders yet.
              </p>
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
            {!recentRequests ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nothing yet.
              </p>
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
                      <p className="text-xs text-muted-foreground truncate">
                        {r.garment}
                      </p>
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
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  warning,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  warning?: boolean;
}) => (
  <Card className={warning ? "border-destructive/50" : undefined}>
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
