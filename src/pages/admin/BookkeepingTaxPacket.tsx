import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import JSZip from "jszip";
import { toCSV, centsToStr } from "@/lib/reportDownload";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Snapshot {
  id: string; year: number; month: number;
  revenue_cents: number; refunds_cents: number; cogs_cents: number;
  expenses_cents: number; stripe_fees_cents: number; net_profit_cents: number;
  closed_at: string; amended_at: string | null; amendment_note: string | null;
}

const fmt$ = (cents: number) =>
  new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);

async function callReport(type: string, year: number) {
  const res = await supabase.functions.invoke("generate-report", {
    body: {
      report_type:   type,
      period_start:  `${year}-01-01`,
      period_end:    `${year}-12-31`,
    },
  });
  if (res.error) throw new Error(res.error.message);
  return res.data?.data;
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

      const [plData, ordersData, expData, prodData, feesData] = await Promise.all([
        callReport("pl",          selectedYear),
        callReport("orders",      selectedYear),
        callReport("expenses",    selectedYear),
        callReport("products",    selectedYear),
        callReport("stripe_fees", selectedYear),
      ]);

      const zip = new JSZip();
      const y   = selectedYear;

      // 1. Orders CSV
      zip.file(`PG_${y}_Orders.csv`, toCSV(
        (ordersData.rows as Record<string,unknown>[]).map((r) => ({
          Date:       r.date,
          "Order ID": (r.order_id as string).slice(0,8).toUpperCase(),
          Email:      r.customer_email,
          Status:     r.status,
          Subtotal:   centsToStr(r.subtotal as number),
          Shipping:   centsToStr(r.shipping as number),
          Tax:        centsToStr(r.tax as number),
          Total:      centsToStr(r.total as number),
          Refunded:   r.refunded ? "Yes" : "No",
        }))
      ));

      // 2. Expenses CSV
      zip.file(`PG_${y}_Expenses.csv`, toCSV(
        (expData.rows as Record<string,unknown>[]).map((r) => ({
          Date:         r.date,
          Category:     r.category,
          Description:  r.description,
          "Amount ($)": centsToStr(r.amount as number),
          Source:       r.source,
        }))
      ));

      // 3. Stripe Fees CSV
      zip.file(`PG_${y}_Stripe_Fees.csv`, toCSV(
        (feesData.rows as Record<string,unknown>[]).map((r) => ({
          Date:        r.date,
          "Charge ID": r.charge_id,
          Description: r.description,
          "Fee ($)":   centsToStr(r.fee as number),
        }))
      ));

      // 4. COGS by Product CSV
      zip.file(`PG_${y}_COGS_by_Product.csv`, toCSV(
        (prodData.rows as Record<string,unknown>[]).map((r) => ({
          Product:       r.name,
          "Units Sold":  r.units_sold,
          "Revenue ($)": centsToStr(r.revenue as number),
          "COGS ($)":    centsToStr(r.cogs as number),
          "Margin %":    r.margin_pct,
        }))
      ));

      // 5. P&L Statement as HTML (print to PDF manually)
      const totals = plData.totals as Record<string,number>;
      let plHTML = `<!DOCTYPE html><html><head><title>PG ${y} P&L</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:12px;max-width:720px;margin:40px auto;color:#000}
        h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#f0f0f0;text-align:left;padding:6px 8px;border-bottom:1px solid #ccc;font-size:11px}
        td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
        .right{text-align:right}.total{font-weight:bold;background:#f9f9f9}
        .note{background:#fffbe6;border-left:3px solid #f0c040;padding:8px 12px;margin:4px 0;font-size:11px}
        footer{margin-top:40px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:8px}
        .summary{background:#f9f9f9;border:1px solid #ddd;padding:16px;margin-bottom:24px}
        .summary-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
        .summary-total{font-weight:bold;border-top:1px solid #ccc;margin-top:8px;padding-top:8px}
      </style></head><body>
      <h1>POURnogravy — ${y} Profit &amp; Loss Statement</h1>
      <div class="summary">
        <div class="summary-row"><span>Gross Revenue</span><span>${fmt$(totals.revenue)}</span></div>
        <div class="summary-row"><span>Refunds Issued</span><span>(${fmt$(totals.refunds)})</span></div>
        <div class="summary-row"><span>Cost of Goods Sold</span><span>(${fmt$(totals.cogs)})</span></div>
        <div class="summary-row"><span>Operating Expenses</span><span>(${fmt$(totals.expenses)})</span></div>
        <div class="summary-row summary-total"><span>Net Profit</span><span>${fmt$(totals.net)}</span></div>
      </div>
      <h2 style="font-size:14px;margin-bottom:8px">Monthly Breakdown</h2>
      <table><thead><tr>
        <th>Month</th><th class="right">Revenue</th><th class="right">Refunds</th>
        <th class="right">COGS</th><th class="right">Expenses</th><th class="right">Net</th>
      </tr></thead><tbody>`;

      for (const m of plData.months as Record<string,unknown>[]) {
        plHTML += `<tr>
          <td>${m.label}</td>
          <td class="right">${fmt$(m.revenue as number)}</td>
          <td class="right">(${fmt$(m.refunds as number)})</td>
          <td class="right">(${fmt$(m.cogs as number)})</td>
          <td class="right">(${fmt$(m.expenses as number)})</td>
          <td class="right">${fmt$(m.net as number)}</td>
        </tr>`;
        if (m.note) plHTML += `<tr><td colspan="6"><div class="note">Note: ${m.note}</div></td></tr>`;
      }
      plHTML += `<tr class="total">
        <td>TOTAL</td>
        <td class="right">${fmt$(totals.revenue)}</td>
        <td class="right">(${fmt$(totals.refunds)})</td>
        <td class="right">(${fmt$(totals.cogs)})</td>
        <td class="right">(${fmt$(totals.expenses)})</td>
        <td class="right">${fmt$(totals.net)}</td>
      </tr></tbody></table>
      <footer>
        POURnogravy · Cash-basis accounting · Generated ${new Date().toLocaleDateString()} ·
        Please review all figures with your accountant before filing.
      </footer></body></html>`;

      zip.file(`PG_${y}_PL_Statement.html`, plHTML);

      // 6. Cover sheet
      const coverHTML = `<!DOCTYPE html><html><head><title>PG ${y} Tax Summary</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:13px;max-width:600px;margin:60px auto;color:#000}
        h1{font-size:22px;margin-bottom:4px}
        .sub{color:#666;font-size:13px;margin-bottom:32px}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
        .total-row{display:flex;justify-content:space-between;padding:12px 0;font-weight:bold;font-size:15px;border-top:2px solid #000;margin-top:8px}
        .note{background:#fffbe6;border-left:3px solid #f0c040;padding:12px 16px;margin-top:32px;font-size:12px;line-height:1.6}
        footer{margin-top:40px;font-size:11px;color:#888}
      </style></head><body>
      <h1>POURnogravy</h1>
      <div class="sub">Tax Year ${y} · Cash-Basis Summary</div>
      <div class="row"><span>Gross Revenue</span><span>${fmt$(totals.revenue)}</span></div>
      <div class="row"><span>Refunds Issued</span><span>(${fmt$(totals.refunds)})</span></div>
      <div class="row"><span>Cost of Goods Sold</span><span>(${fmt$(totals.cogs)})</span></div>
      <div class="row"><span>Operating Expenses</span><span>(${fmt$(totals.expenses)})</span></div>
      <div class="row"><span>&nbsp;&nbsp;of which: Stripe Processing Fees</span><span>(${fmt$(totals.stripe_fees)})</span></div>
      <div class="total-row"><span>Net Profit (Loss)</span><span>${fmt$(totals.net)}</span></div>
      <div class="note">
        <strong>Note to accountant:</strong> This packet was generated from POURnogravy's sales dashboard.
        All figures reflect cash-basis accounting. Stripe fee data sourced directly from Stripe Balance
        Transactions API. The P&amp;L HTML file can be opened in any browser and printed to PDF.
        Please review all figures before filing.
      </div>
      <footer>Generated ${new Date().toLocaleString()} · pournogravy.com</footer>
      </body></html>`;

      zip.file(`PG_${y}_Summary.html`, coverHTML);

      // README
      zip.file("README.txt",
        `POURnogravy Tax Packet — ${y}\n\n` +
        `Files included:\n` +
        `  PG_${y}_PL_Statement.html  — Open in browser, use File → Print → Save as PDF\n` +
        `  PG_${y}_Orders.csv         — All orders for the year\n` +
        `  PG_${y}_Expenses.csv       — Itemized expenses (Schedule C aligned)\n` +
        `  PG_${y}_Stripe_Fees.csv    — Stripe processing fees\n` +
        `  PG_${y}_COGS_by_Product.csv — Cost of goods by product\n` +
        `  PG_${y}_Summary.html       — Year-end summary cover sheet\n\n` +
        `All figures reflect cash-basis accounting.\n` +
        `Please review all figures with your accountant before filing.\n`
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
      <Link
        to="/admin/bookkeeping"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Bookkeeping
      </Link>

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
              `PG_${selectedYear}_Summary.html`,
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
