import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Printer, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PRINT_COST_PER_ITEM_CENTS = 1200;

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const startOfThisWeek = (): Date => {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

const isThisWeek = (iso: string): boolean => new Date(iso) >= startOfThisWeek();

interface OrderFinancial {
  id: string;
  created_at: string;
  total_cents: number;
  subtotal_cents: number;
  shipping_cents: number;
  revenue_cents: number;
  item_count: number;
  printer_cost_cents: number;
  printer_paid_at: string | null;
}

const downloadCSV = (rows: OrderFinancial[], filename: string) => {
  const header = "Order ID,Date,Items,Print Cost,Shipping Collected,Order Revenue,Printer Paid";
  const lines = rows.map((o) =>
    [
      o.id.slice(0, 8).toUpperCase(),
      fmtDate(o.created_at),
      o.item_count,
      (o.printer_cost_cents / 100).toFixed(2),
      (o.shipping_cents / 100).toFixed(2),
      (o.revenue_cents / 100).toFixed(2),
      o.printer_paid_at ? fmtDate(o.printer_paid_at) : "UNPAID",
    ]
      .map((v) => `"${v}"`)
      .join(",")
  );
  const csv = [header, ...lines].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const MetricBox = ({
  label,
  allTime,
  thisWeek,
  accent = "text-[#fde047]",
}: {
  label: string;
  allTime: string;
  thisWeek: string;
  accent?: string;
}) => (
  <div className="border border-border bg-card p-5 space-y-3 print:border-black">
    <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">{label}</p>
    <div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">All-Time</p>
      <p className={`font-display text-2xl tracking-wider ${accent}`}>{allTime}</p>
    </div>
    <div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">This Week (Sun–Sat)</p>
      <p className={`font-display text-lg tracking-wider ${accent}`}>{thisWeek}</p>
    </div>
  </div>
);

const PrinterBillSection = ({
  orders,
  onMarkedPaid,
}: {
  orders: OrderFinancial[];
  onMarkedPaid: () => void;
}) => {
  const [showPaid, setShowPaid] = useState(false);
  const [marking, setMarking] = useState(false);

  const unpaid = orders.filter((o) => !o.printer_paid_at);
  const paid = orders.filter((o) => !!o.printer_paid_at);

  const totalOwed = unpaid.reduce((s, o) => s + o.printer_cost_cents, 0);
  const thisWeekOwed = unpaid
    .filter((o) => isThisWeek(o.created_at))
    .reduce((s, o) => s + o.printer_cost_cents, 0);

  const handleMarkPaid = async () => {
    if (!unpaid.length) return;
    if (
      !confirm(
        `Mark all ${unpaid.length} unpaid order(s) as printer-paid? This records that you've settled ${fmt(totalOwed)} with the printer.`
      )
    )
      return;
    setMarking(true);
    const { error } = await supabase
      .from("printer_queue")
      .update({ printer_paid_at: new Date().toISOString() })
      .in("order_id", unpaid.map((o) => o.id));
    if (error) toast.error(error.message);
    else {
      toast.success(`Marked ${unpaid.length} order${unpaid.length !== 1 ? "s" : ""} as printer-paid`);
      onMarkedPaid();
    }
    setMarking(false);
  };

  return (
    <div className="space-y-4 print:break-inside-avoid">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">Printer Bill</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Up2OurNecksInFabric · $12/item</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCSV(
                orders,
                `pournogravy-printer-bill-${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
            className="h-8 text-[10px] font-display tracking-widest"
          >
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
          {unpaid.length > 0 && (
            <Button
              size="sm"
              onClick={handleMarkPaid}
              disabled={marking}
              className="h-8 text-[10px] font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fbbf24] disabled:opacity-50"
            >
              {marking ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              {marking ? "SAVING…" : "MARK ALL PAID"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Owed to Printer"
          allTime={fmt(totalOwed)}
          thisWeek={fmt(thisWeekOwed)}
          accent={totalOwed > 0 ? "text-red-400" : "text-green-400"}
        />
        <MetricBox
          label="Paid to Printer"
          allTime={fmt(paid.reduce((s, o) => s + o.printer_cost_cents, 0))}
          thisWeek={fmt(
            paid
              .filter((o) => isThisWeek(o.printer_paid_at!))
              .reduce((s, o) => s + o.printer_cost_cents, 0)
          )}
          accent="text-green-400"
        />
      </div>

      {unpaid.length > 0 && (
        <div className="border border-border bg-card divide-y divide-border">
          <p className="px-4 py-2 text-[9px] font-marker tracking-widest text-red-400 uppercase">
            Unpaid — {unpaid.length} order{unpaid.length !== 1 ? "s" : ""}
          </p>
          {unpaid.map((o) => (
            <div key={o.id} className="flex items-center gap-4 px-4 py-2.5">
              <span className="text-muted-foreground text-[10px] font-mono w-20 shrink-0">
                {o.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-muted-foreground text-[10px] shrink-0">{fmtDate(o.created_at)}</span>
              <span className="text-muted-foreground text-[10px] shrink-0">
                {o.item_count} item{o.item_count !== 1 ? "s" : ""}
              </span>
              <span className="font-display text-sm tracking-wider text-red-400 ml-auto">
                {fmt(o.printer_cost_cents)}
              </span>
            </div>
          ))}
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <button
            onClick={() => setShowPaid((v) => !v)}
            className="flex items-center gap-1 text-[9px] font-marker tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors print:hidden"
          >
            {showPaid ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Paid History ({paid.length})
          </button>
          {showPaid && (
            <div className="border border-border bg-card divide-y divide-border mt-2">
              {paid.map((o) => (
                <div key={o.id} className="flex items-center gap-4 px-4 py-2.5">
                  <span className="text-muted-foreground text-[10px] font-mono w-20 shrink-0">
                    {o.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-muted-foreground text-[10px] shrink-0">{fmtDate(o.created_at)}</span>
                  <span className="text-[10px] text-green-400 shrink-0">
                    paid {fmtDate(o.printer_paid_at!)}
                  </span>
                  <span className="font-display text-sm tracking-wider text-green-400 ml-auto">
                    {fmt(o.printer_cost_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const InvoiceTracker = () => {
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery<OrderFinancial[]>({
    queryKey: ["financials"],
    queryFn: async () => {
      const [{ data: ordersData }, { data: itemsData }, { data: queueData }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, total_cents, subtotal_cents, shipping_cents")
          .eq("status", "paid")
          .order("created_at", { ascending: false }),
        supabase.from("order_items").select("order_id, quantity"),
        supabase.from("printer_queue").select("order_id, printer_paid_at"),
      ]);

      const itemCounts = new Map<string, number>();
      for (const it of itemsData ?? []) {
        itemCounts.set(it.order_id, (itemCounts.get(it.order_id) ?? 0) + it.quantity);
      }

      const paidAt = new Map<string, string | null>();
      for (const q of queueData ?? []) {
        paidAt.set(q.order_id, q.printer_paid_at ?? null);
      }

      return (ordersData ?? []).map((o) => {
        const itemCount = itemCounts.get(o.id) ?? 0;
        return {
          id: o.id,
          created_at: o.created_at,
          total_cents: o.total_cents ?? 0,
          subtotal_cents: o.subtotal_cents ?? 0,
          shipping_cents: o.shipping_cents ?? 0,
          revenue_cents: (o.total_cents ?? 0) - (o.shipping_cents ?? 0),
          item_count: itemCount,
          printer_cost_cents: itemCount * PRINT_COST_PER_ITEM_CENTS,
          printer_paid_at: paidAt.get(o.id) ?? null,
        };
      });
    },
    staleTime: 30_000,
  });

  const totalRevenue = orders.reduce((s, o) => s + o.revenue_cents, 0);
  const totalPrinterCost = orders.reduce((s, o) => s + o.printer_cost_cents, 0);
  const totalShipping = orders.reduce((s, o) => s + o.shipping_cents, 0);
  const totalProfit = totalRevenue - totalPrinterCost;
  const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "—";

  const thisWeekOrders = orders.filter((o) => isThisWeek(o.created_at));
  const thisWeekRevenue = thisWeekOrders.reduce((s, o) => s + o.revenue_cents, 0);
  const thisWeekPrinterCost = thisWeekOrders.reduce((s, o) => s + o.printer_cost_cents, 0);
  const thisWeekShipping = thisWeekOrders.reduce((s, o) => s + o.shipping_cents, 0);
  const thisWeekProfit = thisWeekRevenue - thisWeekPrinterCost;
  const thisWeekMarginPct =
    thisWeekRevenue > 0 ? ((thisWeekProfit / thisWeekRevenue) * 100).toFixed(1) : "—";

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #financial-report, #financial-report * { visibility: visible; }
          #financial-report { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div id="financial-report" className="space-y-8 max-w-3xl">
        <div className="flex items-end justify-between print:mb-6">
          <div>
            <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
              pournogravy
            </p>
            <h2 className="font-display text-2xl tracking-widest">FINANCIALS</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Week starts Sunday · Printer: $12/item
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="h-9 font-display text-xs tracking-widest print:hidden"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" /> PRINT REPORT
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <section className="space-y-3 print:break-inside-avoid">
              <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
                Profit Margin
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricBox label="Revenue" allTime={fmt(totalRevenue)} thisWeek={fmt(thisWeekRevenue)} />
                <MetricBox
                  label="Printer Cost"
                  allTime={fmt(totalPrinterCost)}
                  thisWeek={fmt(thisWeekPrinterCost)}
                  accent="text-red-400"
                />
                <MetricBox
                  label="Gross Profit"
                  allTime={fmt(totalProfit)}
                  thisWeek={fmt(thisWeekProfit)}
                  accent={totalProfit >= 0 ? "text-green-400" : "text-red-400"}
                />
                <div className="border border-[#fde047]/40 bg-card p-5 space-y-3">
                  <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
                    Margin %
                  </p>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      All-Time
                    </p>
                    <p className="font-display text-2xl tracking-wider text-[#fde047]">{marginPct}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      This Week
                    </p>
                    <p className="font-display text-lg tracking-wider text-[#fde047]">
                      {thisWeekMarginPct}%
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            <section className="space-y-3 print:break-inside-avoid">
              <p className="text-[10px] font-marker tracking-widest text-muted-foreground uppercase">
                Shipping Collected
              </p>
              <div className="grid grid-cols-2 gap-3">
                <MetricBox
                  label="Total Collected"
                  allTime={fmt(totalShipping)}
                  thisWeek={fmt(thisWeekShipping)}
                  accent="text-blue-400"
                />
                <div className="border border-border bg-card p-5 flex items-center justify-center">
                  <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                    Shipping fees charged to customers.
                    <br />
                    Does not include your actual carrier cost.
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-border" />

            <section>
              <PrinterBillSection
                orders={orders}
                onMarkedPaid={() => qc.invalidateQueries({ queryKey: ["financials"] })}
              />
            </section>

            <div className="hidden print:block text-xs text-muted-foreground mt-8 border-t border-border pt-4">
              <p>
                POURnogravy Financial Report · Generated{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p>Printer cost: $12/item · Week restarts Sunday</p>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default InvoiceTracker;
