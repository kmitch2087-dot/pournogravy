import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

interface PrintLink { slug: string; black: string; white: string; }
interface ItemRow { qty: number; name: string; size: string; color: string; slug: string; }
interface HistoryEntry { status: string; at: string; source: string; }

interface OrderRow {
  queueId: string;
  queueStatus: string;
  notes: string | null;
  statusHistory: HistoryEntry[];
  orderId: string;
  shortId: string;
  orderStatus: string;
  createdAt: string;
  shippingAddress: Record<string, unknown> | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  items: ItemRow[];
  printLinks: PrintLink[];
  shipUrl: string;
}

const NEXT_ACTIONS: Record<string, { label: string; to: string }[]> = {
  paid:          [{ label: "✅ Mark In Production", to: "in_production" }],
  in_production: [{ label: "📬 Mark Shipped",        to: "shipped"       }],
  shipped:       [{ label: "✓ Mark Delivered",        to: "delivered"     }],
  delivered:     [{ label: "✓ Mark Fulfilled",        to: "fulfilled"     }],
};

const STATUS_STYLE: Record<string, string> = {
  paid:          "text-amber-400  border-amber-400/40  bg-amber-400/10",
  in_production: "text-blue-400   border-blue-400/40   bg-blue-400/10",
  shipped:       "text-violet-400 border-violet-400/40 bg-violet-400/10",
  delivered:     "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  fulfilled:     "text-emerald-600 border-emerald-600/40 bg-emerald-600/10",
  cancelled:     "text-zinc-500   border-zinc-500/30   bg-zinc-500/10",
  refunded:      "text-rose-400   border-rose-400/40   bg-rose-400/10",
};

const STATUS_LABEL: Record<string, string> = {
  paid:          "PAID",
  in_production: "IN PRODUCTION",
  shipped:       "SHIPPED",
  delivered:     "DELIVERED",
  fulfilled:     "FULFILLED",
  cancelled:     "CANCELLED",
  refunded:      "REFUNDED",
};

const ACTIVE_SET   = new Set(["paid", "in_production", "shipped", "delivered"]);
const TERMINAL_SET = new Set(["fulfilled", "cancelled", "refunded"]);

function formatAddress(addr: Record<string, unknown> | null): string {
  if (!addr) return "—";
  const a = (addr.address as Record<string, unknown>) ?? {};
  return [
    addr.name as string,
    a.line1 as string,
    a.line2 as string,
    [a.city, a.state].filter(Boolean).join(", ") + (a.postal_code ? ` ${a.postal_code}` : ""),
  ].filter(Boolean).join(", ");
}

