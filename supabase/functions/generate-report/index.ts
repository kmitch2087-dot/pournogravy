// generate-report edge function
// Returns CSV or HTML report data for one of five report types:
//   pl_statement | order_summary | expense_detail | sales_by_product | stripe_fee_summary
//
// Consumed by Tasks 10 (Financials page) and 11 (Report export UI).
//
// SECRETS REQUIRED:
//   SUPABASE_URL              (standard — always available in edge functions)
//   SUPABASE_SERVICE_ROLE_KEY (standard — always available in edge functions)
//   SUPABASE_ANON_KEY         (standard — always available in edge functions)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

type ReportType = "pl_statement" | "order_summary" | "expense_detail" | "sales_by_product" | "stripe_fee_summary";
type ReportFormat = "csv" | "html" | "json";

// ── Formatting helpers ───────────────────────────────────────────────────────

function cents(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

function sumColumn(rows: string[][], colIndex: number): number {
  return rows.reduce((s, r) => {
    const n = Number((r[colIndex] ?? "").replace(/[$,()]/g, "")) || 0;
    return s + n;
  }, 0);
}

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatCSV(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

function formatHTML(
  headers: string[],
  rows: string[][],
  title: string,
  periodStart: string,
  periodEnd: string,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const thead = headers.map((h) => `<th>${h}</th>`).join("");
  const tbody = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — POURnogravy</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; }
  header { display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #fde047; padding-bottom: 14px; margin-bottom: 20px; }
  .logo { height: 52px; width: auto; display: block; }
  .header-text { flex: 1; }
  .report-title { font-size: 16px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #111; }
  .period { color: #555; margin-top: 3px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead { background: #fde047; }
  thead th { padding: 8px 10px; text-align: left; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid #e5c500; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody td { padding: 7px 10px; border: 1px solid #e5e5e5; vertical-align: top; }
  footer { margin-top: 24px; font-size: 11px; color: #888; border-top: 1px solid #e5e5e5; padding-top: 12px; }
  @media print { body { margin: 0; padding: 12px; } }
</style>
</head>
<body>
<header>
  <img class="logo" src="https://pournogravy.com/logo.webp" alt="POURnogravy" />
  <div class="header-text">
    <div class="report-title">${title}</div>
    <div class="period">Period: ${periodStart} – ${periodEnd}</div>
  </div>
</header>
<table>
  <thead><tr>${thead}</tr></thead>
  <tbody>
${tbody}
  </tbody>
</table>
<footer>Generated ${today} — Cash basis accounting.</footer>
</body>
</html>`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── Auth: admin JWT or service role key ──────────────────────────────────
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    let authorized = token === serviceKey;

    if (!authorized && token) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await userClient
          .from("profiles")
          .select("is_admin")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (profile?.is_admin) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── Parse and validate body ──────────────────────────────────────────────
    const body = (await req.json()) as {
      report_type: ReportType;
      format: ReportFormat;
      period_start: string;
      period_end: string;
    };

    const { report_type, format, period_start, period_end } = body;

    if (!report_type || !format || !period_start || !period_end) {
      return new Response(
        JSON.stringify({ error: "report_type, format, period_start, period_end are required" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const validTypes: ReportType[] = ["pl_statement", "order_summary", "expense_detail", "sales_by_product", "stripe_fee_summary"];
    if (!validTypes.includes(report_type)) {
      return new Response(
        JSON.stringify({ error: `Unknown report_type: ${report_type}. Must be one of: ${validTypes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const validFormats: ReportFormat[] = ["csv", "html", "json"];
    if (!validFormats.includes(format)) {
      return new Response(
        JSON.stringify({ error: `Unknown format: ${format}. Must be one of: csv, html, json` }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabase  = createClient(supabaseUrl, serviceKey);
    // Use inclusive timestamp bounds for orders (created_at is a timestamptz)
    const startTs   = `${period_start}T00:00:00.000Z`;
    // Exclusive upper bound: period_end date + 1 day
    const endDate   = new Date(period_end);
    endDate.setDate(endDate.getDate() + 1);
    const endTsExcl = endDate.toISOString().slice(0, 10) + "T00:00:00.000Z";

    let headers: string[] = [];
    let rows: string[][] = [];
    let title = "";
    let totals: Record<string, string> = {};
    let notes: string[] = [];

    // ── P&L Statement ────────────────────────────────────────────────────────
    if (report_type === "pl_statement") {
      title = "Profit & Loss Statement";
      headers = ["Month", "Gross Revenue", "Refunds", "Net Revenue", "COGS", "Expenses", "Stripe Fees", "Net Profit"];

      const startYear  = new Date(period_start).getUTCFullYear();
      const startMonth = new Date(period_start).getUTCMonth() + 1;
      const endYear    = new Date(period_end).getUTCFullYear();
      const endMonth   = new Date(period_end).getUTCMonth() + 1;

      const { data: snaps, error: snapErr } = await supabase
        .from("monthly_snapshots")
        .select("year, month, revenue_cents, refunds_cents, cogs_cents, expenses_cents, stripe_fees_cents, net_profit_cents, amendment_note, amended_at")
        .or(`year.gte.${startYear},year.lte.${endYear}`)
        .order("year")
        .order("month");

      if (snapErr) throw new Error(`Snapshot query failed: ${snapErr.message}`);

      const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      const filtered = (snaps ?? []).filter((s) => {
        if (s.year < startYear || s.year > endYear) return false;
        if (s.year === startYear && s.month < startMonth) return false;
        if (s.year === endYear   && s.month > endMonth)   return false;
        return true;
      });

      rows = filtered.map((s) => [
        `${MONTH_NAMES[s.month - 1]} ${s.year}`,
        cents(s.revenue_cents ?? 0),
        cents(s.refunds_cents ?? 0),
        cents((s.revenue_cents ?? 0) - (s.refunds_cents ?? 0)),
        cents(s.cogs_cents ?? 0),
        cents(s.expenses_cents ?? 0),
        cents(s.stripe_fees_cents ?? 0),
        cents(s.net_profit_cents ?? 0),
      ]);

      totals = { "Net Profit": cents(sumColumn(rows, 7) * 100) };
      notes = filtered
        .filter((s) => s.amendment_note)
        .map((s) => `${MONTH_NAMES[s.month - 1]} ${s.year} amended: ${s.amendment_note}`);
    }

    // ── Order Summary ────────────────────────────────────────────────────────
    else if (report_type === "order_summary") {
      title = "Order Summary";
      headers = ["Month", "Orders", "Gross Revenue", "Refunds", "Net Revenue"];

      const { data: orders, error: ordErr } = await supabase
        .from("orders")
        .select("id, created_at, status, total_cents")
        .eq("is_test", false)
        .gte("created_at", startTs)
        .lt("created_at", endTsExcl)
        .order("created_at", { ascending: true });

      if (ordErr) throw new Error(`Orders query failed: ${ordErr.message}`);

      // Group by month
      const byMonth: Record<string, { orders: number; gross: number; refunds: number }> = {};
      const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      for (const o of orders ?? []) {
        const d = new Date(o.created_at);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        if (!byMonth[key]) byMonth[key] = { orders: 0, gross: 0, refunds: 0 };
        byMonth[key].orders++;
        byMonth[key].gross += o.total_cents ?? 0;
        if (o.status === "refunded") byMonth[key].refunds += o.total_cents ?? 0;
      }

      rows = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, m]) => {
          const [year, mon] = key.split("-");
          const label = `${MONTH_NAMES[parseInt(mon) - 1]} ${year}`;
          return [
            label,
            String(m.orders),
            cents(m.gross),
            cents(m.refunds),
            cents(m.gross - m.refunds),
          ];
        });

      totals = { "Net Revenue": cents(sumColumn(rows, 4) * 100) };
    }

    // ── Expense Detail ───────────────────────────────────────────────────────
    else if (report_type === "expense_detail") {
      title = "Expense Detail";
      headers = ["Date", "Category", "Description", "Amount", "Source"];

      const { data: exps, error: expErr } = await supabase
        .from("expenses")
        .select("date, category, description, amount_cents, source")
        .gte("date", period_start)
        .lte("date", period_end)
        .order("date", { ascending: false });

      if (expErr) throw new Error(`Expenses query failed: ${expErr.message}`);

      rows = (exps ?? []).map((e) => [
        e.date ?? "",
        e.category ?? "",
        e.description ?? "",
        cents(e.amount_cents ?? 0),
        e.source ?? "",
      ]);

      totals = { "Total Expenses": cents(sumColumn(rows, 3) * 100) };
    }

    // ── Sales by Product ─────────────────────────────────────────────────────
    else if (report_type === "sales_by_product") {
      title = "Sales by Product";
      headers = ["Product", "Units Sold", "Revenue", "COGS", "Gross Margin"];

      const { data: orderIdRows, error: oidErr } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
        .eq("is_test", false)
        .gte("created_at", startTs)
        .lt("created_at", endTsExcl);

      if (oidErr) throw new Error(`Order ID query failed: ${oidErr.message}`);

      const idSet = (orderIdRows ?? []).map((o) => o.id);

      if (idSet.length) {
        const { data: allItems, error: itemErr } = await supabase
          .from("order_items")
          .select("product_id, quantity, unit_price_cents, order_id")
          .in("order_id", idSet.slice(0, 1000));

        if (itemErr) throw new Error(`Order items query failed: ${itemErr.message}`);

        const productIds = [...new Set((allItems ?? []).map((i) => i.product_id).filter(Boolean))];
        let productMap: Record<string, { name: string; cost_cents: number }> = {};
        if (productIds.length) {
          const { data: prods, error: prodErr } = await supabase
            .from("products")
            .select("id, name, cost_cents")
            .in("id", productIds);
          if (prodErr) throw new Error(`Products query failed: ${prodErr.message}`);
          productMap = Object.fromEntries((prods ?? []).map((p) => [p.id, { name: p.name ?? p.id, cost_cents: p.cost_cents ?? 0 }]));
        }

        const agg: Record<string, { name: string; units: number; revenue: number; cogs: number }> = {};
        let usedDefaultCogs = false;
        for (const item of allItems ?? []) {
          const pid = item.product_id ?? "unknown";
          const prod = productMap[pid];
          if (!agg[pid]) agg[pid] = { name: prod?.name ?? pid, units: 0, revenue: 0, cogs: 0 };
          const qty = item.quantity ?? 1;
          agg[pid].units   += qty;
          agg[pid].revenue += (item.unit_price_cents ?? 0) * qty;
          if (!prod?.cost_cents) usedDefaultCogs = true;
          agg[pid].cogs    += (prod?.cost_cents ?? 1200) * qty;
        }

        rows = Object.entries(agg)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .map(([, d]) => {
            const margin = d.revenue > 0
              ? `${Math.round(((d.revenue - d.cogs) / d.revenue) * 1000) / 10}%`
              : "0%";
            return [d.name, String(d.units), cents(d.revenue), cents(d.cogs), margin];
          });

        totals = {
          "Total Revenue": cents(sumColumn(rows, 2) * 100),
          "Total COGS": cents(sumColumn(rows, 3) * 100),
        };
        if (usedDefaultCogs) {
          notes = ["Some products are missing a cost_cents value; a default $12.00 COGS estimate was used for those line items."];
        }
      }
    }

    // ── Stripe Fee Summary ───────────────────────────────────────────────────
    else if (report_type === "stripe_fee_summary") {
      title = "Stripe Fee Summary";
      headers = ["Date", "Description", "Amount"];

      const { data: fees, error: feeErr } = await supabase
        .from("expenses")
        .select("date, stripe_charge_id, description, amount_cents")
        .eq("source", "stripe_auto")
        .gte("date", period_start)
        .lte("date", period_end)
        .order("date", { ascending: false });

      if (feeErr) throw new Error(`Stripe fees query failed: ${feeErr.message}`);

      rows = (fees ?? []).map((e) => [
        e.date ?? "",
        e.description ?? e.stripe_charge_id ?? "",
        cents(e.amount_cents ?? 0),
      ]);

      totals = { "Total Fees": cents(sumColumn(rows, 2) * 100) };
    }

    // ── Render ───────────────────────────────────────────────────────────────
    if (format === "json") {
      return new Response(
        JSON.stringify({ title, period: { start: period_start, end: period_end }, columns: headers, rows, totals, notes }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    } else if (format === "csv") {
      const csv = formatCSV(headers, rows);
      return new Response(csv, {
        headers: {
          ...corsHeaders(req),
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="report.csv"`,
        },
      });
    } else {
      // format === "html"
      const html = formatHTML(headers, rows, title, period_start, period_end);
      return new Response(html, {
        headers: {
          ...corsHeaders(req),
          "Content-Type": "text/html",
        },
      });
    }
  } catch (err) {
    console.error("[generate-report]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
