// Shared fetch/export helpers for the `generate-report` edge function.
// Used by both the Reports tab (BookkeepingReports.tsx) and the Payouts tab
// (Payouts.tsx) — extracted here so the JSON-auto-parse handling (and any
// future fix to it) lives in exactly one place.
import { supabase } from "@/integrations/supabase/client";
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

/** The `format:"json"` shape returned by the `generate-report` edge function. */
export interface ReportData {
  title: string;
  period: { start: string; end: string };
  columns: string[];
  rows: string[][];
  totals: Record<string, string>;
  notes: string[];
}

export type ReportPeriod =
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export function getPeriodDates(
  period: ReportPeriod,
  customStart: string,
  customEnd: string
): { start: string; end: string; label: string } {
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
    case "custom":
      return {
        start: customStart,
        end: customEnd,
        label: customStart && customEnd ? `${customStart} – ${customEnd}` : "Custom Range",
      };
  }
}

// CSV/HTML responses come back from functions-js as text (occasionally a
// Blob) — this path returns a string for download/print.
export async function fetchReportRaw(
  reportType: string,
  start: string,
  end: string,
  fmt: "csv" | "html"
): Promise<string> {
  const res = await supabase.functions.invoke("generate-report", {
    body: {
      report_type: reportType,
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

// JSON responses come back from functions-js ALREADY PARSED: @supabase/functions-js
// auto-parses any `Content-Type: application/json` response via response.json(),
// so res.data is already a plain object — never a Blob, never a JSON string.
// Only fall back to JSON.parse if it somehow arrives as text (defensive).
export async function fetchReportJson(
  reportType: string,
  start: string,
  end: string
): Promise<ReportData> {
  const res = await supabase.functions.invoke("generate-report", {
    body: {
      report_type: reportType,
      period_start: start,
      period_end: end,
      format: "json",
    },
    headers: { Accept: "application/json" },
  });
  if (res.error) throw new Error(res.error.message);
  const raw = res.data;
  if (raw && typeof raw === "object" && !(raw instanceof Blob)) {
    return raw as ReportData;
  }
  const text = raw instanceof Blob ? await raw.text() : String(raw);
  return JSON.parse(text) as ReportData;
}

/** Triggers a browser download of the given CSV text. */
export function downloadReportCSV(csvText: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csvText], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Opens the given report HTML in a new tab and triggers the print dialog.
 *  Returns `{ ok: false }` if the pop-up was blocked so the caller can toast. */
export function printReportHTML(htmlText: string): { ok: boolean } {
  const url = URL.createObjectURL(new Blob([htmlText], { type: "text/html" }));
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    return { ok: false };
  }
  win.onload = () => {
    win.print();
    URL.revokeObjectURL(url);
  };
  return { ok: true };
}
