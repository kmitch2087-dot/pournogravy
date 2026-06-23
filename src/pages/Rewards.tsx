import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLoyalty } from "@/hooks/useLoyalty";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Beer, Gift, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface LoyaltyRules {
  points_per_dollar: number;
  redemption_threshold: number;
  redemption_value_cents: number;
  double_points_active: boolean;
  double_points_end: string | null;
  double_points_start: string | null;
}

// ─── Countdown to double points end ──────────────────────────────────────────
const useCountdown = (targetIso: string | null) => {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!targetIso) return;
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Ending…"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ balance, threshold }: { balance: number; threshold: number }) => {
  const mod = balance % threshold;
  const pct = Math.min(100, (mod / threshold) * 100);
  const rewardsReady = Math.floor(balance / threshold);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-white/60">
        <span>{mod} / {threshold} pts to next reward</span>
        {rewardsReady > 0 && (
          <span className="text-[#fde047]">{rewardsReady} reward{rewardsReady !== 1 ? "s" : ""} ready</span>
        )}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #fde047, #f59e0b)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Rewards = () => {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: loyaltyLoading, programEnabled } = useLoyalty();

  const { data: rules, isLoading: rulesLoading } = useQuery<LoyaltyRules | null>({
    queryKey: ["loyalty-rules"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_rules")
        .select("points_per_dollar, redemption_threshold, redemption_value_cents, double_points_active, double_points_end, double_points_start")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const endCountdown = useCountdown(rules?.double_points_active ? rules.double_points_end ?? null : null);

  const ptsPerDollar = rules?.points_per_dollar ?? 10;
  const threshold = rules?.redemption_threshold ?? 100;
  const rewardDollars = rules ? (rules.redemption_value_cents / 100).toFixed(2).replace(/\.00$/, "") : "5";
  const doubleActive = rules?.double_points_active ?? false;

  const balance = account?.points_balance ?? 0;
  const isLoading = authLoading || rulesLoading || (!!user && loyaltyLoading);

  if (!isLoading && !programEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-24">
        <div className="text-center space-y-4 max-w-sm">
          <Star className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <h1 className="font-display text-3xl tracking-widest">POUR POINTS</h1>
          <p className="text-muted-foreground font-marker text-sm tracking-wide">
            Our loyalty program is currently unavailable. Check back soon.
          </p>
          <Link to="/shop" className="inline-block mt-4">
            <Button className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest">
              SHOP ANYWAY
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden bg-black border-b border-white/10 pt-5 pb-6 md:pt-8 md:pb-10">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(253,224,71,0.12), transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(255,23,68,0.08), transparent 50%)",
          }}
        />
        <div className="container mx-auto px-4 relative text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="h-5 w-5 text-[#fde047] fill-[#fde047]" />
            <p className="font-marker text-xs tracking-[0.35em] text-[#fde047] uppercase">Loyalty Program</p>
            <Star className="h-5 w-5 text-[#fde047] fill-[#fde047]" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-white">
            POUR<span className="text-[#fde047]" style={{ textShadow: "0 0 30px rgba(253,224,71,0.6)" }}>POINTS</span>
          </h1>
          <p className="text-white/60 max-w-lg mx-auto font-marker text-sm leading-relaxed tracking-wide">
            Every dollar you spend keeps Opie's liver... functioning. Barely.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl space-y-10 mt-12">

        {/* Double Points banner */}
        {doubleActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-yellow-400/50 bg-yellow-400/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ boxShadow: "0 0 40px rgba(253,224,71,0.15)" }}
          >
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-[#fde047] fill-[#fde047]" />
              <div>
                <p className="font-display tracking-widest text-[#fde047]">DOUBLE POINTS EVENT IS LIVE</p>
                <p className="text-xs text-white/60 mt-0.5">Every purchase earns 2× Pour Points right now</p>
              </div>
            </div>
            {endCountdown && (
              <div className="text-center sm:text-right">
                <p className="text-[10px] font-marker tracking-widest text-white/40 uppercase">Ends in</p>
                <p className="font-mono text-lg text-[#fde047] tabular-nums">{endCountdown}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* User balance card */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#fde047]" /></div>
        ) : user ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-[#fde047]/30 bg-card overflow-hidden"
            style={{ boxShadow: "0 0 40px rgba(253,224,71,0.06)" }}
          >
            <div className="px-6 py-4 border-b border-[#fde047]/20 flex items-center gap-2">
              <Star className="h-4 w-4 text-[#fde047] fill-[#fde047]" />
              <h2 className="font-display tracking-widest text-sm">YOUR BALANCE</h2>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div>
                <p className="text-xs font-marker tracking-widest text-white/40 uppercase mb-1">Current Balance</p>
                <p
                  className="font-display text-6xl tracking-wider text-[#fde047]"
                  style={{ textShadow: "0 0 24px rgba(253,224,71,0.4)" }}
                >
                  {balance.toLocaleString()}
                  <span className="text-xl text-white/40 ml-2">pts</span>
                </p>
              </div>
              <ProgressBar balance={balance} threshold={threshold} />
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-white/50">
                  {account?.lifetime_points?.toLocaleString() ?? 0} lifetime points earned
                </p>
                <Link to="/account">
                  <Button variant="outline" size="sm" className="h-8 font-display tracking-widest text-xs gap-1.5">
                    <Gift className="h-3 w-3" />Full history
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-[#fde047]/20 bg-card px-8 py-10 text-center space-y-4"
          >
            <Star className="h-8 w-8 text-[#fde047]/40 mx-auto" />
            <h2 className="font-display tracking-widest text-xl">CHECK YOUR BALANCE</h2>
            <p className="text-sm text-white/50 font-marker leading-relaxed">
              Sign in to check your Pour Points balance and start racking up tabs — the rewarding kind.
            </p>
            <Link to="/login">
              <Button className="mt-2 h-11 px-8 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90">
                SIGN IN
              </Button>
            </Link>
          </motion.div>
        )}

        {/* How it works */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <h2 className="font-display tracking-widest text-sm text-white/60">HOW IT WORKS</h2>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Beer,
                title: "SPEND",
                body: `Every $1 you drop at Pournogravy earns you ${ptsPerDollar} Pour Points. Tips not included — Opie keeps those.`,
              },
              {
                icon: Star,
                title: "STACK",
                body: `Points pile up automatically after every order is confirmed. No coupons, no clippin'. Just drinkin'.`,
              },
              {
                icon: Gift,
                title: "REDEEM",
                body: `Every ${threshold.toLocaleString()} points = $${rewardDollars} off your next order. Go to your account to cash in.`,
              },
            ].map(({ icon: Icon, title, body }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border border-white/10 bg-card p-6 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#fde047]" />
                  <p className="font-display tracking-widest text-sm">{title}</p>
                </div>
                <p className="text-xs text-white/50 font-marker leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Fine print / CTA */}
        <div className="text-center space-y-4 border-t border-white/10 pt-8">
          <p className="text-xs text-white/30 font-marker tracking-wide">
            Points are added automatically — no scanning, no apps, no nonsense. Just order.
          </p>
          <Link to="/shop">
            <Button className="h-12 px-10 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90 text-base">
              START EARNING
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
