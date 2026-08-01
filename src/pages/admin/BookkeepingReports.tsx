import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import {
  format,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  startOfMonth,
  endOfMonth,
  subQuarters,
  subMonths,
} from "date-fns";

type ReportType = "pl" | "orders" | "expenses" | "products" | "stripe_fees";
type PeriodType =
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year";

const REPORT_LABELS: Record<ReportType, string> = {
  pl: "P&L Statement",
  orders: "Order Summary",
  expenses: "Expense Detail",
  products: "Sales by Product",
  stripe_fees: "Stripe Fee Summary",
};

const REPORT_TYPE_MAP: Record<ReportType, string> = {
  pl: "pl_statement",
  orders: "order_summary",
  expenses: "expense_detail",
  products: "sales_by_product",
  stripe_fees: "stripe_fee_summary",
};

function getPeriodDates(period: PeriodType): {
  start: string;
  end: string;
  label: string;
} {
  const now = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (period) {
    case "this_month":
      return {
        start: fmt(startOfMonth(now)),
        end: fmt(endOfMonth(now)),
        label: format(now, "MMMM yyyy"),
      };
    case "last_month": {
      const last = subMonths(now, 1);
      return {
        start: fmt(startOfMonth(last)),
        end: fmt(endOfMonth(last)),
        label: format(last, "MMMM yyyy"),
      };
    }
    case "this_quarter":
      return {
        start: fmt(startOfQuarter(now)),
        end: fmt(endOfQuarter(now)),
        label: `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`,
      };
    case "last_quarter": {
      const lq = subQuarters(now, 1);
      return {
        start: fmt(startOfQuarter(lq)),
        end: fmt(endOfQuarter(lq)),
        label: `Q${Math.ceil((lq.getMonth() + 1) / 3)} ${lq.getFullYear()}`,
      };
    }
    case "this_year":
      return {
        start: fmt(startOfYear(now)),
        end: fmt(endOfYear(now)),
        label: String(now.getFullYear()),
      };
    case "last_year": {
      const ly = new Date(now.getFullYear() - 1, 0, 1);
      return {
        start: fmt(startOfYear(ly)),
        end: fmt(endOfYear(ly)),
        label: String(now.getFullYear() - 1),
      };
    }
  }
}

export default function BookkeepingReports() {
  const [reportType, setReportType] = useState<ReportType>("pl");
  const [period, setPeriod] = useState<PeriodType>("this_year");
  const [loading, setLoading] = useState(false);

  async function fetchReportRaw(fmt: "csv" | "html"): Promise<string> {
    const { start, end } = getPeriodDates(period);
    const res = await supabase.functions.invoke("generate-report", {
      body: {
        report_type: REPORT_TYPE_MAP[reportType],
        period_start: start,
        period_end: end,
        format: fmt,
      },
      headers: { Accept: fmt === "html" ? "text/html" : "text/csv" },
    });
    if (res.error) throw new Error(res.error.message);
    const raw = res.data;
    return raw instanceof Blob ? await raw.text() : (raw as string);
  }

  async function handleDownloadCSV() {
    setLoading(true);
    try {
      const csvText = await fetchReportRaw("csv");
      const { label } = getPeriodDates(period);
      const filename = `PG_${reportType}_${label.replace(/\s/g, "_")}.csv`;
      const url = URL.createObjectURL(new Blob([csvText], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    setLoading(true);
    try {
      const htmlText = await fetchReportRaw("html");
      const url = URL.createObjectURL(new Blob([htmlText], { type: "text/html" }));
      const win = window.open(url, "_blank");
      if (win) {
        win.onload = () => {
          win.print();
          URL.revokeObjectURL(url);
        };
      } else {
        URL.revokeObjectURL(url);
        toast.error("Pop-up blocked — please allow pop-ups for this site.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Generate and download reports for any period. P&amp;L supports PDF
        print; all reports support CSV.
      </p>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Report</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
          >
            {Object.entries(REPORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
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
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          PDF opens a print dialog — choose &ldquo;Save as PDF&rdquo; to save.
        </p>

        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1 gap-2"
            onClick={handleDownloadCSV}
            disabled={loading}
          >
            <Download className="w-4 h-4" />
            {loading ? "Generating…" : "Download CSV"}
          </Button>
          {reportType === "pl" && (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handlePrint}
              disabled={loading}
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
