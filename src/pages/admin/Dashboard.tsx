import { useState, useEffect, useMemo } from "react";
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

// ── Welcome dialog (one-time) ──────────────────────────────────────────────────

const WELCOME_KEY = "pg_opie_welcomed";

const CONFIRM_PHRASE = "LETS GET TO WORK";
const PREVIEW_PHRASE = "KRISTIN"; // Kristin's preview key — triggers animation without consuming the one-time use

const MAKE_IT_RAIN_YT_ID = "oPLoj5FqvnE";
const MAKE_IT_RAIN_START_SEC = 75; // 1:15

const TINA_GIF = "https://media.giphy.com/media/HGe4zsOVo7Jvy/giphy.gif";

// ── Welcome + confirm dialog ───────────────────────────────────────────────────

const WelcomeDialog = ({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (isPreview: boolean) => void;
}) => {
  const [input, setInput] = useState("");
  const isOpie    = input === CONFIRM_PHRASE;
  const isKristin = input === PREVIEW_PHRASE;
  const canConfirm = isOpie || isKristin;

  useEffect(() => { if (!open) setInput(""); }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canConfirm) onConfirm(isKristin);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className="max-w-md border-[#fde047]/40 bg-card"
        style={{ boxShadow: "0 0 60px rgba(253,224,71,0.15)" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-2xl text-[#fde047]">
            ITS ABOUT DAMN TIME!
          </DialogTitle>
        </DialogHeader>

        {/* Kristin's note */}
        <div className="space-y-3 pt-1">
          <p className="text-sm leading-relaxed text-foreground">
            I'm so proud of you for finally getting this passion project up and running. I am also
            very humbled and thankful that you chose me to work with on it.
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            Here's to many more larger than life ideas — ADHD mental breakdowns — and telling bad
            customers where to go and how to get there in such a way that they actually look forward
            to the trip.
          </p>
          <p className="text-sm italic text-[#fde047] text-right font-marker tracking-wide">
            — Kristin
          </p>
        </div>

        {/* System warning */}
        <div className="mt-4 border border-white/10 bg-white/[0.03] p-4 space-y-3 rounded-sm">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="text-[#fde047] font-medium">⚠ SYSTEM:</span> Completing this form
            will reset all order and financial data to zero so your dashboard reflects true revenue
            from the moment you go live. Once done, it's gone — there's no undo. If you're ready
            to make it official, type{" "}
            <span className="font-mono text-[#fde047]">{CONFIRM_PHRASE}</span> below. Otherwise,
            hit Cancel.
          </p>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3 py-2 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] font-mono tracking-widest placeholder:text-muted-foreground/30 transition-colors"
          />

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 border border-border text-xs font-display tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={() => onConfirm(isKristin)}
              disabled={!canConfirm}
              className="flex-1 py-2.5 bg-[#fde047] text-black text-xs font-display tracking-widest hover:bg-[#fbbf24] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ENTER
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Celebration overlay ────────────────────────────────────────────────────────

const CelebrationOverlay = ({ onClose }: { onClose: () => void }) => {
  // Inject keyframes once
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "bill-fall-keyframes";
    style.textContent = `
      @keyframes billFall {
        0%   { transform: translateY(-80px) rotate(0deg);   opacity: 1;   }
        100% { transform: translateY(110vh)  rotate(540deg); opacity: 0.6; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById("bill-fall-keyframes")?.remove(); };
  }, []);

  const bills = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left:     `${Math.random() * 100}%`,
        delay:    `${Math.random() * 4}s`,
        duration: `${2.5 + Math.random() * 3}s`,
        size:     `${1.2 + Math.random() * 1.4}rem`,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Falling bills */}
      {bills.map((b) => (
        <span
          key={b.id}
          className="absolute top-0 select-none pointer-events-none"
          style={{
            left:      b.left,
            fontSize:  b.size,
            animation: `billFall ${b.duration} linear ${b.delay} infinite`,
          }}
        >
          💵
        </span>
      ))}

      {/* Tina */}
      <img
        src={TINA_GIF}
        alt="Tina Belcher dancing"
        className="relative z-10 w-56 md:w-72 lg:w-80 drop-shadow-2xl"
        style={{ imageRendering: "auto" }}
      />

      {/* "MAKE IT RAIN" label */}
      <p
        className="relative z-10 mt-4 font-display text-3xl md:text-5xl tracking-widest text-[#fde047]"
        style={{ textShadow: "0 0 40px rgba(253,224,71,0.8)" }}
      >
        MAKE IT RAIN
      </p>

      {/* Hidden YouTube audio */}
      {MAKE_IT_RAIN_YT_ID && (
        <iframe
          className="absolute opacity-0 pointer-events-none"
          style={{ width: 1, height: 1 }}
          src={`https://www.youtube.com/embed/${MAKE_IT_RAIN_YT_ID}?autoplay=1&loop=1&playlist=${MAKE_IT_RAIN_YT_ID}&start=${MAKE_IT_RAIN_START_SEC}`}
          allow="autoplay; encrypted-media"
          title="Make It Rain"
        />
      )}

      <button
        onClick={onClose}
        className="relative z-10 mt-8 px-10 py-3 bg-[#fde047] text-black font-display tracking-widest text-sm hover:bg-[#fbbf24] transition-colors"
      >
        CLOSE
      </button>
    </div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(
    () => localStorage.getItem(WELCOME_KEY) === "true"
  );
  const [welcomeOpen, setWelcomeOpen]       = useState(false);
  const [celebrating, setCelebrating]       = useState(false);

  const handleWelcomeOpen    = () => setWelcomeOpen(true);
  const handleWelcomeCancel  = () => setWelcomeOpen(false); // keep button visible
  const handleWelcomeConfirm = (isPreview: boolean) => {
    if (!isPreview) {
      localStorage.setItem(WELCOME_KEY, "true");
      setHasSeenWelcome(true);
    }
    setWelcomeOpen(false);
    setCelebrating(true);
  };

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
      {!hasSeenWelcome && (
        <button
          onClick={handleWelcomeOpen}
          className="w-full py-3 border border-[#fde047]/40 bg-[#fde047]/5 text-[#fde047] font-display tracking-widest text-sm hover:bg-[#fde047]/10 transition-colors animate-pulse"
        >
          RESET DATA
        </button>
      )}

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

      <WelcomeDialog
        open={welcomeOpen}
        onCancel={handleWelcomeCancel}
        onConfirm={handleWelcomeConfirm}
      />

      {celebrating && <CelebrationOverlay onClose={() => setCelebrating(false)} />}
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
