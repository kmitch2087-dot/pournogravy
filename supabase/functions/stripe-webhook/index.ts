// Stripe webhook handler.
// Processes `checkout.session.completed` to mark the corresponding order
// as paid, save the shipping address + payment intent, then queues a
// confirmation email and routes the order to fulfillment (printer email or POD).
//
// SECRETS REQUIRED:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SIGNING_SECRET
//   FULFILLMENT_SECRET  (signs the printer tracking link)
//
// In Stripe dashboard: add webhook endpoint pointing to this function URL
// and select the `checkout.session.completed` event.

import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Generate HMAC-SHA256 token for printer tracking link
async function generateFulfillmentToken(orderId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(orderId));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

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

  // Support both payment_intent.succeeded (custom checkout) and
  // checkout.session.completed (legacy hosted checkout)
  let orderId: string | undefined;
  let shippingAddress: unknown = null;
  let amountTotal: number | undefined;
  let paymentIntentId: string | undefined;

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    orderId = pi.metadata?.order_id;
    shippingAddress = pi.shipping ?? null;
    amountTotal = pi.amount_received;
    paymentIntentId = pi.id;
  } else if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    orderId = session.metadata?.order_id;
    shippingAddress = session.shipping_details ?? null;
    amountTotal = session.amount_total ?? undefined;
    paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  }

  if (orderId) {
    // Mark order paid
    await supabase
      .from("orders")
      .update({
        status: "paid",
        ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
        shipping_address: shippingAddress ? JSON.parse(JSON.stringify(shippingAddress)) : null,
        ...(amountTotal != null ? { total_cents: amountTotal } : {}),
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

    // 2) Pour Points — 1 point per $1 spent (auth users only)
    if (order.user_id && (order.total_cents ?? 0) > 0) {
      const pointsEarned = Math.floor((order.total_cents ?? 0) / 100);
      if (pointsEarned > 0) {
        await supabase.rpc("increment_loyalty_points", {
          p_user_id: order.user_id,
          p_points: pointsEarned,
          p_order_id: order.id,
        });
      }
    }

    // 3) Printer notification (fulfillment)
    if (settings?.fulfillment_provider === "local_printer" && settings.printer_email) {
      await supabase.from("printer_queue").insert([{
        order_id: order.id,
        payload: { items, shipping: order.shipping_address, total: order.total_cents },
        status: "queued",
      }]);

      // Design file URLs are stored in Supabase Storage keyed by product slug
      const STORAGE_BASE = "https://emtjkawcmsfgjyimnncf.supabase.co/storage/v1/object/public/print-files";

      // Build design links list (one per unique slug) for printer email
      const seenSlugs = new Set<string>();
      const designLinkLines: string[] = [];
      for (const it of (items ?? [])) {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        const slug = String(s.slug ?? "");
        if (slug && !seenSlugs.has(slug)) {
          seenSlugs.add(slug);
          designLinkLines.push(
            `${slug}:\n  Black: ${STORAGE_BASE}/black/${slug}_black.png\n  White: ${STORAGE_BASE}/white/${slug}_white.png`
          );
        }
      }
      const designLinks = designLinkLines.join("\n\n");

      // Build fulfillment CSV
      const ship = order.shipping_address as Record<string, unknown> | null;
      const shipName = (ship?.name as string) ?? "";
      const shipAddr = ship?.address as Record<string, unknown> | null;
      const csvHeader = "Order ID,Date,Product Name,Slug,Size,Color,Qty,Ship Name,Address 1,City,State,Zip,Country,Print File URL";
      const csvRows = (items ?? []).map((it: { product_id?: string; quantity: number; product_snapshot?: Record<string, unknown> }) => {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        const slug = String(s.slug ?? "");
        const printUrl = slug ? `${STORAGE_BASE}/black/${slug}_black.png` : "";
        const col = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        return [
          col(order.id.slice(0, 8).toUpperCase()),
          col(new Date().toISOString().slice(0, 10)),
          col(s.name ?? ""),
          col(s.slug ?? ""),
          col(s.size ?? ""),
          col(s.color ?? ""),
          col(it.quantity),
          col(shipName),
          col(shipAddr?.line1 ?? ""),
          col(shipAddr?.city ?? ""),
          col(shipAddr?.state ?? ""),
          col(shipAddr?.postal_code ?? ""),
          col(shipAddr?.country ?? "US"),
          col(printUrl),
        ].join(",");
      });

      const csvContent = [csvHeader, ...csvRows].join("\n");
      const csvBase64 = btoa(csvContent);
      const shortId = order.id.slice(0, 8).toUpperCase();

            const addr = ship ? `${shipAddr?.line1 ?? ""}, ${shipAddr?.city ?? ""}, ${shipAddr?.state ?? ""} ${shipAddr?.postal_code ?? ""}` : "(no address)";

      // Generate fulfillment token for printer tracking link
      const fulfillmentSecret = Deno.env.get("FULFILLMENT_SECRET");
      const siteUrl = Deno.env.get("SITE_URL") ?? "https://pournogravy.com";
      let trackingSubmitUrl = "";
      if (fulfillmentSecret) {
        const tok = await generateFulfillmentToken(order.id, fulfillmentSecret);
        trackingSubmitUrl = `${siteUrl}/ship/${order.id}?token=${tok}`;
      }

      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "printer_notification",
          recipient: settings.printer_email,
          relatedKind: "order",
          relatedId: order.id,
          variables: {
            order_number: shortId,
            customer_name: order.email.split("@")[0],
            customer_email: order.email,
            order_items: itemsList,
            shipping_address: addr,
            tracking_submit_url: trackingSubmitUrl,
            design_links: designLinks,
          },
          attachments: [{ filename: `order-${shortId}.csv`, content: csvBase64 }],
        },
      });

      // CC: send same printer notification to Kristin for test review
      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "printer_notification",
          recipient: "kmitch2087@gmail.com",
          relatedKind: "order",
          relatedId: order.id,
          variables: {
            order_number: shortId,
            customer_name: order.email.split("@")[0],
            customer_email: order.email,
            order_items: itemsList,
            shipping_address: addr,
            tracking_submit_url: trackingSubmitUrl,
            design_links: designLinks,
          },
          attachments: [{ filename: `order-${shortId}.csv`, content: csvBase64 }],
        },
      });
    }
  } // end if (orderId)

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
