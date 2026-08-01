import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Printer, Loader2 } from "lucide-react";
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

const REPORT_TYPE = "payout_reconciliation";

export default function Payouts() {
  const [period, setPeriod] = useState<ReportPeriod>("this_year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [exporting, setExporting] = useState(false);

  const { start, end, label } = getPeriodDates(period, customStart, customEnd);
  const customIncomplete = period === "custom" && (!customStart || !customEnd);
  const customRangeInverted =
    period === "custom" && !!customStart && !!customEnd && customEnd < customStart;
  const customInvalid = customIncomplete || customRangeInverted;

  const {
    data: reportData,
    isLoading: reportLoading,
    isError: reportErrored,
    error: reportError,
  } = useQuery<ReportData>({
    queryKey: ["report-json", REPORT_TYPE, period, customStart, customEnd],
    enabled: !customInvalid,
    queryFn: () => fetchReportJson(REPORT_TYPE, start, end),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (reportErrored) {
      toast.error(reportError instanceof Error ? reportError.message : "Failed to load payouts");
    }
  }, [reportErrored, reportError]);

  async function handleDownloadCSV() {
    setExporting(true);
    try {
      const csvText = await fetchReportRaw(REPORT_TYPE, start, end, "csv");
      const filename = `PG_payout_reconciliation_${label.replace(/\s/g, "_")}.csv`;
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
      const htmlText = await fetchReportRaw(REPORT_TYPE, start, end, "html");
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
        <h1 className="font-display text-2xl tracking-widest">PAYOUTS</h1>
        <p className="text-xs text-muted-foreground mt-1 font-marker tracking-widest">
          RECONCILE STRIPE PAYOUTS AGAINST GROSS, FEES, AND REFUNDS
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            className="w-full sm:w-64 border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
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
          Net Deposit ties to the amount deposited in your bank for each payout.
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
            : "Pick a start and end date to view payouts."}
        </div>
      ) : reportLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reportErrored ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-red-400">
          {reportError instanceof Error ? reportError.message : "Failed to load payouts."}
        </div>
      ) : reportData ? (
        <ReportTable data={reportData} />
      ) : null}
    </div>
  );
}
