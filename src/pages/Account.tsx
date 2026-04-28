import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Package, LogOut, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  currency: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
}

const Account = () => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: { pathname: "/account" } } });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, status, total_cents, currency, tracking_number, tracking_carrier")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error("Couldn't load your orders");
        console.error(error);
      } else {
        setOrders(data ?? []);
      }
      setOrdersLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
      </div>
    );
  }

  const fmt = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-2">
              Your tab
            </p>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest">
              {profile?.display_name || user.email?.split("@")[0]?.toUpperCase() || "ACCOUNT"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" className="h-10 font-display tracking-widest gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
            <Button
              onClick={() => signOut()}
              variant="outline"
              className="h-10 font-display tracking-widest gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        <section className="border border-[#fde047]/20 bg-card">
          <header className="px-6 py-4 border-b border-[#fde047]/20 flex items-center gap-2">
            <Package className="h-4 w-4 text-[#fde047]" />
            <h2 className="font-display tracking-widest text-sm">ORDER HISTORY</h2>
          </header>

          {ordersLoading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="font-marker text-muted-foreground italic">
                "No tab open yet. Go pour yourself something."
              </p>
              <Link to="/shop">
                <Button className="h-11 px-6 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90">
                  ORDER A ROUND
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#fde047]/10">
              {orders.map((order) => (
                <li key={order.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display tracking-widest text-sm">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()} · {order.status}
                    </p>
                    {order.tracking_number && (
                      <p className="text-xs text-[#fde047] mt-1">
                        {order.tracking_carrier ?? "Tracking"}: {order.tracking_number}
                      </p>
                    )}
                  </div>
                  <p className="font-display tracking-widest">
                    {fmt(order.total_cents, order.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default Account;
