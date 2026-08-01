// stripe-balance edge function
// Returns the current Stripe balance (available + pending) and the next payout.
// Consumed by Task 13 (Financials Overview dashboard — Stripe balance tile).
//
// SECRETS REQUIRED:
//   SUPABASE_URL              (standard — always available in edge functions)
//   SUPABASE_SERVICE_ROLE_KEY (standard — always available in edge functions)
//   SUPABASE_ANON_KEY         (standard — always available in edge functions)
//   STRIPE_SECRET_KEY         (optional — if unset, returns zeros gracefully)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

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

    // ── Stripe key missing: return zeros gracefully ──────────────────────────
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ available_cents: 0, pending_cents: 0, next_payout: null }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // ── Balance ───────────────────────────────────────────────────────────────
    const balance = await stripe.balance.retrieve();
    const usdAvailable = balance.available.filter((b) => b.currency === "usd");
    const usdPending    = balance.pending.filter((b) => b.currency === "usd");
    const available_cents = usdAvailable.reduce((s, b) => s + b.amount, 0);
    const pending_cents   = usdPending.reduce((s, b) => s + b.amount, 0);

    // ── Next payout: prefer pending, fall back to most recent ────────────────
    let next_payout: { amount_cents: number; arrival_date: number } | null = null;
    const pendingPayouts = await stripe.payouts.list({ status: "pending", limit: 1 });
    if (pendingPayouts.data.length > 0) {
      const p = pendingPayouts.data[0];
      next_payout = { amount_cents: p.amount, arrival_date: p.arrival_date };
    } else {
      const recentPayouts = await stripe.payouts.list({ limit: 1 });
      if (recentPayouts.data.length > 0) {
        const p = recentPayouts.data[0];
        next_payout = { amount_cents: p.amount, arrival_date: p.arrival_date };
      }
    }

    return new Response(
      JSON.stringify({ available_cents, pending_cents, next_payout }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[stripe-balance]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
