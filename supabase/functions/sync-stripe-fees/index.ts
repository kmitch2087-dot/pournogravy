// sync-stripe-fees edge function
// Fetches Stripe Balance Transactions for the past 48 hours and upserts
// processing fees into the expenses table for bookkeeping.
//
// SECRETS REQUIRED:
//   STRIPE_SECRET_KEY         (already set on project)
//   SUPABASE_URL              (standard — always available in edge functions)
//   SUPABASE_SERVICE_ROLE_KEY (standard — always available in edge functions)
//
// Called by pg_cron daily at 02:00 UTC via supabase/migrations/20260617000020_sync_stripe_fees_cron.sql
// The cron job passes the service role key as the Authorization header so this
// function can write to expenses (RLS only allows service_role on stripe_auto rows).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BalanceTransaction {
  id: string;
  created: number;
  fee: number;
  source: string; // charge ID (e.g. "ch_xxx")
  type: string;
}

interface StripeListResponse {
  data: BalanceTransaction[];
  has_more: boolean;
  url: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(
      JSON.stringify({ error: "STRIPE_SECRET_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Authorize: accept either anon key (pg_cron pattern used across this project)
  // or service role key. The function always uses service_role for DB writes regardless.
  const authHeader = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (authHeader !== serviceKey && authHeader !== anonKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // Always create client with service_role so we can bypass RLS on the expenses table
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all balance transactions of type=charge created in the last 48 hours.
    // 48-hour window overlaps the 24-hour cron cadence to handle edge cases around
    // Stripe's event timestamp vs. settlement delay. Upsert on stripe_charge_id dedupes.
    const since = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);

    const allTransactions: BalanceTransaction[] = [];
    let startingAfter: string | null = null;
    let page = 0;

    // Paginate through all results (Stripe caps per request at 100)
    while (true) {
      page++;
      const params = new URLSearchParams({
        type: "charge",
        limit: "100",
        "created[gte]": String(since),
      });
      if (startingAfter) params.set("starting_after", startingAfter);

      const res = await fetch(
        `https://api.stripe.com/v1/balance_transactions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Stripe API error ${res.status}: ${errText}`);
      }

      const body = (await res.json()) as StripeListResponse;

      if (body.data?.length) {
        allTransactions.push(...body.data);
      }

      if (!body.has_more) break;

      // Advance cursor to the last item's ID for next page
      startingAfter = body.data[body.data.length - 1].id;

      // Safety valve: never loop more than 20 pages (2000 charges in 48h would be unusual)
      if (page >= 20) {
        console.warn("[sync-stripe-fees] hit 20-page safety limit — some rows may be deferred to next run");
        break;
      }
    }

    console.log(`[sync-stripe-fees] fetched ${allTransactions.length} charge transactions across ${page} page(s)`);

    // Filter out zero-fee rows (e.g. refunds, disputes, free-tier charges)
    const rows = allTransactions
      .filter((t) => t.fee > 0)
      .map((t) => ({
        date: new Date(t.created * 1000).toISOString().slice(0, 10),
        amount_cents: t.fee,
        category: "Merchant Fees — Stripe",
        description: `Stripe processing fee — charge ${t.source}`,
        source: "stripe_auto",
        stripe_charge_id: t.id,
      }));

    const skipped = allTransactions.length - rows.length;

    if (!rows.length) {
      console.log(`[sync-stripe-fees] no fee rows to upsert (skipped ${skipped} zero-fee transactions)`);
      return new Response(
        JSON.stringify({ synced: 0, skipped }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error } = await supabase
      .from("expenses")
      .upsert(rows, { onConflict: "stripe_charge_id" });

    if (error) throw error;

    console.log(`[sync-stripe-fees] upserted ${rows.length} fee rows, skipped ${skipped} zero-fee`);

    return new Response(
      JSON.stringify({ synced: rows.length, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sync-stripe-fees] fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
