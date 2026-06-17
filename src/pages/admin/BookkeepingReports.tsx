import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, Printer } from "lucide-react";
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
import { toCSV, downloadCSV, centsToStr, printHTML } from "@/lib/reportDownload";

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

  async function fetchReport() {
    const { start, end } = getPeriodDates(period);
    const res = await supabase.functions.invoke("generate-report", {
      body: {
        report_type: REPORT_TYPE_MAP[reportType],
        period_start: start,
        period_end: end,
      },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data?.data;
  }

  async function handleDownloadCSV() {
    setLoading(true);
    try {
      const data = await fetchReport();
      const { label } = getPeriodDates(period);
      const filename = `PG_${reportType}_${label.replace(/\s/g, "_")}.csv`;

      let rows: Record<string, unknown>[] = [];
      if (reportType === "pl") {
        rows = (data.months as Record<string, unknown>[]).map((m) => ({
          Month: m.label,
          Revenue: centsToStr(m.revenue as number),
          Refunds: centsToStr(m.refunds as number),
          COGS: centsToStr(m.cogs as number),
          Expenses: centsToStr(m.expenses as number),
          "Stripe Fees": centsToStr(m.stripe_fees as number),
          "Net Profit": centsToStr(m.net as number),
          Note: m.note ?? "",
        }));
      } else if (reportType === "orders") {
        rows = (data.rows as Record<string, unknown>[]).map((r) => ({
          Date: r.date,
          "Order ID": (r.order_id as string).slice(0, 8).toUpperCase(),
          Email: r.customer_email,
          Status: r.status,
          Subtotal: centsToStr(r.subtotal as number),
          Shipping: centsToStr(r.shipping as number),
          Tax: centsToStr(r.tax as number),
          Total: centsToStr(r.total as number),
          Refunded: r.refunded ? "Yes" : "No",
        }));
      } else if (reportType === "expenses") {
        rows = (data.rows as Record<string, unknown>[]).map((r) => ({
          Date: r.date,
          Category: r.category,
          Description: r.description,
          Amount: centsToStr(r.amount as number),
          Source: r.source,
        }));
      } else if (reportType === "products") {
        rows = (data.rows as Record<string, unknown>[]).map((r) => ({
          Product: r.name,
          Slug: r.slug,
          "Units Sold": r.units_sold,
          Revenue: centsToStr(r.revenue as number),
          COGS: centsToStr(r.cogs as number),
          "Margin %": r.margin_pct,
        }));
      } else if (reportType === "stripe_fees") {
        rows = (data.rows as Record<string, unknown>[]).map((r) => ({
          Date: r.date,
          "Charge ID": r.charge_id,
          Description: r.description,
          "Fee ($)": centsToStr(r.fee as number),
        }));
      }

      downloadCSV(toCSV(rows), filename);
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
      const data = await fetchReport();
      const { label } = getPeriodDates(period);
      const title = `${REPORT_LABELS[reportType]} — ${label}`;
      const fmt$ = (cents: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(cents / 100);

      let bodyHTML = `<h1>${title}</h1>`;

      if (reportType === "pl") {
        bodyHTML += `<table><thead><tr>
          <th>Month</th><th class="right">Revenue</th><th class="right">Refunds</th>
          <th class="right">COGS</th><th class="right">Expenses</th>
          <th class="right">Stripe Fees</th><th class="right">Net Profit</th>
        </tr></thead><tbody>`;
        for (const m of data.months as Record<string, unknown>[]) {
          bodyHTML += `<tr>
            <td>${m.label}</td>
            <td class="right">${fmt$(m.revenue as number)}</td>
            <td class="right">(${fmt$(m.refunds as number)})</td>
            <td class="right">(${fmt$(m.cogs as number)})</td>
            <td class="right">(${fmt$(m.expenses as number)})</td>
            <td class="right">(${fmt$(m.stripe_fees as number)})</td>
            <td class="right">${fmt$(m.net as number)}</td>
          </tr>`;
          if (m.note)
            bodyHTML += `<tr><td colspan="7"><div class="note">Note: ${m.note}</div></td></tr>`;
        }
        const t = data.totals as Record<string, number>;
        bodyHTML += `<tr class="total">
          <td>TOTAL</td>
          <td class="right">${fmt$(t.revenue)}</td>
          <td class="right">(${fmt$(t.refunds)})</td>
          <td class="right">(${fmt$(t.cogs)})</td>
          <td class="right">(${fmt$(t.expenses)})</td>
          <td class="right">(${fmt$(t.stripe_fees)})</td>
          <td class="right">${fmt$(t.net)}</td>
        </tr></tbody></table>
        <footer>POURnogravy · Cash-basis accounting · Generated ${new Date().toLocaleDateString()}</footer>`;
      } else {
        bodyHTML += `<p>Use CSV download for tabular reports. This view is optimised for P&amp;L statements.</p>`;
      }

      printHTML(bodyHTML, title);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate report");
    } finally {
      setLoading(false);
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
