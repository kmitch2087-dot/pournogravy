// Stripe Checkout session creator.
// Public endpoint — accepts a cart payload, creates an `orders` row in
// `pending` state, then creates a Stripe Checkout Session and returns the
// hosted-checkout URL. The `stripe-webhook` function flips the order to
// `paid` and triggers fulfillment when the payment lands.
//
// SECRET REQUIRED: STRIPE_SECRET_KEY  (set via Lovable secrets)
//
// Request body shape:
// {
//   items: [{ slug: string, name: string, quantity: number, unit_price_cents: number,
//             size?: string, variant?: string, color?: string, image?: string }],
//   email: string,
//   successUrl?: string,
//   cancelUrl?: string,
// }

import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  slug: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  size?: string;
  variant?: string;
  color?: string;
  image?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { items, email, successUrl, cancelUrl } = body as {
      items: CartItem[];
      email: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    if (!email || !items?.length) {
      return new Response(JSON.stringify({ error: "Missing email or items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: never trust client-supplied prices. Look up authoritative
    // prices from the products table by slug, and reject any item whose
    // product is missing, unpublished, or inactive.
    const slugs = Array.from(new Set(items.map((i) => i.slug).filter(Boolean)));
    if (slugs.length === 0) {
      return new Response(JSON.stringify({ error: "Items missing slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dbProducts, error: prodError } = await supabase
      .from("products")
      .select("id, slug, price_cents, is_active, status, drop_date")
      .in("slug", slugs);
    if (prodError) throw prodError;

    const now = Date.now();
    const productMap = new Map<string, { id: string; price_cents: number }>();
    for (const p of dbProducts ?? []) {
      const isLive =
        p.is_active &&
        (p.status === "published" ||
          (p.status === "scheduled" && p.drop_date && new Date(p.drop_date).getTime() <= now));
      if (isLive) productMap.set(p.slug, { id: p.id, price_cents: p.price_cents });
    }

    // Validate every item resolves to a live product
    for (const i of items) {
      if (!productMap.has(i.slug)) {
        return new Response(
          JSON.stringify({ error: `Product not available: ${i.slug}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 100) {
        return new Response(
          JSON.stringify({ error: `Invalid quantity for ${i.slug}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Build trusted items using server-side prices
    const safeItems = items.map((i) => ({
      ...i,
      unit_price_cents: productMap.get(i.slug)!.price_cents,
      product_id: productMap.get(i.slug)!.id,
    }));

    const subtotal = safeItems.reduce(
      (s, i) => s + i.unit_price_cents * i.quantity,
      0,
    );

    // Create the pending order first so the webhook can find it
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([{
        email,
        status: "pending",
        subtotal_cents: subtotal,
        total_cents: subtotal,
        currency: "USD",
      }])
      .select("id")
      .single();
    if (orderError || !order) throw orderError ?? new Error("Order create failed");

    // Create order items with the real product_id and trusted price
    const itemRows = safeItems.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price_cents: i.unit_price_cents,
      product_snapshot: i,
    }));
    await supabase.from("order_items").insert(itemRows);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const origin = req.headers.get("origin") ?? "https://pournogravy.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: safeItems.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: "usd",
          unit_amount: i.unit_price_cents,
          product_data: {
            name: i.name,
            description: [i.variant, i.color, i.size].filter(Boolean).join(" / ") || undefined,
            images: i.image ? [i.image] : undefined,
          },
        },
      })),
      shipping_address_collection: { allowed_countries: ["US", "CA"] },
      success_url: `${successUrl ?? `${origin}/shop?success=1`}&order=${order.id}`,
      cancel_url: cancelUrl ?? `${origin}/shop?canceled=1`,
      metadata: { order_id: order.id },
    });

    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-checkout]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
