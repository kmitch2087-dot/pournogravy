import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useLoyalty } from "@/hooks/useLoyalty";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Package, LogOut, LayoutDashboard, Star, Gift, Heart, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LoyaltyRules {
  points_per_dollar: number;
  redemption_threshold: number;
  redemption_value_cents: number;
  double_points_active: boolean;
  double_points_end: string | null;
}

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
  const { account, transactions, loading: loyaltyLoading, redeem, rewardsAvailable, pointsToNextReward } = useLoyalty();
  const navigate = useNavigate();
  const [redeeming, setRedeeming] = useState(false);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: { pathname: "/account" } } });
    }
  }, [loading, user, navigate]);

  const { data: rules } = useQuery<LoyaltyRules | null>({
    queryKey: ["loyalty-rules"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_rules")
        .select("points_per_dollar, redemption_threshold, redemption_value_cents, double_points_active, double_points_end")
        .eq("id", 1)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderRow[]>({
    queryKey: ["account-orders", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, status, total_cents, currency, tracking_number, tracking_carrier")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Couldn't load your orders");
        return [];
      }
      return data ?? [];
    },
  });

  const handleRedeem = async () => {
    setRedeeming(true);
    const result = await redeem();
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setRedeemedCode(result.code);
      toast.success(`Code created: ${result.code}`);
    }
    setRedeeming(false);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
      </div>
    );
  }
  if (!user) return null;

  const fmt = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

  const balance = account?.points_balance ?? 0;
  const threshold = rules?.redemption_threshold ?? 100;
  const progressPct = Math.min(100, ((balance % threshold) / threshold) * 100);

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-2">Your tab</p>
            <h1 className="font-display text-4xl md:text-5xl tracking-widest">
              {profile?.display_name || user.email?.split("@")[0]?.toUpperCase() || "ACCOUNT"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" className="h-10 font-display tracking-widest gap-2">
                  <LayoutDashboard className="h-4 w-4" />Admin
                </Button>
              </Link>
            )}
            <Link to="/wishlist">
              <Button variant="outline" className="h-10 font-display tracking-widest gap-2">
                <Heart className="h-4 w-4" />Wishlist
              </Button>
            </Link>
            <Button onClick={() => signOut()} variant="outline" className="h-10 font-display tracking-widest gap-2">
              <LogOut className="h-4 w-4" />Sign out
            </Button>
          </div>
        </div>

        {/* Pour Points card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative border border-[#fde047]/30 bg-card overflow-hidden"
        >
          {/* Glow */}
          <div aria-hidden className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(253,224,71,0.06), transparent 60%)" }} />

          <header className="px-6 py-4 border-b border-[#fde047]/20 flex items-center gap-2">
            <Star className="h-4 w-4 text-[#fde047] fill-[#fde047]" />
            <h2 className="font-display tracking-widest text-sm">POUR POINTS</h2>
            <span className="ml-auto text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
              {rules
                ? `${rules.points_per_dollar} pts per $1 · ${rules.redemption_threshold} pts = $${(rules.redemption_value_cents / 100).toFixed(0)} off`
                : "pts per $1 · redeem for rewards"}
            </span>
          </header>

          {/* Double Points Banner */}
          {rules?.double_points_active && (
            <div className="px-6 py-3 border-b border-yellow-400/20 bg-yellow-400/10 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#fde047] fill-[#fde047] shrink-0" />
              <p className="text-xs font-marker tracking-widest text-[#fde047]">
                DOUBLE POINTS ACTIVE
                {rules.double_points_end && (
                  <span className="text-white/50 ml-2 normal-case tracking-normal font-sans">
                    — ends {new Date(rules.double_points_end).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="px-6 py-6">
            {loyaltyLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Balance + progress */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-marker mb-1">Current Balance</p>
                  <p className="font-display text-5xl tracking-wider text-[#fde047]"
                    style={{ textShadow: "0 0 20px rgba(253,224,71,0.4)" }}>
                    {balance.toLocaleString()}
                    <span className="text-lg text-muted-foreground ml-2">pts</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {account?.lifetime_points?.toLocaleString() ?? 0} lifetime points earned
                  </p>
                  {rules && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      You earn {rules.points_per_dollar} pts per $1 spent · redeem every {rules.redemption_threshold} pts for ${(rules.redemption_value_cents / 100).toFixed(0)} off
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{balance % threshold} / {threshold} pts to next reward</span>
                      {rewardsAvailable > 0 && (
                        <span className="text-[#fde047]">{rewardsAvailable} reward{rewardsAvailable !== 1 ? "s" : ""} ready</span>
                      )}
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #fde047, #f59e0b)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>

                  {/* Redeem button */}
                  <div className="mt-5">
                    {redeemedCode ? (
                      <div className="border border-[#fde047]/40 bg-[#fde047]/5 rounded p-3">
                        <p className="text-xs text-muted-foreground mb-1">Your discount code:</p>
                        <p className="font-mono text-lg text-[#fde047] font-bold tracking-widest">{redeemedCode}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Apply this at checkout for $5 off. Valid 30 days.</p>
                      </div>
                    ) : (
                      <Button
                        onClick={handleRedeem}
                        disabled={rewardsAvailable === 0 || redeeming}
                        className="h-10 font-display tracking-widest gap-2 bg-[#fde047] text-black hover:bg-[#fde047]/90 disabled:opacity-40"
                      >
                        {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                        {rewardsAvailable > 0 ? `Redeem ${threshold} pts for $${((rules?.redemption_value_cents ?? 500) / 100).toFixed(0)} off` : `${pointsToNextReward} pts to next reward`}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Recent transactions */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-marker mb-3">Recent Activity</p>
                  {transactions.length === 0 ? (
                    <p className="text-base text-white italic">No activity yet — make your first order to earn points.</p>
                  ) : (
                    <ul className="space-y-2">
                      {transactions.map((tx) => (
                        <li key={tx.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="text-xs">{tx.description ?? tx.type}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`font-display text-sm tracking-wider ${tx.points > 0 ? "text-[#fde047]" : "text-muted-foreground"}`}>
                            {tx.points > 0 ? "+" : ""}{tx.points} pts
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Order history */}
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
              <p className="font-marker text-base text-white italic">
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
                    <p className="font-display tracking-widest text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()} · {order.status}
                    </p>
                    {order.tracking_number && (
                      <p className="text-xs text-[#fde047] mt-1">
                        {order.tracking_carrier ?? "Tracking"}: {order.tracking_number}
                      </p>
                    )}
                  </div>
                  <p className="font-display tracking-widest">{fmt(order.total_cents, order.currency)}</p>
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
