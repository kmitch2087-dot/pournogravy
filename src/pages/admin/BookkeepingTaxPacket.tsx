import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import JSZip from "jszip";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Snapshot {
  id: string; year: number; month: number;
  revenue_cents: number; refunds_cents: number; cogs_cents: number;
  expenses_cents: number; stripe_fees_cents: number; net_profit_cents: number;
  closed_at: string; amended_at: string | null; amendment_note: string | null;
}


async function callReport(type: string, year: number, format: "csv" | "html"): Promise<string> {
  const acceptHeader = format === "html" ? "text/html" : "text/csv";
  const res = await supabase.functions.invoke("generate-report", {
    body: {
      report_type:  type,
      period_start: `${year}-01-01`,
      period_end:   `${year}-12-31`,
      format,
    },
    headers: { Accept: acceptHeader },
  });
  if (res.error) throw new Error(res.error.message);
  const raw = res.data;
  return raw instanceof Blob ? await raw.text() : (raw as string);
}

export default function BookkeepingTaxPacket() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [generating, setGenerating]     = useState(false);

  const { data: snapshots = [] } = useQuery<Snapshot[]>({
    queryKey: ["bk-tax-snapshots", selectedYear],
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

  const snapMap    = Object.fromEntries(snapshots.map((s) => [s.month, s]));
  const closedCount = snapshots.length;
  const allClosed   = closedCount === 12;

  async function generatePacket() {
    setGenerating(true);
    try {
      toast.info("Generating tax packet…");

      const [plHTML, ordersCSV, expCSV, cogsCSV, feesCSV] = await Promise.all([
        callReport("pl_statement",      selectedYear, "html"),
        callReport("order_summary",     selectedYear, "csv"),
        callReport("expense_detail",    selectedYear, "csv"),
        callReport("sales_by_product",  selectedYear, "csv"),
        callReport("stripe_fee_summary",selectedYear, "csv"),
      ]);

      const zip = new JSZip();
      const y   = selectedYear;

      // 1. P&L Statement HTML (returned directly from edge function)
      zip.file(`PG_${y}_PL_Statement.html`, plHTML);

      // 2. Orders CSV
      zip.file(`PG_${y}_Orders.csv`, ordersCSV);

      // 3. Expenses CSV
      zip.file(`PG_${y}_Expenses.csv`, expCSV);

      // 4. Stripe Fees CSV
      zip.file(`PG_${y}_Stripe_Fees.csv`, feesCSV);

      // 5. COGS by Product CSV
      zip.file(`PG_${y}_COGS_by_Product.csv`, cogsCSV);

      // 6. Summary text
      zip.file(`PG_${y}_Summary.txt`,
        `POURnogravy\n` +
        `Tax Year: ${y}\n\n` +
        `This packet was generated from POURnogravy's sales dashboard.\n` +
        `All figures reflect cash-basis accounting.\n` +
        `Stripe fee data sourced directly from Stripe Balance Transactions API.\n` +
        `Please review all figures with your accountant before filing.\n\n` +
        `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}\n`
      );

      // README
      zip.file("README.txt",
        `TAX PACKET — POURnogravy ${y}\n\n` +
        `Files in this ZIP:\n` +
        `- PG_${y}_PL_Statement.html  ← Open in browser, File → Print → Save as PDF\n` +
        `- PG_${y}_Orders.csv\n` +
        `- PG_${y}_Expenses.csv\n` +
        `- PG_${y}_Stripe_Fees.csv\n` +
        `- PG_${y}_COGS_by_Product.csv\n` +
        `- PG_${y}_Summary.txt\n\n` +
        `For your accountant: Please send all files in this ZIP.\n`
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `PG_Taxes_${y}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Tax packet for ${y} downloaded!`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate packet");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Tax Packet</h1>
      <p className="text-muted-foreground text-sm mb-6">
        One-click year-end export. Download and send the ZIP to your accountant.
      </p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <label className="text-sm font-medium block mb-1.5">Tax Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - 1 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">
            Monthly close status ({closedCount}/12 closed)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES.map((name, idx) => {
              const m    = idx + 1;
              const snap = snapMap[m];
              return (
                <div
                  key={m}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  {snap?.amended_at
                    ? <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    : snap
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    : <Clock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  {name}
                </div>
              );
            })}
          </div>
        </div>

        {!allClosed && (
          <div className="flex items-start gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 text-sm text-yellow-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {12 - closedCount} month{12 - closedCount !== 1 ? "s" : ""} not yet closed.
              The packet will include available data — open months use live figures.
            </span>
          </div>
        )}

        <div>
          <div className="text-sm font-medium mb-2">Packet contents</div>
          <ul className="space-y-1 text-xs text-muted-foreground font-mono">
            {[
              `PG_${selectedYear}_PL_Statement.html`,
              `PG_${selectedYear}_Orders.csv`,
              `PG_${selectedYear}_Expenses.csv`,
              `PG_${selectedYear}_Stripe_Fees.csv`,
              `PG_${selectedYear}_COGS_by_Product.csv`,
              `PG_${selectedYear}_Summary.txt`,
              "README.txt",
            ].map((f) => <li key={f}>• {f}</li>)}
          </ul>
        </div>

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={generatePacket}
          disabled={generating}
        >
          <Download className="w-5 h-5" />
          {generating ? "Building packet…" : `Generate Tax Packet for ${selectedYear}`}
        </Button>
      </div>
    </div>
  );
}
