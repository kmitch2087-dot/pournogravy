// close-month edge function
// Closes the previous calendar month: queries orders, COGS, and expenses,
// writes one row to monthly_snapshots, and stamps expense rows with the snapshot id.
//
// IDEMPOTENT — safe to re-run. If the month is already closed it returns { alreadyClosed: true }.
//
// SECRETS REQUIRED:
//   SUPABASE_URL              (standard — always available in edge functions)
//   SUPABASE_SERVICE_ROLE_KEY (standard — always available in edge functions)
//
// Called by pg_cron at 00:05 on the 1st of each month via
// supabase/migrations/20260617000021_close_month_cron.sql

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Accept either service role key or anon key (pg_cron pattern used across this project)
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token !== serviceKey && token !== anonKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Always use service_role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine the month to close: previous calendar month
    const now       = new Date();
    const year      = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month     = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-12
    // monthStart: first day of previous month at 00:00:00 UTC
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
    // monthEnd: first day of current month at 00:00:00 UTC
    const monthEnd   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    console.log(`[close-month] closing ${year}-${month} | range: ${monthStart} → ${monthEnd}`);

    // ── Idempotency check ──────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("monthly_snapshots")
      .select("id")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (existing) {
      console.log(`[close-month] ${year}-${month} already closed (snapshot id=${existing.id}) — skipping`);
      return new Response(
        JSON.stringify({ alreadyClosed: true, year, month, snapshot_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Revenue: paid/fulfilled orders ────────────────────────────────────────
    const { data: revenueRows, error: revErr } = await supabase
      .from("orders")
      .select("total_cents")
      .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
      .eq("is_test", false)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    if (revErr) throw new Error(`Revenue query failed: ${revErr.message}`);
    const revenue_cents = (revenueRows ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0);

    // ── Refunds ────────────────────────────────────────────────────────────────
    const { data: refundRows, error: refErr } = await supabase
      .from("orders")
      .select("total_cents")
      .eq("status", "refunded")
      .eq("is_test", false)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    if (refErr) throw new Error(`Refund query failed: ${refErr.message}`);
    const refunds_cents = (refundRows ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0);

    // ── COGS: order items × product cost ──────────────────────────────────────
    // Step 1: get order IDs for the month (non-refunded, non-test)
    const { data: orderIdRows, error: oidErr } = await supabase
      .from("orders")
      .select("id")
      .in("status", ["paid", "in_production", "fulfilled", "shipped", "delivered"])
      .eq("is_test", false)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    if (oidErr) throw new Error(`Order ID query failed: ${oidErr.message}`);

    let cogs_cents = 0;
    if (orderIdRows?.length) {
      const ids = orderIdRows.map((o) => o.id);

      // Step 2: get order items for those orders
      const { data: items, error: itemErr } = await supabase
        .from("order_items")
        .select("quantity, product_id")
        .in("order_id", ids);

      if (itemErr) throw new Error(`Order items query failed: ${itemErr.message}`);

      if (items?.length) {
        // Step 3: fetch cost_cents for each unique product_id
        const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
        const { data: costs, error: costErr } = await supabase
          .from("products")
          .select("id, cost_cents")
          .in("id", productIds);

        if (costErr) throw new Error(`Products cost query failed: ${costErr.message}`);

        const costMap: Record<string, number> = Object.fromEntries(
          (costs ?? []).map((p) => [p.id, p.cost_cents ?? 0]),
        );

        cogs_cents = items.reduce((s, item) => {
          // Fall back to $12.00 (1200 cents) if product cost is missing
          const cost = costMap[item.product_id] ?? 1200;
          return s + (item.quantity ?? 1) * cost;
        }, 0);
      }
    }

    // ── Expenses ────────────────────────────────────────────────────────────────
    // Use YYYY-MM-DD date strings for the expenses.date column
    const monthStartDate = monthStart.slice(0, 10); // e.g. "2026-05-01"
    const monthEndDate   = monthEnd.slice(0, 10);   // e.g. "2026-06-01"

    const { data: expRows, error: expErr } = await supabase
      .from("expenses")
      .select("id, amount_cents, source")
      .gte("date", monthStartDate)
      .lt("date", monthEndDate);

    if (expErr) throw new Error(`Expenses query failed: ${expErr.message}`);

    const expenses_cents    = (expRows ?? []).reduce((s, e) => s + (e.amount_cents ?? 0), 0);
    const stripe_fees_cents = (expRows ?? [])
      .filter((e) => e.source === "stripe_auto")
      .reduce((s, e) => s + (e.amount_cents ?? 0), 0);

    // ── Write snapshot ──────────────────────────────────────────────────────────
    const { data: snapshot, error: snapErr } = await supabase
      .from("monthly_snapshots")
      .insert({
        year,
        month,
        revenue_cents,
        refunds_cents,
        cogs_cents,
        expenses_cents,
        stripe_fees_cents,
        closed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (snapErr) throw new Error(`Snapshot insert failed: ${snapErr.message}`);

    // ── Stamp expense rows with snapshot id ─────────────────────────────────────
    const expenseIds = (expRows ?? []).map((e) => e.id);
    if (expenseIds.length) {
      const { error: stampErr } = await supabase
        .from("expenses")
        .update({ month_snapshot_id: snapshot.id })
        .in("id", expenseIds);

      if (stampErr) {
        // Non-fatal — log but don't fail the whole close
        console.warn(`[close-month] failed to stamp expenses: ${stampErr.message}`);
      }
    }

    console.log(
      `[close-month] closed ${year}-${month}: ` +
      `revenue=${revenue_cents} refunds=${refunds_cents} cogs=${cogs_cents} ` +
      `expenses=${expenses_cents} stripe_fees=${stripe_fees_cents} ` +
      `snapshot_id=${snapshot.id}`,
    );

    return new Response(
      JSON.stringify({
        closed: true,
        year,
        month,
        snapshot_id: snapshot.id,
        revenue_cents,
        refunds_cents,
        cogs_cents,
        expenses_cents,
        stripe_fees_cents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[close-month] fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
