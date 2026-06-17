import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, Pencil, BookOpen, Receipt, Package, BarChart2, Gift } from "lucide-react";
import { format } from "date-fns";

interface Snapshot {
  id: string;
  year: number;
  month: number;
  revenue_cents: number;
  refunds_cents: number;
  cogs_cents: number;
  expenses_cents: number;
  stripe_fees_cents: number;
  net_profit_cents: number;
  closed_at: string;
  amended_at: string | null;
  amendment_note: string | null;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function BookkeepingOverview() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeSnap, setActiveSnap] = useState<Snapshot | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: snapshots = [], isLoading } = useQuery<Snapshot[]>({
    queryKey: ["bk-snapshots", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_snapshots")
        .select("*")
        .eq("year", selectedYear)
        .order("month");
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
    staleTime: 60_000,
  });

  const snapMap = Object.fromEntries(snapshots.map((s) => [s.month, s]));

  const annualRevenue  = snapshots.reduce((s, m) => s + m.revenue_cents, 0);
  const annualExpenses = snapshots.reduce((s, m) => s + m.expenses_cents, 0);
  const annualProfit   = snapshots.reduce((s, m) => s + m.net_profit_cents, 0);
  const annualStripe   = snapshots.reduce((s, m) => s + m.stripe_fees_cents, 0);

  const saveAmendment = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from("monthly_snapshots")
        .update({ amendment_note: note || null, amended_at: note ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bk-snapshots"] });
      setActiveSnap(null);
      toast.success("Annotation saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const subNav = [
    { to: "/admin/bookkeeping/expenses",   label: "Expenses",   icon: Receipt  },
    { to: "/admin/bookkeeping/products",   label: "COGS",       icon: Package  },
    { to: "/admin/bookkeeping/reports",    label: "Reports",    icon: BarChart2},
    { to: "/admin/bookkeeping/tax-packet", label: "Tax Packet", icon: Gift     },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Bookkeeping</h1>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground"
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 mb-6">
        {subNav.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Icon className="w-3.5 h-3.5" />{label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Guidance */}
      <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground mb-6">
        Books close automatically on the 1st of each month. If something looks off in a closed month,
        click it to add an annotation — your accountant will see it. Do not panic.
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Annual Revenue",    value: annualRevenue,  color: "text-green-400"  },
          { label: "Annual Expenses",   value: annualExpenses, color: "text-red-400"    },
          { label: "Net Profit",        value: annualProfit,   color: "text-yellow-400" },
          { label: "Stripe Fees Paid",  value: annualStripe,   color: "text-blue-400"   },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className={`text-lg font-bold ${color}`}>{fmt(value)}</div>
          </motion.div>
        ))}
      </div>

      {/* Monthly grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {MONTH_NAMES.map((name, idx) => {
          const m    = idx + 1;
          const snap = snapMap[m];
          const isCurrentMonth = selectedYear === currentYear && m === currentMonth;
          const isFuture       = selectedYear === currentYear && m > currentMonth;

          return (
            <motion.div
              key={m}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => {
                if (snap) { setActiveSnap(snap); setNoteText(snap.amendment_note ?? ""); }
              }}
              className={[
                "rounded-xl border p-3 text-sm",
                isFuture
                  ? "border-border/30 opacity-40 cursor-default"
                  : snap
                  ? "border-border cursor-pointer hover:bg-muted/20"
                  : isCurrentMonth
                  ? "border-primary/40 bg-primary/5 cursor-default"
                  : "border-border/30 cursor-default",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{name}</span>
                {snap?.amended_at
                  ? <Pencil className="w-3.5 h-3.5 text-yellow-400" />
                  : snap
                  ? <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                  : isCurrentMonth
                  ? <Badge variant="outline" className="text-xs py-0">Open</Badge>
                  : null}
              </div>
              {isLoading ? (
                <Skeleton className="h-3 w-full mb-1" />
              ) : snap ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    Rev: <span className="text-foreground">{fmt(snap.revenue_cents)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Net: <span className={snap.net_profit_cents >= 0 ? "text-green-400" : "text-red-400"}>
                      {fmt(snap.net_profit_cents)}
                    </span>
                  </div>
                </>
              ) : isCurrentMonth ? (
                <div className="text-xs text-muted-foreground">Live data</div>
              ) : (
                <div className="text-xs text-muted-foreground/40">—</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Amendment drawer */}
      <Sheet open={!!activeSnap} onOpenChange={(o) => !o && setActiveSnap(null)}>
        <SheetContent>
          {activeSnap && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {MONTH_NAMES[activeSnap.month - 1]} {activeSnap.year}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                {[
                  ["Revenue",    fmt(activeSnap.revenue_cents)],
                  ["Refunds",    `− ${fmt(activeSnap.refunds_cents)}`],
                  ["COGS",       `− ${fmt(activeSnap.cogs_cents)}`],
                  ["Expenses",   `− ${fmt(activeSnap.expenses_cents)}`],
                  ["Net Profit", fmt(activeSnap.net_profit_cents)],
                  ["Stripe Fees",fmt(activeSnap.stripe_fees_cents)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-1">
                  Closed {format(new Date(activeSnap.closed_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
                <div className="pt-4 space-y-2">
                  <Label>Annotation for accountant</Label>
                  <Textarea
                    rows={4}
                    placeholder="e.g. Printer invoice for this month arrived late — added to next month's expenses."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This note appears in your tax packet reports. It does not change any dollar amounts.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => saveAmendment.mutate({ id: activeSnap.id, note: noteText })}
                    disabled={saveAmendment.isPending}
                  >
                    {saveAmendment.isPending ? "Saving…" : "Save Annotation"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
