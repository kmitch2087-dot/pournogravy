import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Printer, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ReportTable } from "@/components/admin/ReportTable";
import {
  getPeriodDates,
  fetchReportJson,
  fetchReportRaw,
  downloadReportCSV,
  printReportHTML,
  type ReportData,
  type ReportPeriod,
} from "@/lib/reports";

type ReportType =
  | "pl_statement"
  | "order_summary"
  | "expense_detail"
  | "sales_by_product"
  | "stripe_fee_summary"
  | "sales_tax"
  | "top_customers"
  | "refunds_disputes"
  | "payout_reconciliation"
  | "tax_estimate";

type PeriodType = ReportPeriod;

const REPORT_LABELS: Record<ReportType, string> = {
  pl_statement: "P&L Statement",
  order_summary: "Order Summary",
  expense_detail: "Expense Detail",
  sales_by_product: "Sales by Product",
  stripe_fee_summary: "Stripe Fee Summary",
  sales_tax: "Sales Tax",
  top_customers: "Top Customers",
  refunds_disputes: "Refunds & Disputes",
  payout_reconciliation: "Payout Reconciliation",
  tax_estimate: "Tax Estimate",
};

const REPORT_TYPES = Object.keys(REPORT_LABELS) as ReportType[];

/** Chart config for the two report types that get a contextual bar chart:
 *  x = first column (identity), y = the primary money column. Single-series
 *  bar chart → no legend needed (title names the series); colors follow the
 *  brand palette already used on the Analytics tab. */
const CHART_CONFIG: Partial<Record<ReportType, { valueColumn: string; color: string }>> = {
  sales_by_product: { valueColumn: "Revenue", color: "#fde047" },
  sales_tax: { valueColumn: "Tax Collected", color: "#60a5fa" },
};

function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground font-semibold mb-1">{label}</p>
      <p className="font-bold tabular-nums">${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
};

function ReportChart({ reportType, data }: { reportType: ReportType; data: ReportData }) {
  const config = CHART_CONFIG[reportType];
  if (!config || data.rows.length === 0) return null;

  const valueColIndex = data.columns.indexOf(config.valueColumn);
  if (valueColIndex === -1) return null;

  const chartData = data.rows
    .slice(0, 12)
    .map((row) => ({ name: row[0] ?? "—", value: parseMoney(row[valueColIndex]) }));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase mb-5">
        {config.valueColumn} by {data.columns[0]}
      </h2>
      <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 32)}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" fill={config.color} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function BookkeepingReports() {
  const [reportType, setReportType] = useState<ReportType>("pl_statement");
  const [period, setPeriod] = useState<PeriodType>("this_year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [exporting, setExporting] = useState(false);

  const { start, end, label } = getPeriodDates(period, customStart, customEnd);
  const customIncomplete = period === "custom" && (!customStart || !customEnd);
  const customRangeInverted =
    period === "custom" && !!customStart && !!customEnd && customEnd < customStart;
  // Combined gate: any custom-range problem (missing dates OR end before start)
  // disables the fetch + export buttons the same way.
  const customInvalid = customIncomplete || customRangeInverted;

  const {
    data: reportData,
    isLoading: reportLoading,
    isError: reportErrored,
    error: reportError,
  } = useQuery<ReportData>({
    queryKey: ["report-json", reportType, period, customStart, customEnd],
    enabled: !customInvalid,
    queryFn: () => fetchReportJson(reportType, start, end),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (reportErrored) {
      toast.error(reportError instanceof Error ? reportError.message : "Failed to load report");
    }
  }, [reportErrored, reportError]);

  async function handleDownloadCSV() {
    setExporting(true);
    try {
      const csvText = await fetchReportRaw(reportType, start, end, "csv");
      const filename = `PG_${reportType}_${label.replace(/\s/g, "_")}.csv`;
      downloadReportCSV(csvText, filename);
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setExporting(false);
    }
  }

  async function handlePrint() {
    setExporting(true);
    try {
      const htmlText = await fetchReportRaw(reportType, start, end, "html");
      const { ok } = printReportHTML(htmlText);
      if (!ok) {
        toast.error("Pop-up blocked — please allow pop-ups for this site.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl tracking-widest">REPORTS</h1>
        <p className="text-xs text-muted-foreground mt-1 font-marker tracking-widest">
          GENERATE, VIEW, AND EXPORT REPORTS FOR ANY PERIOD
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Report</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
            >
              {REPORT_TYPES.map((k) => (
                <option key={k} value={k}>
                  {REPORT_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {period === "custom" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
              />
            </div>
            {customRangeInverted && (
              <p className="col-span-2 text-xs text-red-400">
                End date must be on or after the start date.
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          PDF opens a print dialog — choose &ldquo;Save as PDF&rdquo; to save.
        </p>

        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={handleDownloadCSV}
            disabled={exporting || customInvalid}
          >
            <Download className="w-4 h-4" />
            {exporting ? "Generating…" : "Download CSV"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handlePrint}
            disabled={exporting || customInvalid}
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {customInvalid ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {customRangeInverted
            ? "End date must be on or after the start date."
            : "Pick a start and end date to view this report."}
        </div>
      ) : reportLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reportErrored ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-red-400">
          {reportError instanceof Error ? reportError.message : "Failed to load report."}
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          <ReportChart reportType={reportType} data={reportData} />
          <ReportTable data={reportData} />
        </div>
      ) : null}
    </div>
  );
}
