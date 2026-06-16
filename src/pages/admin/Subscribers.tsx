import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Download, TrendingUp, User, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface Subscriber {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

// ── Subscriber Detail Dialog ───────────────────────────────────────────────────

const SubscriberDetailDialog = ({
  subscriber,
  onClose,
}: {
  subscriber: Subscriber | null;
  onClose: () => void;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["subscriber-detail", subscriber?.email],
    enabled: !!subscriber,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!subscriber) return null;

      const [profileRes, ordersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, created_at")
          .eq("email", subscriber.email)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("id, total_cents, status, created_at")
          .eq("email", subscriber.email)
          .order("created_at", { ascending: false }),
      ]);

      let loyaltyPoints: number | null = null;
      if (profileRes.data?.id) {
        const { data: loyalty } = await supabase
          .from("loyalty_accounts")
          .select("points_balance")
          .eq("user_id", profileRes.data.id)
          .maybeSingle();
        loyaltyPoints = loyalty?.points_balance ?? null;
      }

      return {
        profile: profileRes.data ?? null,
        orders: ordersRes.data ?? [],
        loyaltyPoints,
      };
    },
  });

  const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Dialog open={!!subscriber} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-base uppercase">
            Subscriber Detail
          </DialogTitle>
        </DialogHeader>

        {!subscriber ? null : (
          <div className="space-y-5">
            {/* Core subscriber info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#fde047]" />
                <p className="text-sm font-medium">{subscriber.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-marker tracking-widest uppercase text-[10px]">Source</span>
                  <p className="mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{subscriber.source}</Badge>
                  </p>
                </div>
                <div>
                  <span className="font-marker tracking-widest uppercase text-[10px]">Subscribed</span>
                  <p className="mt-0.5">{format(new Date(subscriber.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Account info */}
                {data?.profile ? (
                  <div className="border border-border rounded p-3 space-y-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-marker tracking-widest uppercase text-muted-foreground">
                        Has Account
                      </span>
                    </div>
                    {data.profile.display_name && (
                      <p className="text-sm">{data.profile.display_name}</p>
                    )}
                    {data.loyaltyPoints !== null && (
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-[#fde047]" />
                        <span className="text-sm">
                          <span className="font-display tracking-wider text-[#fde047]">
                            {data.loyaltyPoints.toLocaleString()}
                          </span>{" "}
                          <span className="text-xs text-muted-foreground">Pour Points</span>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No account — subscriber only.</p>
                )}

                {/* Orders */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-marker tracking-widest uppercase text-muted-foreground">
                      Orders ({data?.orders.length ?? 0})
                    </span>
                  </div>
                  {data?.orders.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No orders yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {data?.orders.map((o) => (
                        <div key={o.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground">
                            {format(new Date(o.created_at), "MMM d, yyyy")}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{o.status}</Badge>
                            <span className="font-display tracking-wider">{fmtMoney(o.total_cents)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Subscribers ────────────────────────────────────────────────────────────────

const Subscribers = () => {
  const [selected, setSelected] = useState<Subscriber | null>(null);

  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ["email-subscribers"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_subscribers")
        .select("id, email, source, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const exportCSV = () => {
    const rows = [
      ["Email", "Source", "Subscribed"],
      ...subscribers.map((s) => [
        s.email,
        s.source,
        new Date(s.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pournogravy-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group by week for sparkline data (last 8 weeks)
  const weeklyData = (() => {
    const weeks: Record<string, number> = {};
    const now = Date.now();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
      weeks[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of subscribers) {
      const week = new Date(
        Math.floor(new Date(s.created_at).getTime() / (7 * 24 * 60 * 60 * 1000)) * (7 * 24 * 60 * 60 * 1000)
      ).toISOString().slice(0, 10);
      if (week in weeks) weeks[week]++;
    }
    return Object.values(weeks);
  })();

  const maxWeek = Math.max(...weeklyData, 1);
  const recentCount = subscribers.filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-[#fde047]" />
            <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Total</p>
          </div>
          <p className="font-display text-3xl tracking-wider text-[#fde047]">{subscribers.length}</p>
        </div>
        <div className="border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">Last 30 days</p>
          </div>
          <p className="font-display text-3xl tracking-wider text-green-400">{recentCount}</p>
        </div>
        {/* Sparkline */}
        <div className="border border-border bg-card p-5 col-span-2 md:col-span-1">
          <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase mb-3">8-week trend</p>
          <div className="flex items-end gap-1 h-10">
            {weeklyData.map((v, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${(v / maxWeek) * 100}%` }}
                transition={{ delay: i * 0.05 }}
                className="flex-1 bg-[#fde047]/60 rounded-sm min-h-[2px]"
              />
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Mail className="h-4 w-4 text-[#fde047]" />
          <h2 className="font-display tracking-widest text-sm flex-1">EMAIL SUBSCRIBERS</h2>
          {subscribers.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs font-display tracking-widest gap-1.5" onClick={exportCSV}>
              <Download className="h-3 w-3" />Export CSV
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-marker text-muted-foreground italic">No subscribers yet.</p>
            <p className="text-xs text-muted-foreground mt-2">Email signups from the homepage will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {subscribers.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setSelected(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(s)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <p className="text-sm truncate">{s.email}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-marker tracking-widest uppercase">{s.source}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SubscriberDetailDialog subscriber={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default Subscribers;
