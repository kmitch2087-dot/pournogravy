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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    let authorized = false;

    if (token && token === serviceKey) {
      authorized = true;
    } else if (token) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (!userErr && userData?.user) {
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

    const { order_id, stripe_payment_intent_id } = (await req.json()) as {
      order_id: string;
      stripe_payment_intent_id: string;
    };

    if (!order_id || !stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "order_id and stripe_payment_intent_id required" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Issue refund via Stripe Refunds API
    const stripeRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${stripeKey}`,
      },
      body: new URLSearchParams({ payment_intent: stripe_payment_intent_id }),
    });

    const stripeBody = await stripeRes.json().catch(() => ({}));

    if (!stripeRes.ok) {
      const msg =
        (stripeBody as { error?: { message?: string } })?.error?.message ??
        `Stripe HTTP ${stripeRes.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Mark order as refunded
    const supabase = createClient(supabaseUrl, serviceKey);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", order_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[refund-order]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
