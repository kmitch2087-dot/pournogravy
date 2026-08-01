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

    // Issue refund via Stripe
    const stripeRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${stripeKey}`,
      },
      body: new URLSearchParams({ payment_intent: stripe_payment_intent_id }),
    });

    const stripeBody = await stripeRes.json().catch(() => ({}));

    const supabase = createClient(supabaseUrl, serviceKey);

    if (!stripeRes.ok) {
      const stripeError = (stripeBody as { error?: { code?: string; message?: string } })?.error;
      // "charge_already_refunded" means the money is already back — still update Supabase.
      if (stripeError?.code !== "charge_already_refunded") {
        const msg = stripeError?.message ?? `Stripe HTTP ${stripeRes.status}`;
        return new Response(JSON.stringify({ error: msg }), {
          status: 502,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      // Fall through: charge already refunded in Stripe — sync the DB status below.
    }

    // Mark order as refunded
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", order_id);

    if (updateError) throw updateError;

    // --- Printer cancellation email ---
    // Fetch order details + items + settings in parallel
    const [orderRes, itemsRes, settingsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, email, shipping_address, stripe_tax_transaction_id")
        .eq("id", order_id)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("product_snapshot, quantity")
        .eq("order_id", order_id),
      supabase
        .from("settings")
        .select("printer_email, printer_name")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const order = orderRes.data;
    const items = itemsRes.data ?? [];
    const printerEmail = settingsRes.data?.printer_email;

    // Reverse the tax transaction, if this order had one (Task 16). No-op
    // when tax was off for this order (stripe_tax_transaction_id is null).
    // Isolated try-catch: a reversal failure must never fail the refund
    // itself — the money has already been returned to the customer.
    if (order?.stripe_tax_transaction_id) {
      try {
        const reversalRes = await fetch("https://api.stripe.com/v1/tax/transactions/create_reversal", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${stripeKey}`,
          },
          body: new URLSearchParams({
            mode: "full",
            original_transaction: order.stripe_tax_transaction_id,
            reference: `refund_${order_id}`,
          }),
        });
        if (!reversalRes.ok) {
          const reversalBody = await reversalRes.json().catch(() => ({}));
          console.error("[refund-order] tax reversal failed", reversalBody);
        }
      } catch (taxErr) {
        console.error("[refund-order] tax reversal error", taxErr);
      }
    }

    if (printerEmail && order) {
      const orderIdShort = order_id.slice(0, 8).toUpperCase();
      const itemLines = items.length
        ? items
            .map((it) => {
              const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
              const parts = [String(s.name ?? "Item"), `×${it.quantity}`];
              if (s.size) parts.push(String(s.size));
              if (s.color) parts.push(String(s.color));
              return parts.join(" — ");
            })
            .join("\n")
        : "(item details unavailable)";

      // Fire-and-forget — don't block the refund response on email success
      supabase.functions
        .invoke("send-notification", {
          body: {
            templateKey: "printer_cancellation",
            recipient: printerEmail,
            variables: {
              order_id_short: orderIdShort,
              customer_email: order.email ?? "unknown",
              order_items: itemLines,
            },
          },
        })
        .catch((e) => console.error("[refund-order] printer cancel email failed:", e));
    }

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
