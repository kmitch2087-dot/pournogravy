// Creates a Stripe PaymentIntent for the embedded custom checkout flow.
// Returns clientSecret so the frontend can render its own branded payment form.
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

function buildLineItemName(item: {
  name: string;
  color?: string;
  variant?: string;
  size?: string;
}): string {
  const details: string[] = [];
  if (item.color) details.push(item.color);
  if (item.size)  details.push(item.size);
  return details.length > 0 ? `${item.name} — ${details.join(" / ")}` : item.name;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { items, email, discount_code } = body as {
      items: CartItem[];
      email: string;
      discount_code?: string;
    };

    if (!email || !items?.length) {
      return new Response(JSON.stringify({ error: "Missing email or items" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Server-side price validation — never trust client prices
    const slugs = Array.from(new Set(items.map((i) => i.slug).filter(Boolean)));
    if (slugs.length === 0) {
      return new Response(JSON.stringify({ error: "Items missing slug" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: dbProducts, error: prodError } = await supabase
      .from("products")
      .select("id, slug, price_cents, is_active, status, drop_date, shipping_override_cents")
      .in("slug", slugs);
    if (prodError) throw prodError;

    const now = Date.now();
    const productMap = new Map<string, { id: string; price_cents: number; shipping_override_cents: number | null }>();
    for (const p of dbProducts ?? []) {
      const isLive =
        p.is_active &&
        (p.status === "published" ||
          (p.status === "scheduled" && p.drop_date && new Date(p.drop_date).getTime() <= now));
      if (isLive) productMap.set(p.slug, {
        id: p.id,
        price_cents: p.price_cents,
        shipping_override_cents: p.shipping_override_cents ?? null,
      });
    }

    for (const i of items) {
      if (!productMap.has(i.slug)) {
        return new Response(
          JSON.stringify({ error: `Product not available: ${i.slug}` }),
          { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
        );
      }
      if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 100) {
        return new Response(
          JSON.stringify({ error: `Invalid quantity for ${i.slug}` }),
          { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
        );
      }
    }

    const safeItems = items.map((i) => ({
      ...i,
      unit_price_cents: productMap.get(i.slug)!.price_cents,
      product_id: productMap.get(i.slug)!.id,
      shipping_override_cents: productMap.get(i.slug)!.shipping_override_cents,
    }));

    const subtotal = safeItems.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);

    // Server-side discount validation
    let discountCents = 0;
    let discountCodeId: string | null = null;

    if (discount_code?.trim()) {
      const { data: dc } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("is_active", true)
        .ilike("code", discount_code.trim())
        .maybeSingle();

      if (dc) {
        const notExpired = !dc.expires_at || new Date(dc.expires_at) > new Date();
        const hasUses = dc.max_uses === null || dc.use_count < dc.max_uses;
        const meetsMin = subtotal >= dc.min_order_cents;
        if (notExpired && hasUses && meetsMin) {
          discountCents = dc.discount_type === "percent"
            ? Math.round(subtotal * dc.discount_value / 100)
            : Math.min(dc.discount_value, subtotal);
          discountCodeId = dc.id;
        }
      }
    }

    const subtotalAfterDiscount = Math.max(0, subtotal - discountCents);

    // Shipping override: if ALL line items have a shipping_override_cents value set,
    // use the maximum override value instead of the standard shipping rate.
    const overrideValues = safeItems.map((i) => i.shipping_override_cents);
    const allHaveOverride = overrideValues.every((v) => v !== null && v !== undefined);
    const shippingOverrideCents = allHaveOverride
      ? Math.max(...(overrideValues as number[]))
      : null;

    // Fetch shipping config from settings (row id=1)
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("shipping_fee_cents, free_shipping_threshold_cents")
      .eq("id", 1)
      .maybeSingle();

    const shippingFeeCents = settingsRow?.shipping_fee_cents ?? 599;
    const freeThreshold = settingsRow?.free_shipping_threshold_cents ?? null;
    const shippingCents = shippingOverrideCents !== null
      ? shippingOverrideCents
      : (freeThreshold !== null && subtotalAfterDiscount >= freeThreshold) ? 0 : shippingFeeCents;
    const total = subtotalAfterDiscount + shippingCents;

    // Create the pending order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([{
        email,
        status: "pending",
        subtotal_cents: subtotal,
        discount_cents: discountCents,
        shipping_cents: shippingCents,
        total_cents: total,
        currency: "USD",
        ...(discountCodeId ? { discount_code_id: discountCodeId } : {}),
      }])
      .select("id")
      .single();
    if (orderError || !order) throw orderError ?? new Error("Order create failed");

    // Save order items
    const itemRows = safeItems.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price_cents: i.unit_price_cents,
      product_snapshot: i,
    }));
    await supabase.from("order_items").insert(itemRows);

    if (discountCodeId) {
      await supabase.rpc("increment_discount_use", { code_id: discountCodeId });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Create a PaymentIntent — the frontend renders its own branded form using this secret
    const description = safeItems
      .map((i) => `${buildLineItemName(i)} × ${i.quantity}`)
      .join(", ");

    const itemsMeta = JSON.stringify(
      safeItems.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        color: i.color ?? "",
        size: i.size ?? "",
        qty: i.quantity,
      }))
    ).slice(0, 500);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      description,
      metadata: {
        order_id: order.id,
        item_count: String(safeItems.length),
        items: itemsMeta,
      },
    });

    await supabase
      .from("orders")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, orderId: order.id, shippingCents, totalCents: total }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-checkout]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
