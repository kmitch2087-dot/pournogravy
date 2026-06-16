import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Gift, TrendingUp, Users, Search, ChevronDown, ChevronUp, Plus, Minus, Settings2, Zap, ZapOff, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoyaltyRules {
  id: number;
  points_per_dollar: number;
  redemption_threshold: number;
  redemption_value_cents: number;
  double_points_active: boolean;
  double_points_start: string | null;
  double_points_end: string | null;
  updated_at: string;
}

// ─── Pour Points Rules Card ───────────────────────────────────────────────────
const RulesCard = () => {
  const qc = useQueryClient();

  const { data: rules, isLoading } = useQuery<LoyaltyRules | null>({
    queryKey: ["loyalty-rules"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_rules")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  // Local form state (initialised from query data)
  const [ptsPerDollar, setPtsPerDollar] = useState(10);
  const [threshold, setThreshold] = useState(100);
  const [valueDollars, setValueDollars] = useState(5);
  const [dpEnd, setDpEnd] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedStart, setSchedStart] = useState("");
  const [schedEnd, setSchedEnd] = useState("");

  // Sync once rules load
  useEffect(() => {
    if (!rules) return;
    setPtsPerDollar(rules.points_per_dollar);
    setThreshold(rules.redemption_threshold);
    setValueDollars(rules.redemption_value_cents / 100);
    setDpEnd(rules.double_points_end ? toLocalDatetimeInput(rules.double_points_end) : "");
    if (rules.double_points_start) setSchedStart(toLocalDatetimeInput(rules.double_points_start));
    if (rules.double_points_end) setSchedEnd(toLocalDatetimeInput(rules.double_points_end));
  }, [rules]);

  const { mutate: saveRules, isPending: saving } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("loyalty_rules").update({
        points_per_dollar: ptsPerDollar,
        redemption_threshold: threshold,
        redemption_value_cents: Math.round(valueDollars * 100),
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rules saved");
      qc.invalidateQueries({ queryKey: ["loyalty-rules"] });
    },
    onError: (err: Error) => toast.error(`Save failed: ${err.message}`),
  });

  // Activate now — immediately on, optional end date
  const { mutate: activateNow, isPending: activating } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("loyalty_rules").update({
        double_points_active: true,
        double_points_start: new Date().toISOString(),
        double_points_end: dpEnd ? new Date(dpEnd).toISOString() : null,
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Double points are LIVE");
      qc.invalidateQueries({ queryKey: ["loyalty-rules"] });
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });

  // Turn off immediately
  const { mutate: deactivate, isPending: deactivating } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("loyalty_rules").update({
        double_points_active: false,
        double_points_start: null,
        double_points_end: null,
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Double points turned off");
      setDpEnd("");
      setSchedStart("");
      setSchedEnd("");
      qc.invalidateQueries({ queryKey: ["loyalty-rules"] });
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });

  // Save schedule (start + end, let cron handle activation)
  const { mutate: saveSchedule, isPending: scheduleSaving } = useMutation({
    mutationFn: async () => {
      if (!schedStart || !schedEnd) throw new Error("Both start and end are required");
      const { error } = await supabase.from("loyalty_rules").update({
        double_points_active: false,
        double_points_start: new Date(schedStart).toISOString(),
        double_points_end: new Date(schedEnd).toISOString(),
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule saved — double points will activate automatically");
      setShowSchedule(false);
      qc.invalidateQueries({ queryKey: ["loyalty-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isActive = rules?.double_points_active ?? false;
  const isScheduled = !isActive && !!(rules?.double_points_start && new Date(rules.double_points_start) > new Date());

  // Status badge
  const dpBadge = () => {
    if (!rules) return null;
    if (isActive) {
      const end = rules.double_points_end ? new Date(rules.double_points_end).toLocaleString() : "until turned off";
      return <Badge className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-marker tracking-widest text-[10px]">● LIVE — ends {end}</Badge>;
    }
    if (isScheduled) {
      const start = new Date(rules.double_points_start!).toLocaleString();
      return <Badge className="bg-blue-400/20 text-blue-300 border border-blue-400/40 font-marker tracking-widest text-[10px]">Scheduled — starts {start}</Badge>;
    }
    return <Badge variant="outline" className="font-marker tracking-widest text-[10px] text-muted-foreground">Off</Badge>;
  };

  return (
    <div className="border border-border bg-card">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <Settings2 className="h-4 w-4 text-[#fde047]" />
        <h2 className="font-display tracking-widest text-sm">POUR POINTS RULES</h2>
      </div>

      {isLoading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="px-5 py-5 space-y-6">
          {/* Earn / redeem settings */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase block">Points earned per $1 spent</label>
              <input
                type="number"
                min={1}
                value={ptsPerDollar}
                onChange={(e) => setPtsPerDollar(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase block">Points per reward</label>
              <input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase block">Reward value ($)</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={valueDollars}
                onChange={(e) => setValueDollars(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
              />
            </div>
          </div>

          {/* Double Points section */}
          <div className="border border-border/50 rounded-sm p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-display tracking-widest">DOUBLE POINTS EVENT</p>
                <p className="text-xs text-muted-foreground mt-0.5">Every purchase earns 2× points while active</p>
              </div>
              {dpBadge()}
            </div>

            {/* Active state — show turn-off button */}
            {isActive && (
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <Button
                  variant="outline"
                  className="gap-2 font-display tracking-widest text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => deactivate()}
                  disabled={deactivating}
                >
                  {deactivating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ZapOff className="h-3 w-3" />}
                  Turn Off Now
                </Button>
                {rules?.double_points_end && (
                  <p className="text-xs text-muted-foreground self-center">
                    Auto-expires {new Date(rules.double_points_end).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Inactive / scheduled state — show activate + schedule options */}
            {!isActive && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase block">
                      End date & time <span className="normal-case font-sans">(optional — leave blank to run until turned off)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={dpEnd}
                      onChange={(e) => setDpEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                    />
                  </div>
                  <Button
                    className="gap-2 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90 shrink-0"
                    onClick={() => activateNow()}
                    disabled={activating}
                  >
                    {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Activate Now
                  </Button>
                </div>

                {/* Schedule ahead (collapsed by default) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSchedule((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-marker tracking-widest uppercase"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {showSchedule ? "Hide" : "Schedule for a future date instead"}
                  </button>

                  <AnimatePresence>
                    {showSchedule && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid sm:grid-cols-2 gap-4 pt-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase block">Start date & time</label>
                            <input
                              type="datetime-local"
                              value={schedStart}
                              onChange={(e) => setSchedStart(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-marker tracking-widest text-muted-foreground uppercase block">End date & time</label>
                            <input
                              type="datetime-local"
                              value={schedEnd}
                              onChange={(e) => setSchedEnd(e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 font-display tracking-widest text-xs"
                            onClick={() => saveSchedule()}
                            disabled={scheduleSaving || !schedStart || !schedEnd}
                          >
                            {scheduleSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarClock className="h-3 w-3" />}
                            Save Schedule
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Show cancel button if there's a pending schedule */}
                {isScheduled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-red-400 font-marker tracking-widest"
                    onClick={() => deactivate()}
                    disabled={deactivating}
                  >
                    Cancel scheduled event
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveRules()}
              disabled={saving}
              className="font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90 h-9 px-6"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rules"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: convert ISO string → datetime-local input value (local time)
function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface LoyaltyRow {
  id: string;
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  updated_at: string;
  email: string | null;
  display_name: string | null;
}

interface Transaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface AdjustModal {
  userId: string;
  email: string;
  currentBalance: number;
}

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) => (
  <div className="border border-border bg-card p-5">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase">{label}</p>
    </div>
    <p className={`font-display text-3xl tracking-wider ${color}`}>{value.toLocaleString()}</p>
  </div>
);

const Loyalty = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<LoyaltyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({});
  const [txLoading, setTxLoading] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<AdjustModal | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: accts, error }, { data: profs }] = await Promise.all([
      supabase.from("loyalty_accounts").select("id, user_id, points_balance, lifetime_points, updated_at").order("points_balance", { ascending: false }),
      supabase.from("profiles").select("id, email, display_name"),
    ]);

    if (error) {
      toast.error("Could not load loyalty accounts");
    } else {
      const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
      setAccounts(
        (accts ?? []).map((row) => ({
          ...row,
          email: profMap.get(row.user_id)?.email ?? null,
          display_name: profMap.get(row.user_id)?.display_name ?? null,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadTransactions = async (userId: string) => {
    if (transactions[userId]) return;
    setTxLoading(userId);
    const { data } = await supabase
      .from("loyalty_transactions")
      .select("id, points, type, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);
    setTransactions((prev) => ({ ...prev, [userId]: data ?? [] }));
    setTxLoading(null);
  };

  const toggleExpand = (userId: string) => {
    if (expanded === userId) {
      setExpanded(null);
    } else {
      setExpanded(userId);
      loadTransactions(userId);
    }
  };

  const handleAdjust = async () => {
    if (!adjust || !user) return;
    const pts = parseInt(adjustAmount);
    if (isNaN(pts) || pts === 0) { toast.error("Enter a non-zero amount"); return; }
    if (!adjustReason.trim()) { toast.error("Reason is required"); return; }
    setAdjusting(true);

    const newBalance = Math.max(0, adjust.currentBalance + pts);

    const [{ error: updateErr }, { error: txErr }] = await Promise.all([
      supabase.from("loyalty_accounts")
        .update({ points_balance: newBalance })
        .eq("user_id", adjust.userId),
      supabase.from("loyalty_transactions").insert({
        user_id: adjust.userId,
        points: pts,
        type: "admin_adjustment",
        description: `Admin adjustment: ${adjustReason.trim()}`,
      }),
    ]);

    if (updateErr || txErr) {
      toast.error("Adjustment failed");
    } else {
      toast.success(`${pts > 0 ? "+" : ""}${pts} points applied`);
      // Clear cached transactions for this user so it reloads
      setTransactions((prev) => { const next = { ...prev }; delete next[adjust.userId]; return next; });
      setAdjust(null);
      setAdjustAmount("");
      setAdjustReason("");
      load();
    }
    setAdjusting(false);
  };

  const filtered = accounts.filter((a) => {
    const q = query.toLowerCase();
    return !q || (a.email ?? "").toLowerCase().includes(q) || (a.display_name ?? "").toLowerCase().includes(q);
  });

  const totalBalance = accounts.reduce((s, a) => s + a.points_balance, 0);
  const totalLifetime = accounts.reduce((s, a) => s + a.lifetime_points, 0);
  const totalRedeemed = totalLifetime - totalBalance;

  return (
    <div className="space-y-6">
      {/* Pour Points Rules */}
      <RulesCard />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Members" value={accounts.length} icon={Users} color="text-[#fde047]" />
        <StatCard label="Outstanding pts" value={totalBalance.toLocaleString()} icon={Star} color="text-[#fde047]" />
        <StatCard label="Lifetime earned" value={totalLifetime.toLocaleString()} icon={TrendingUp} color="text-green-400" />
        <StatCard label="Redeemed" value={totalRedeemed.toLocaleString()} icon={Gift} color="text-[#ff1744]" />
      </div>

      {/* Table */}
      <div className="border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Star className="h-4 w-4 text-[#fde047] fill-[#fde047]" />
          <h2 className="font-display tracking-widest text-sm">POUR POINTS — ALL MEMBERS</h2>
          <div className="relative ml-auto max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {query ? "No members match that search." : "No loyalty accounts yet — points are awarded automatically on purchase."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((acct) => (
              <div key={acct.user_id}>
                {/* Row */}
                <div className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{acct.email ?? acct.user_id.slice(0, 8)}</p>
                    {acct.display_name && <p className="text-xs text-muted-foreground">{acct.display_name}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-display text-lg tracking-wider text-[#fde047]">{acct.points_balance.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{acct.lifetime_points.toLocaleString()} lifetime</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-display tracking-widest"
                      onClick={() => setAdjust({ userId: acct.user_id, email: acct.email ?? acct.user_id.slice(0, 8), currentBalance: acct.points_balance })}
                    >
                      Adjust
                    </Button>
                    <button
                      onClick={() => toggleExpand(acct.user_id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expanded === acct.user_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded transaction history */}
                <AnimatePresence>
                  {expanded === acct.user_id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/50 bg-muted/20"
                    >
                      <div className="px-5 py-4">
                        <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase mb-3">Transaction History</p>
                        {txLoading === acct.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (transactions[acct.user_id] ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">No transactions yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {(transactions[acct.user_id] ?? []).map((tx) => (
                              <li key={tx.id} className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-muted-foreground">{tx.description ?? tx.type}</span>
                                  <span className="text-muted-foreground/50 ml-2">
                                    {new Date(tx.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <span className={`font-display tracking-wider ${tx.points > 0 ? "text-[#fde047]" : "text-[#ff1744]"}`}>
                                  {tx.points > 0 ? "+" : ""}{tx.points}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adjust modal */}
      <AnimatePresence>
        {adjust && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setAdjust(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-md p-6 space-y-5"
            >
              <div>
                <h3 className="font-display tracking-widest text-lg">ADJUST POINTS</h3>
                <p className="text-sm text-muted-foreground mt-1">{adjust.email}</p>
                <p className="text-xs text-muted-foreground">Current balance: <span className="text-[#fde047]">{adjust.currentBalance} pts</span></p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setAdjustAmount((v) => String((parseInt(v) || 0) - 10))}
                >
                  <Minus className="h-3 w-3" />10
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setAdjustAmount((v) => String((parseInt(v) || 0) + 10))}
                >
                  <Plus className="h-3 w-3" />10
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setAdjustAmount((v) => String((parseInt(v) || 0) + 100))}
                >
                  <Plus className="h-3 w-3" />100
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground font-marker tracking-widest uppercase mb-1 block">
                    Amount (use negative to deduct)
                  </label>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 50 or -25"
                    className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-marker tracking-widest uppercase mb-1 block">
                    Reason (required)
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Goodwill gesture, contest prize…"
                    className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
                  />
                </div>
              </div>

              {adjustAmount && !isNaN(parseInt(adjustAmount)) && (
                <p className="text-xs text-muted-foreground">
                  New balance: <span className="text-[#fde047]">{Math.max(0, adjust.currentBalance + parseInt(adjustAmount))} pts</span>
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 font-display tracking-widest" onClick={() => setAdjust(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90"
                  onClick={handleAdjust}
                  disabled={adjusting}
                >
                  {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Loyalty;
