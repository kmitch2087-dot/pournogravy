// Recomputes an order's total with sales tax once the customer's shipping
// address is known (create-checkout creates the PaymentIntent BEFORE the
// address exists, so this runs as a follow-up step from the checkout form).
//
// Gated by settings.tax_enabled (Task 14, default false). When off, this is
// a no-op that returns the pre-tax total unchanged — live checkout behavior
// does not change until the owner flips the flag.
//
// SECRETS REQUIRED: STRIPE_SECRET_KEY

import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
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

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { orderId, address } = body as { orderId?: string; address?: Address };

    if (!orderId || typeof orderId !== "string") {
      return json(req, { error: "Missing orderId" }, 400);
    }

    const hasUsableAddress =
      address &&
      typeof address === "object" &&
      !!address.country &&
      (!!address.postal_code || !!address.state);

    if (!hasUsableAddress) {
      return json(req, { error: "Missing or incomplete address" }, 400);
    }

    // Load the order (service role) — only the fields we need
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("subtotal_cents, discount_cents, shipping_cents, stripe_payment_intent_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return json(req, { error: "Order not found" }, 404);

    // SECURITY: never let a caller mutate an already-paid (or otherwise
    // finalized) order's PaymentIntent via this endpoint.
    if (order.status !== "pending") {
      return json(req, { error: `Order is not pending (status: ${order.status})` }, 409);
    }

    const subtotalAfterDiscount = Math.max(
      0,
      (order.subtotal_cents ?? 0) - (order.discount_cents ?? 0),
    );
    const shippingCents = order.shipping_cents ?? 0;

    const { data: settingsRow } = await supabase
      .from("settings")
      .select("tax_enabled")
      .eq("id", 1)
      .maybeSingle();

    const taxEnabled = settingsRow?.tax_enabled === true;

    if (!taxEnabled) {
      // No-op path — this is what runs in production today.
      return json(req, {
        taxCents: 0,
        totalCents: subtotalAfterDiscount + shippingCents,
      });
    }

    if (!order.stripe_payment_intent_id) {
      throw new Error("Order has no stripe_payment_intent_id to update");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const calc = await stripe.tax.calculations.create({
      currency: "usd",
      line_items: [
        { amount: subtotalAfterDiscount, reference: orderId, tax_behavior: "exclusive" },
      ],
      shipping_cost: { amount: shippingCents },
      customer_details: {
        address: {
          line1: address!.line1,
          line2: address!.line2,
          city: address!.city,
          state: address!.state,
          postal_code: address!.postal_code,
          country: address!.country,
        },
        address_source: "shipping",
      },
    });

    const taxCents = calc.tax_amount_exclusive;
    const totalCents = subtotalAfterDiscount + shippingCents + taxCents;

    await stripe.paymentIntents.update(order.stripe_payment_intent_id, {
      amount: totalCents,
    });

    await supabase
      .from("orders")
      .update({
        tax_cents: taxCents,
        stripe_tax_calculation_id: calc.id,
        total_cents: totalCents,
      })
      .eq("id", orderId);

    return json(req, { taxCents, totalCents });
  } catch (err) {
    console.error("[calculate-tax]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json(req, { error: msg }, 500);
  }
});
