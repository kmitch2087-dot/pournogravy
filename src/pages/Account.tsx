import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useLoyalty } from "@/hooks/useLoyalty";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Package, LogOut, LayoutDashboard, Star, Gift, Heart,
  Zap, MapPin, MessageSquare, ExternalLink, Trash2, Check, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  order_id: string;
  quantity: number;
  product_snapshot: Record<string, unknown> | null;
}

interface OrderRow {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  currency: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
  review_token: string | null;
  review_submitted_at: string | null;
}

interface ShippingAddress {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  is_primary: boolean;
}

interface LoyaltyRules {
  points_per_dollar: number;
  redemption_threshold: number;
  redemption_value_cents: number;
  double_points_active: boolean;
  double_points_end: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:      "text-muted-foreground border-border",
  paid:         "text-blue-400 border-blue-400/30",
  in_production:"text-orange-400 border-orange-400/30",
  fulfilled:    "text-orange-400 border-orange-400/30",
  shipped:      "text-[#fde047] border-[#fde047]/30",
  delivered:    "text-green-400 border-green-400/30",
  refunded:     "text-rose-400 border-rose-400/30",
  disputed:     "text-amber-400 border-amber-400/30",
};

function trackingUrl(carrier: string | null, number: string): string | null {
  if (!carrier || !number) return null;
  const c = carrier.toLowerCase();
  if (c.includes("usps"))  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${number}`;
  if (c.includes("ups"))   return `https://www.ups.com/track?tracknum=${number}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?tracknumbers=${number}`;
  return null;
}

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <header className="px-6 py-4 border-b border-[#fde047]/20 flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#fde047]" />
      <h2 className="font-display tracking-widest text-sm">{title}</h2>
    </header>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const Account = () => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const { wishlist } = useWishlist();
  const { account, transactions, loading: loyaltyLoading, redeem, rewardsAvailable, pointsToNextReward, programEnabled } = useLoyalty();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [redeeming, setRedeeming]     = useState(false);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [contactMsg, setContactMsg]   = useState("");
  const [contactOrderId, setContactOrderId] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true, state: { from: { pathname: "/account" } } });
    }
  }, [loading, user, navigate]);

  // ── Data queries ──────────────────────────────────────────────────────────

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
        .select("id, created_at, status, total_cents, currency, tracking_number, tracking_carrier, review_token, review_submitted_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) { toast.error("Couldn't load your orders"); return []; }
      return (data ?? []) as OrderRow[];
    },
  });

  const orderIds = orders.map((o) => o.id);

  const { data: allItems = [] } = useQuery<OrderItem[]>({
    queryKey: ["account-order-items", orderIds.join(",")],
    enabled: orderIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, order_id, quantity, product_snapshot")
        .in("order_id", orderIds);
      if (error) return [];
      return (data ?? []) as OrderItem[];
    },
  });

  const itemsByOrder = allItems.reduce<Record<string, OrderItem[]>>((acc, it) => {
    (acc[it.order_id] ??= []).push(it);
    return acc;
  }, {});

  const pendingReviews = orders.filter(
    (o) => o.review_submitted_at === null &&
           o.review_token !== null &&
           ["shipped", "delivered"].includes(o.status)
  );

  const { data: addresses = [], isLoading: addrLoading } = useQuery<ShippingAddress[]>({
    queryKey: ["account-addresses", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("shipping_addresses")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_primary", { ascending: false })
        .order("last_used_at", { ascending: false });
      return (data ?? []) as ShippingAddress[];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteAddr = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("shipping_addresses").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-addresses", user?.id] }),
  });

  const setPrimaryAddr = useMutation({
    mutationFn: async (id: string) => {
      await supabase.rpc("set_primary_shipping_address" as any, { p_address_id: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-addresses", user?.id] }),
  });

  const sendSupport = useMutation({
    mutationFn: async () => {
      if (!contactMsg.trim()) throw new Error("Please describe your issue.");
      const subject = contactOrderId.trim()
        ? `Support — Order #${contactOrderId.trim().toUpperCase()}`
        : "Support Request";
      const { error } = await supabase.from("inbox_messages" as any).insert({
        from_email: user!.email,
        from_name:  profile?.display_name || user!.email?.split("@")[0] || "Customer",
        subject,
        body_text: contactMsg.trim(),
        kind:   "customer_support",
        status: "unread",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContactMsg("");
      setContactOrderId("");
      toast.success("Message sent — we'll get back to you soon.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't send message."),
  });

  const handleRedeem = async () => {
    setRedeeming(true);
    const result = await redeem();
    if ("error" in result) toast.error(result.error);
    else { setRedeemedCode(result.code); toast.success(`Code created: ${result.code}`); }
    setRedeeming(false);
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#fde047]" />
      </div>
    );
  }
  if (!user) return null;

  const balance    = account?.points_balance ?? 0;
  const threshold  = rules?.redemption_threshold ?? 100;
  const progressPct = Math.min(100, ((balance % threshold) / threshold) * 100);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">

        {/* ── Header ── */}
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
                  <LayoutDashboard className="h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            <Link to="/wishlist">
              <Button variant="outline" className="h-10 font-display tracking-widest gap-2">
                <Heart className="h-4 w-4" />
                Wishlist{wishlist.length > 0 && ` (${wishlist.length})`}
              </Button>
            </Link>
            <Button onClick={() => signOut()} variant="outline" className="h-10 font-display tracking-widest gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

        {/* ── Pending review nudge ── */}
        {pendingReviews.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-[#fde047]/40 bg-[#fde047]/5 p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[#fde047] fill-[#fde047]" />
              <p className="font-display tracking-widest text-sm text-[#fde047]">
                {pendingReviews.length === 1 ? "YOU HAVE A REVIEW WAITING" : `${pendingReviews.length} ORDERS WAITING FOR YOUR REVIEW`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your experience helps other bartenders make the right call. Takes 60 seconds.
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingReviews.map((o) => {
                const items = itemsByOrder[o.id] ?? [];
                const label = items.length
                  ? (items[0].product_snapshot?.name as string | null) ?? `Order #${o.id.slice(0, 8).toUpperCase()}`
                  : `Order #${o.id.slice(0, 8).toUpperCase()}`;
                return (
                  <Link key={o.id} to={`/review?token=${o.review_token}`}>
                    <Button size="sm" className="h-9 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest gap-1.5 text-xs">
                      <Star className="h-3 w-3 fill-black" />
                      Review: {label}{items.length > 1 ? ` +${items.length - 1}` : ""}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ── Pour Points ── */}
        {programEnabled && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative border border-[#fde047]/30 bg-card overflow-hidden"
          >
            <div aria-hidden className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 0% 50%, rgba(253,224,71,0.06), transparent 60%)" }} />

            <SectionHeader icon={Star} title="POUR POINTS" />

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
                        {rules.points_per_dollar} pts per $1 spent · redeem every {rules.redemption_threshold} pts for ${(rules.redemption_value_cents / 100).toFixed(0)} off
                      </p>
                    )}
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
                    <div className="mt-5">
                      {redeemedCode ? (
                        <div className="border border-[#fde047]/40 bg-[#fde047]/5 rounded p-3">
                          <p className="text-xs text-muted-foreground mb-1">Your discount code:</p>
                          <p className="font-mono text-lg text-[#fde047] font-bold tracking-widest">{redeemedCode}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Apply at checkout for ${((rules?.redemption_value_cents ?? 500) / 100).toFixed(0)} off. Valid 30 days.</p>
                        </div>
                      ) : (
                        <Button
                          onClick={handleRedeem}
                          disabled={rewardsAvailable === 0 || redeeming}
                          className="h-10 font-display tracking-widest gap-2 bg-[#fde047] text-black hover:bg-[#fde047]/90 disabled:opacity-40"
                        >
                          {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                          {rewardsAvailable > 0
                            ? `Redeem ${threshold} pts for $${((rules?.redemption_value_cents ?? 500) / 100).toFixed(0)} off`
                            : `${pointsToNextReward} pts to next reward`}
                        </Button>
                      )}
                    </div>
                  </div>
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
                              <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
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
        )}

        {/* ── Order History ── */}
        <section className="border border-[#fde047]/20 bg-card">
          <SectionHeader icon={Package} title="ORDER HISTORY" />

          {ordersLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="font-marker text-base text-white italic">"No tab open yet. Go pour yourself something."</p>
              <Link to="/shop">
                <Button className="h-11 px-6 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90">
                  ORDER A ROUND
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#fde047]/10">
              {orders.map((order) => {
                const items       = itemsByOrder[order.id] ?? [];
                const tUrl        = order.tracking_number ? trackingUrl(order.tracking_carrier, order.tracking_number) : null;
                const canReview   = order.review_token && !order.review_submitted_at && ["shipped", "delivered"].includes(order.status);
                const statusColor = STATUS_COLORS[order.status] ?? "text-muted-foreground border-border";

                return (
                  <li key={order.id} className="px-6 py-5 space-y-3">
                    {/* Top row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-display tracking-widest text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-display tracking-widest text-sm">{fmt(order.total_cents, order.currency)}</p>
                        <span className={`text-[10px] font-display tracking-widest border px-2 py-0.5 ${statusColor}`}>
                          {order.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    {items.length > 0 && (
                      <ul className="space-y-0.5">
                        {items.map((it) => {
                          const s = it.product_snapshot ?? {};
                          const name = (s.name as string) ?? "Item";
                          const size = s.size as string | undefined;
                          const color = s.color as string | undefined;
                          return (
                            <li key={it.id} className="text-xs text-muted-foreground">
                              {it.quantity}× {name}
                              {size && ` · ${size}`}
                              {color && ` · ${color}`}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {/* Tracking + review actions */}
                    <div className="flex flex-wrap gap-2">
                      {order.tracking_number && (
                        tUrl ? (
                          <a href={tUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-8 text-xs font-display tracking-widest gap-1.5">
                              <ExternalLink className="h-3 w-3" />
                              TRACK: {order.tracking_number}
                            </Button>
                          </a>
                        ) : (
                          <span className="text-xs text-[#fde047] font-mono self-center">
                            {order.tracking_carrier ?? "Tracking"}: {order.tracking_number}
                          </span>
                        )
                      )}
                      {canReview && (
                        <Link to={`/review?token=${order.review_token}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs font-display tracking-widest gap-1.5 border-[#fde047]/40 text-[#fde047] hover:bg-[#fde047]/10">
                            <Star className="h-3 w-3 fill-[#fde047]" />
                            LEAVE A REVIEW
                          </Button>
                        </Link>
                      )}
                      {order.review_submitted_at && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400 self-center">
                          <Check className="h-3 w-3" /> Review submitted
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Shipping Addresses ── */}
        <section className="border border-[#fde047]/20 bg-card">
          <SectionHeader icon={MapPin} title="SHIPPING ADDRESSES" />

          {addrLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : addresses.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No saved addresses yet — they'll appear here after your first order.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#fde047]/10">
              {addresses.map((addr) => (
                <li key={addr.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {addr.is_primary && (
                        <span className="text-[9px] font-display tracking-widest uppercase text-[#fde047] border border-[#fde047]/40 px-1.5 py-0.5 leading-none">
                          Primary
                        </span>
                      )}
                      <p className="text-sm font-medium">{addr.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} {addr.zip} · {addr.country}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.is_primary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-[#fde047]"
                        title="Set as primary"
                        onClick={() => setPrimaryAddr.mutate(addr.id)}
                        disabled={setPrimaryAddr.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-red-400"
                      title="Delete address"
                      onClick={() => deleteAddr.mutate(addr.id)}
                      disabled={deleteAddr.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Wishlist ── */}
        <section className="border border-[#fde047]/20 bg-card">
          <SectionHeader icon={Heart} title="WISHLIST" />
          <div className="px-6 py-5 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {wishlist.length === 0
                ? "Nothing saved yet — tap the heart on any product to save it."
                : `${wishlist.length} item${wishlist.length !== 1 ? "s" : ""} saved`}
            </p>
            <Link to="/wishlist">
              <Button variant="outline" size="sm" className="h-9 font-display tracking-widest gap-1.5 text-xs">
                VIEW WISHLIST <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ── Get Help ── */}
        <section className="border border-[#fde047]/20 bg-card">
          <SectionHeader icon={MessageSquare} title="GET HELP" />
          <div className="px-6 py-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Something wrong with your order? Got a question? Send us a message and we'll sort it out.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Order ID (optional)</label>
                <input
                  type="text"
                  value={contactOrderId}
                  onChange={(e) => setContactOrderId(e.target.value)}
                  placeholder="e.g. A1B2C3D4"
                  maxLength={8}
                  className="w-full h-10 rounded-none border border-[rgba(253,224,71,0.2)] bg-[#0a0a0a] px-3 text-sm text-foreground focus:outline-none focus:border-[rgba(253,224,71,0.5)] font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Message *</label>
                <Textarea
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  placeholder="Describe your issue or question…"
                  rows={4}
                  className="resize-none bg-[#0a0a0a] border-[rgba(253,224,71,0.2)] focus:border-[rgba(253,224,71,0.5)] focus-visible:ring-0 rounded-none"
                  maxLength={2000}
                />
              </div>
              <Button
                onClick={() => sendSupport.mutate()}
                disabled={sendSupport.isPending || !contactMsg.trim()}
                className="h-11 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90 disabled:opacity-50"
              >
                {sendSupport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                SEND MESSAGE
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Prefer email?{" "}
              <a href="mailto:opie@pournogravy.com" className="text-[#fde047] hover:underline">
                opie@pournogravy.com
              </a>
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Account;
