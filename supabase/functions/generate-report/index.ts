// generate-report edge function
// Returns structured JSON report data for one of five report types:
//   pl | orders | expenses | products | stripe_fees
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

type ReportType = "pl" | "orders" | "expenses" | "products" | "stripe_fees";

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
      period_start: string;
      period_end: string;
    };

    const { report_type, period_start, period_end } = body;

    if (!report_type || !period_start || !period_end) {
      return new Response(
        JSON.stringify({ error: "report_type, period_start, period_end are required" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const validTypes: ReportType[] = ["pl", "orders", "expenses", "products", "stripe_fees"];
    if (!validTypes.includes(report_type)) {
      return new Response(
        JSON.stringify({ error: `Unknown report_type: ${report_type}. Must be one of: ${validTypes.join(", ")}` }),
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

    let result: unknown;

    // ── P&L Statement ────────────────────────────────────────────────────────
    if (report_type === "pl") {
      // Use monthly_snapshots for closed months within the range.
      // We find snapshots where the month falls within our date range.
      const startYear  = new Date(period_start).getUTCFullYear();
      const startMonth = new Date(period_start).getUTCMonth() + 1; // 1-12
      const endYear    = new Date(period_end).getUTCFullYear();
      const endMonth   = new Date(period_end).getUTCMonth() + 1;

      const { data: snaps, error: snapErr } = await supabase
        .from("monthly_snapshots")
        .select("year, month, revenue_cents, refunds_cents, cogs_cents, expenses_cents, stripe_fees_cents, net_profit_cents, amendment_note, amended_at")
        .or(
          // Rows where (year, month) falls in range
          // Simplest: pull all in year range and filter in JS
          `year.gte.${startYear},year.lte.${endYear}`
        )
        .order("year")
        .order("month");

      if (snapErr) throw new Error(`Snapshot query failed: ${snapErr.message}`);

      const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      // Filter to only snapshots within the period
      const filtered = (snaps ?? []).filter((s) => {
        if (s.year < startYear || s.year > endYear) return false;
        if (s.year === startYear && s.month < startMonth) return false;
        if (s.year === endYear   && s.month > endMonth)   return false;
        return true;
      });

      const months = filtered.map((s) => ({
        label:       `${MONTH_NAMES[s.month - 1]} ${s.year}`,
        revenue:     s.revenue_cents,
        refunds:     s.refunds_cents,
        cogs:        s.cogs_cents,
        expenses:    s.expenses_cents,
        stripe_fees: s.stripe_fees_cents,
        net:         s.net_profit_cents,
        amended:     !!s.amended_at,
        note:        s.amendment_note ?? null,
      }));

      const totals = months.reduce(
        (acc, m) => ({
          revenue:     acc.revenue     + m.revenue,
          refunds:     acc.refunds     + m.refunds,
          cogs:        acc.cogs        + m.cogs,
          expenses:    acc.expenses    + m.expenses,
          stripe_fees: acc.stripe_fees + m.stripe_fees,
          net:         acc.net         + m.net,
        }),
        { revenue: 0, refunds: 0, cogs: 0, expenses: 0, stripe_fees: 0, net: 0 },
      );

      result = { months, totals };
    }

    // ── Order Summary ────────────────────────────────────────────────────────
    else if (report_type === "orders") {
      const { data: orders, error: ordErr } = await supabase
        .from("orders")
        .select("id, created_at, customer_email, status, subtotal_cents, shipping_cents, tax_cents, total_cents")
        .gte("created_at", startTs)
        .lt("created_at", endTsExcl)
        .order("created_at", { ascending: false });

      if (ordErr) throw new Error(`Orders query failed: ${ordErr.message}`);

      result = {
        rows: (orders ?? []).map((o) => ({
          date:           o.created_at.slice(0, 10),
          order_id:       o.id,
          customer_email: o.customer_email,
          status:         o.status,
          subtotal:       o.subtotal_cents ?? 0,
          shipping:       o.shipping_cents ?? 0,
          tax:            o.tax_cents ?? 0,
          total:          o.total_cents ?? 0,
          refunded:       o.status === "refunded",
        })),
      };
    }

    // ── Expense Detail ───────────────────────────────────────────────────────
    else if (report_type === "expenses") {
      const { data: exps, error: expErr } = await supabase
        .from("expenses")
        .select("date, category, description, amount_cents, source")
        .gte("date", period_start)
        .lte("date", period_end)
        .order("date", { ascending: false });

      if (expErr) throw new Error(`Expenses query failed: ${expErr.message}`);

      const byCategory: Record<string, number> = {};
      for (const e of exps ?? []) {
        byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount_cents;
      }

      result = {
        rows: (exps ?? []).map((e) => ({
          date:        e.date,
          category:    e.category,
          description: e.description,
          amount:      e.amount_cents,
          source:      e.source,
        })),
        by_category: Object.entries(byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([category, total]) => ({ category, total })),
      };
    }

    // ── Sales by Product ─────────────────────────────────────────────────────
    else if (report_type === "products") {
      // Step 1: get paid order IDs in range
      const { data: orderIdRows, error: oidErr } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
        .gte("created_at", startTs)
        .lt("created_at", endTsExcl);

      if (oidErr) throw new Error(`Order ID query failed: ${oidErr.message}`);

      const idSet = (orderIdRows ?? []).map((o) => o.id);

      if (!idSet.length) {
        result = { rows: [] };
      } else {
        // Step 2: get order items for those orders
        const { data: allItems, error: itemErr } = await supabase
          .from("order_items")
          .select("product_name, product_slug, quantity, price_cents, order_id")
          .in("order_id", idSet.slice(0, 1000));

        if (itemErr) throw new Error(`Order items query failed: ${itemErr.message}`);

        // Step 3: fetch cost_cents for each unique product slug
        const slugs = [...new Set((allItems ?? []).map((i) => i.product_slug).filter(Boolean))];
        let costMap: Record<string, number> = {};
        if (slugs.length) {
          const { data: costs, error: costErr } = await supabase
            .from("products")
            .select("slug, cost_cents")
            .in("slug", slugs);
          if (costErr) throw new Error(`Products cost query failed: ${costErr.message}`);
          costMap = Object.fromEntries((costs ?? []).map((p) => [p.slug, p.cost_cents ?? 0]));
        }

        const agg: Record<string, { name: string; units: number; revenue: number; cogs: number }> = {};
        for (const item of allItems ?? []) {
          const slug = item.product_slug ?? item.product_name ?? "unknown";
          if (!agg[slug]) agg[slug] = { name: item.product_name ?? slug, units: 0, revenue: 0, cogs: 0 };
          const qty = item.quantity ?? 1;
          agg[slug].units   += qty;
          agg[slug].revenue += (item.price_cents ?? 0) * qty;
          agg[slug].cogs    += (costMap[item.product_slug] ?? 1200) * qty;
        }

        result = {
          rows: Object.entries(agg)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([slug, d]) => ({
              name:       d.name,
              slug,
              units_sold: d.units,
              revenue:    d.revenue,
              cogs:       d.cogs,
              margin_pct: d.revenue > 0
                ? Math.round(((d.revenue - d.cogs) / d.revenue) * 1000) / 10
                : 0,
            })),
        };
      }
    }

    // ── Stripe Fee Summary ───────────────────────────────────────────────────
    else if (report_type === "stripe_fees") {
      const { data: fees, error: feeErr } = await supabase
        .from("expenses")
        .select("date, stripe_charge_id, description, amount_cents")
        .eq("source", "stripe_auto")
        .gte("date", period_start)
        .lte("date", period_end)
        .order("date", { ascending: false });

      if (feeErr) throw new Error(`Stripe fees query failed: ${feeErr.message}`);

      const total_fees = (fees ?? []).reduce((s, e) => s + (e.amount_cents ?? 0), 0);

      result = {
        rows: (fees ?? []).map((e) => ({
          date:        e.date,
          charge_id:   e.stripe_charge_id,
          description: e.description,
          fee:         e.amount_cents,
        })),
        total_fees,
      };
    }

    return new Response(JSON.stringify({ ok: true, data: result }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-report]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
