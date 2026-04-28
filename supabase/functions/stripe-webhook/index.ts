// Stripe webhook handler.
// Processes `checkout.session.completed` to mark the corresponding order
// as paid, save the shipping address + payment intent, then queues a
// confirmation email and routes the order to fulfillment (printer email or POD).
//
// SECRETS REQUIRED:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SIGNING_SECRET
//
// In Stripe dashboard: add webhook endpoint pointing to this function URL
// and select the `checkout.session.completed` event.

import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const signingSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");
  if (!stripeKey || !signingSecret) {
    return new Response("Stripe secrets not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, signingSecret);
  } catch (err) {
    console.error("[webhook] signature verify failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (!orderId) {
      console.warn("[webhook] checkout.session.completed without order_id");
      return new Response("ok", { status: 200 });
    }

    // Mark order paid
    await supabase
      .from("orders")
      .update({
        status: "paid",
        stripe_payment_intent_id: typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
        shipping_address: session.shipping_details
          ? JSON.parse(JSON.stringify(session.shipping_details))
          : null,
        total_cents: session.amount_total ?? undefined,
      })
      .eq("id", orderId);

    // Fetch order + items + settings to build the notifications/printer payload
    const [{ data: order }, { data: items }, { data: settings }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (!order) return new Response("ok", { status: 200 });

    const itemsList = (items ?? [])
      .map((it) => {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        return `• ${it.quantity}x ${(s.name as string) ?? "Item"}${s.size ? ` [${s.size}]` : ""}${s.variant ? ` ${s.variant}` : ""}${s.color ? ` ${s.color}` : ""}`;
      })
      .join("\n");

    const orderTotal = `$${((order.total_cents ?? 0) / 100).toFixed(2)}`;

    // 1) Customer confirmation
    await supabase.from("notifications").insert([{
      type: "email",
      template_key: "order_confirmation",
      recipient: order.email,
      subject: "",
      body_html: "",
      body_text: "",
      related_kind: "order",
      related_id: order.id,
      status: "pending",
    }]);

    // We render template at queue time inside send-notification, so kick it off:
    await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "order_confirmation",
        recipient: order.email,
        relatedKind: "order",
        relatedId: order.id,
        variables: {
          customer_name: order.email.split("@")[0],
          order_number: order.id.slice(0, 8),
          order_items: itemsList,
          order_total: orderTotal,
        },
      },
    });

    // 2) Printer notification (fulfillment)
    if (settings?.fulfillment_provider === "local_printer" && settings.printer_email) {
      const addr = order.shipping_address
        ? JSON.stringify(order.shipping_address, null, 2)
        : "(no address)";

      await supabase.from("printer_queue").insert([{
        order_id: order.id,
        payload: { items, shipping: order.shipping_address, total: order.total_cents },
        status: "queued",
      }]);

      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "printer_notification",
          recipient: settings.printer_email,
          relatedKind: "order",
          relatedId: order.id,
          variables: {
            order_number: order.id.slice(0, 8),
            customer_name: order.email.split("@")[0],
            customer_email: order.email,
            order_items: itemsList,
            shipping_address: addr,
          },
        },
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