export default function Fulfillment() {
  const [params]       = useSearchParams();
  const token          = params.get("t") ?? "";
  const [orders, setOrders]       = useState<OrderRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchErr, setFetchErr]   = useState("");
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [showTerminal, setShowTerminal] = useState(false);

  const active   = orders.filter(o => ACTIVE_SET.has(o.orderStatus));
  const terminal = orders.filter(o => TERMINAL_SET.has(o.orderStatus));

  const load = useCallback(async () => {
    if (!token) { setFetchErr("No token — use the link from your printer email."); setLoading(false); return; }
    setLoading(true);
    setFetchErr("");
    try {
      const { data, error } = await supabase.functions.invoke("fulfillment-portal", {
        body: { action: "list", token },
      });
      if (error) { setFetchErr(error.message ?? "Failed to load"); return; }
      setOrders((data as { orders: OrderRow[] }).orders ?? []);
    } catch {
      setFetchErr("Network error — check connection.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function advance(orderId: string, to: string) {
    setAdvancing(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("fulfillment-portal", {
        body: { action: "advance", orderId, to, token },
      });
      if (error || !(data as { ok?: boolean })?.ok) {
        alert((data as { error?: string })?.error ?? error?.message ?? "Advance failed");
        return;
      }
      await load();
    } finally {
      setAdvancing(null);
    }
  }

  async function addNote(orderId: string) {
    const note = (noteInputs[orderId] ?? "").trim();
    if (!note) return;
    await supabase.functions.invoke("fulfillment-portal", {
      body: { action: "note", orderId, note, token },
    });
    setNoteInputs(prev => ({ ...prev, [orderId]: "" }));
    await load();
  }

  const Card = ({ o }: { o: OrderRow }) => {
    const next       = NEXT_ACTIONS[o.orderStatus] ?? [];
    const isTerminal = TERMINAL_SET.has(o.orderStatus);
    const busy       = advancing === o.orderId;

    return (
      <div className={`border p-4 transition-colors ${
        isTerminal
          ? "border-zinc-800/50 opacity-50"
          : "border-zinc-700 hover:border-[#fde047]/20"
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="font-mono text-[#fde047] font-bold tracking-widest text-sm">#{o.shortId}</span>
            <span className="ml-2 text-zinc-600 text-xs">
              {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
            </span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 uppercase tracking-widest border font-mono ${
            STATUS_STYLE[o.orderStatus] ?? "text-zinc-400 border-zinc-700 bg-zinc-900"
          }`}>
            {STATUS_LABEL[o.orderStatus] ?? o.orderStatus}
          </span>
        </div>

        {/* Items */}
        <div className="mb-3 space-y-0.5">
          {o.items.map((item, i) => (
            <p key={i} className="text-xs text-zinc-300">
              <span className="text-zinc-500">{item.qty}×</span>{" "}
              <span className="text-white">{item.name}</span>
              {item.size  ? <span className="text-zinc-500"> [{item.size}]</span>  : null}
              {item.color ? <span className="text-zinc-500"> {item.color}</span> : null}
            </p>
          ))}
        </div>

        {/* Ship-to */}
        <div className="mb-3">
          <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5">Ship To</p>
          <p className="text-xs text-zinc-400">{formatAddress(o.shippingAddress)}</p>
        </div>

        {/* Tracking */}
        {o.trackingNumber && (
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5">Tracking</p>
            <p className="text-xs text-zinc-400 font-mono">{o.trackingCarrier} {o.trackingNumber}</p>
          </div>
        )}

        {/* Print files */}
        {o.printLinks.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Print Files</p>
            <div className="space-y-0.5">
              {o.printLinks.map(p => (
                <p key={p.slug} className="text-[11px]">
                  <span className="text-zinc-600">{p.slug}: </span>
                  <a href={p.black} target="_blank" rel="noopener"
                     className="text-zinc-400 hover:text-[#fde047] transition-colors">⬛ black</a>
                  {" / "}
                  <a href={p.white} target="_blank" rel="noopener"
                     className="text-zinc-400 hover:text-[#fde047] transition-colors">⬜ white</a>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {o.notes && (
          <div className="mb-3 border-l-2 border-zinc-700 pl-2">
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5">Notes</p>
            <p className="text-[11px] text-zinc-500 whitespace-pre-wrap">{o.notes}</p>
          </div>
        )}

        {/* Status history */}
        {o.statusHistory?.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">History</p>
            <div className="space-y-0.5">
              {o.statusHistory.map((h, i) => (
                <p key={i} className="text-[10px] text-zinc-600 font-mono">
                  {new Date(h.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {" "}
                  <span className="text-zinc-500">{STATUS_LABEL[h.status] ?? h.status}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isTerminal && (
          <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
            <div className="flex flex-wrap gap-2">
              {next.map(a => (
                <button
                  key={a.to}
                  onClick={() => advance(o.orderId, a.to)}
                  disabled={busy}
                  className="text-xs bg-[#fde047] text-black font-bold py-1.5 px-3 uppercase tracking-wider hover:bg-[#fbbf24] transition-colors disabled:opacity-50"
                >
                  {busy ? "..." : a.label}
                </button>
              ))}
              <a
                href={o.shipUrl}
                target="_blank"
                rel="noopener"
                className="text-xs border border-[#fde047]/40 text-[#fde047] py-1.5 px-3 uppercase tracking-wider hover:border-[#fde047] transition-colors"
              >
                📦 Add Tracking
              </a>
            </div>

            {/* Inline note */}
            <div className="flex gap-1">
              <input
                value={noteInputs[o.orderId] ?? ""}
                onChange={e => setNoteInputs(p => ({ ...p, [o.orderId]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addNote(o.orderId)}
                placeholder="Add note…"
                className="flex-1 text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 px-2 py-1 focus:outline-none focus:border-[#fde047]/50 placeholder:text-zinc-700"
              />
              <button
                onClick={() => addNote(o.orderId)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="font-marker text-[#fde047] tracking-widest uppercase animate-pulse text-sm">Loading…</p>
    </div>
  );

  if (fetchErr) return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 pt-24">
      <div className="border border-[#fde047]/30 p-8 max-w-sm w-full text-center">
        <p className="font-display text-2xl text-[#fde047] mb-3 tracking-wider">ACCESS DENIED</p>
        <p className="text-zinc-400 text-sm">{fetchErr}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <SEO title="Fulfillment Portal — POURnogravy" />

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="border-b border-[#fde047]/20 pb-5 mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-white tracking-wider">FULFILLMENT</h1>
            <p className="font-marker text-xs text-[#fde047] tracking-widest uppercase mt-1">
              {active.length} active · {terminal.length} complete
            </p>
          </div>
          <button
            onClick={load}
            className="text-xs text-zinc-600 hover:text-[#fde047] uppercase tracking-widest transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Active orders */}
        {active.length === 0 ? (
          <div className="border border-zinc-800 py-20 text-center">
            <p className="font-marker text-lg text-zinc-600 tracking-wider uppercase">Queue is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map(o => <Card key={o.orderId} o={o} />)}
          </div>
        )}

        {/* Terminal orders (collapsed by default) */}
        {terminal.length > 0 && (
          <div className="mt-12">
            <button
              onClick={() => setShowTerminal(s => !s)}
              className="text-xs text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors"
            >
              {showTerminal ? "▾" : "▸"} {terminal.length} completed / cancelled
            </button>
            {showTerminal && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {terminal.map(o => <Card key={o.orderId} o={o} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
