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

  // Handle charge.refunded: look up order by payment_intent and mark refunded.
  // This fires when a refund is processed in Stripe (dashboard or API) and keeps
  // Supabase in sync even if the refund-order edge function errored mid-flight.
  if (event.type === "charge.refunded") {
    const charge = event.data.object as { payment_intent?: string | { id: string } };
    const piId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
    if (piId) {
      await supabase
        .from("orders")
        .update({ status: "refunded" })
        .eq("stripe_payment_intent_id", piId)
        .neq("status", "refunded"); // idempotent — skip if already marked
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle charge.dispute.created: mark order disputed + alert admins.
  // Chargebacks must be responded to within 7–10 days or they auto-close as lost,
  // costing the dispute amount + a $15 fee.
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const piId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : (dispute.payment_intent as { id: string } | null)?.id;

    if (piId) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, email, total_cents")
        .eq("stripe_payment_intent_id", piId)
        .maybeSingle();

      if (order) {
        await supabase.from("orders").update({ status: "disputed" }).eq("id", order.id);

        const disputeAmount = `$${(dispute.amount / 100).toFixed(2)}`;
        const dueBy = dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })
          : "approximately 7 days from now";

        for (const admin of ["kmitch2087@gmail.com", "aopie91@gmail.com"]) {
          await supabase.functions.invoke("send-notification", {
            body: {
              templateKey: "dispute_alert",
              recipient: admin,
              relatedKind: "order",
              relatedId: order.id,
              variables: {
                order_number: order.id.slice(0, 8).toUpperCase(),
                customer_email: order.email ?? "unknown",
                dispute_amount: disputeAmount,
                dispute_reason: dispute.reason ?? "unknown",
                dispute_id: dispute.id,
                evidence_due_by: dueBy,
                stripe_dispute_url: `https://dashboard.stripe.com/disputes/${dispute.id}`,
              },
            },
          });
        }
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle charge.dispute.closed: restore order status based on outcome.
  // "won" → funds returned → back to paid. Anything else → effectively refunded.
  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const piId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : (dispute.payment_intent as { id: string } | null)?.id;

    if (piId) {
      const newStatus = dispute.status === "won" ? "paid" : "refunded";
      await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("stripe_payment_intent_id", piId)
        .eq("status", "disputed"); // only transition from disputed state
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Support both payment_intent.succeeded (custom checkout) and
  // checkout.session.completed (legacy hosted checkout)
  let orderId: string | undefined;
  let shippingAddress: unknown = null;
  let amountTotal: number | undefined;
  let paymentIntentId: string | undefined;
  let shippingCents = 0;

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    orderId = pi.metadata?.order_id;
    shippingAddress = pi.shipping ?? null;
    amountTotal = pi.amount_received;
    paymentIntentId = pi.id;
    // shippingCents not available on payment_intent — stays 0
  } else if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    orderId = session.metadata?.order_id;
    shippingAddress = session.shipping_details ?? null;
    amountTotal = session.amount_total ?? undefined;
    shippingCents = session.shipping_cost?.amount_total ?? 0;
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
        shipping_cents: shippingCents,
      })
      .eq("id", orderId);

    // Fetch order + items + settings to build the notifications/printer payload
    const [{ data: order }, { data: items }, { data: settings }, { data: loyaltyRules }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("loyalty_rules").select("pour_points_enabled").eq("id", 1).maybeSingle(),
    ]);

    // Fetch image_url for each unique product slug from the products table
    const itemSlugs = [...new Set((items ?? []).map((it) => {
      const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
      return String(s.slug ?? "");
    }).filter(Boolean))];
    const { data: dbProducts } = itemSlugs.length
      ? await supabase.from("products").select("slug, image_url").in("slug", itemSlugs)
      : { data: [] };
    const imageBySlug = new Map<string, string>();
    for (const p of (dbProducts ?? [])) {
      if (p.slug && p.image_url) imageBySlug.set(p.slug, p.image_url);
    }

    if (!order) return new Response("ok", { status: 200 });

    // Write purchase analytics event (fire-and-forget — don't block fulfillment)
    supabase.from("analytics_events").insert({
      event_type: "purchase",
      order_id: order.id,
      revenue: ((order.total_cents ?? 0) - (order.shipping_cents ?? 0)) / 100,
      session_id: order.stripe_session_id ?? order.id,
      created_at: new Date().toISOString(),
    }).catch(() => {});

    const itemsList = (items ?? [])
      .map((it) => {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        return `• ${it.quantity}x ${(s.name as string) ?? "Item"}${s.size ? ` [${s.size}]` : ""}${s.variant ? ` ${s.variant}` : ""}${s.color ? ` ${s.color}` : ""}`;
      })
      .join("\n");

    const subtotalCents = (order.total_cents ?? 0) - (order.shipping_cents ?? 0);
    const orderTotal = `$${((order.total_cents ?? 0) / 100).toFixed(2)}`;
    const orderSubtotal = `$${(subtotalCents / 100).toFixed(2)}`;
    const shippingCostForEmail = shippingCents > 0 ? `$${(shippingCents / 100).toFixed(2)}` : 'TBD';

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

    // Determine first item's image for mockup in emails
    const firstSlug = (() => {
      const s = ((items ?? [])[0]?.product_snapshot ?? {}) as Record<string, unknown>;
      return String(s.slug ?? "");
    })();
    const mockImageUrl = firstSlug ? (imageBySlug.get(firstSlug) ?? "") : "";

    // For test orders, redirect customer email to internal team instead of fake customer address
    const TEST_RECIPIENTS = ["kmitch2087@gmail.com", "aopie91@gmail.com"];
    const confirmationRecipients: string[] = order.is_test
      ? TEST_RECIPIENTS
      : [order.email];

    for (const recipient of confirmationRecipients) {
      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "order_confirmation",
          recipient,
          relatedKind: "order",
          relatedId: order.id,
          variables: {
            customer_name: order.is_test ? "TEST ORDER" : order.email.split("@")[0],
            order_number: order.id.slice(0, 8).toUpperCase(),
            order_items: itemsList,
            order_subtotal: orderSubtotal,
            shipping_cost: shippingCostForEmail,
            order_total: orderTotal,
            mock_image_url: mockImageUrl,
          },
        },
      });
    }

    // 2) Pour Points — 1 point per $1 spent on products only (auth users only; shipping excluded; program enabled)
    if (order.user_id && (order.total_cents ?? 0) > 0 && (loyaltyRules?.pour_points_enabled ?? true)) {
      const subtotalForPoints = (order.total_cents ?? 0) - (order.shipping_cents ?? 0);
      const pointsEarned = Math.floor(subtotalForPoints / 100);
      if (subtotalForPoints > 0 && pointsEarned > 0) {
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

      // Determine which ink color (black or white) to use for the back logo
      // based on garment color: dark garments get white ink, light garments get black ink.
      const DARK_GARMENTS = ["black", "charcoal", "navy", "dark", "graphite", "forest", "maroon", "royal", "hunter", "slate"];
      const backLogoForColor = (garmentColor: string): string => {
        const isDark = DARK_GARMENTS.some((d) => garmentColor.toLowerCase().includes(d));
        return `${STORAGE_BASE}/back/logo_back_${isDark ? "white" : "black"}.png`;
      };

      // Build design links list (one per unique slug) for printer email
      const seenSlugs = new Set<string>();
      const designLinkLines: string[] = [];
      for (const it of (items ?? [])) {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        const slug = String(s.slug ?? "");
        if (!slug) {
          // Missing slug means we cannot build print file URLs — log so this is visible in function logs.
          console.error(
            `[stripe-webhook] order_item missing product slug — print file URL cannot be built. ` +
            `order_id=${order.id} product_id=${(it as Record<string, unknown>).product_id ?? "(unknown)"} ` +
            `snapshot_name=${String(s.name ?? "(unknown)")}`
          );
        }
        if (slug && !seenSlugs.has(slug)) {
          seenSlugs.add(slug);
          const garmentColor = String(s.color ?? "");
          const backUrl = backLogoForColor(garmentColor);
          designLinkLines.push(
            `${slug} (${garmentColor || "color unknown"}) — TWO-SIDED:\n` +
            `  Front Black Ink: ${STORAGE_BASE}/black/${slug}_black.png\n` +
            `  Front White Ink: ${STORAGE_BASE}/white/${slug}_white.png\n` +
            `  Back (auto-matched to garment color): ${backUrl}`
          );
        }
      }
      const designLinks = designLinkLines.join("\n\n");

      // Build fulfillment CSV
      const ship = order.shipping_address as Record<string, unknown> | null;
      const shipName = (ship?.name as string) ?? "";
      const shipAddr = ship?.address as Record<string, unknown> | null;
      const csvHeader = "Order ID,Date,Product Name,Slug,Size,Color,Qty,Ship Name,Address 1,City,State,Zip,Country,Front Print File URL,Back Print File URL,Shipping Collected";
      const csvRows = (items ?? []).map((it: { product_id?: string; quantity: number; product_snapshot?: Record<string, unknown> }) => {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        const slug = String(s.slug ?? "");
        const garmentColor = String(s.color ?? "");
        const isDark = DARK_GARMENTS.some((d) => garmentColor.toLowerCase().includes(d));
        const inkSuffix = isDark ? "white" : "black";
        const inkFolder = isDark ? "white" : "black";
        const frontUrl = slug ? `${STORAGE_BASE}/${inkFolder}/${slug}_${inkSuffix}.png` : "";
        const backUrl = backLogoForColor(garmentColor);
        const col = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        return [
          col(order.id.slice(0, 8).toUpperCase()),
          col(new Date().toISOString().slice(0, 10)),
          col(s.name ?? ""),
          col(s.slug ?? ""),
          col(s.size ?? ""),
          col(garmentColor),
          col(it.quantity),
          col(shipName),
          col(shipAddr?.line1 ?? ""),
          col(shipAddr?.city ?? ""),
          col(shipAddr?.state ?? ""),
          col(shipAddr?.postal_code ?? ""),
          col(shipAddr?.country ?? "US"),
          col(frontUrl),
          col(backUrl),
          col(shippingCents > 0 ? `$${(shippingCents / 100).toFixed(2)}` : "TBD"),
        ].join(",");
      });

      const totalItemCount = (items ?? []).reduce((sum, it) => sum + (it.quantity ?? 1), 0);
      const printerCostCents = totalItemCount * 1200;
      const totalInvoiceCents = printerCostCents + shippingCents;
      const printerCostSummary = [
        `Print cost: $12.00/item × ${totalItemCount} item${totalItemCount !== 1 ? "s" : ""} = $${(printerCostCents / 100).toFixed(2)}`,
        shippingCents > 0 ? `Shipping (pass-through): $${(shippingCents / 100).toFixed(2)}` : `Shipping: TBD — check order`,
        ``,
        `TOTAL TO INVOICE US: $${(totalInvoiceCents / 100).toFixed(2)}`,
      ].join("\n");

      const csvContent = [csvHeader, ...csvRows].join("\n");
      const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));
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

      const TEST_ORDER_EMAILS = ["kmitch2087@gmail.com", "aopie91@gmail.com"];
      const isTestOrder = TEST_ORDER_EMAILS.includes(order.email?.toLowerCase());
      const testNote = isTestOrder
        ? `<div style="background:#fef3c7;border:2px solid #d97706;padding:16px;border-radius:4px;margin-bottom:20px;">
  <p style="margin:0;font-weight:bold;font-size:15px;color:#92400e;">⚠️ TEST ORDER — Please confirm receipt</p>
  <p style="margin:8px 0 0;font-size:14px;color:#111;">This is a test to verify the fulfillment flow. Please do the following:</p>
  <ol style="margin:10px 0 0;padding-left:20px;font-size:14px;color:#111;line-height:2;">
    <li><strong>Reply to this email</strong> to confirm you received it and the design file links and CSV look correct.</li>
    <li>Click the "Submit Tracking Number" button below and enter this fake tracking number:<br/><span style="font-family:monospace;font-size:16px;font-weight:bold;letter-spacing:0.05em;color:#000;">9400111899223397622939</span>&nbsp;&nbsp;(USPS)</li>
    <li>This confirms the magic link → customer shipping notification loop works end-to-end.</li>
  </ol>
  <p style="margin:12px 0 0;font-size:12px;color:#666;">Do NOT print or ship anything — this is a test only.</p>
</div>`
        : "";

      const printerVars = {
        order_number: shortId,
        customer_name: order.email.split("@")[0],
        customer_email: order.email,
        order_items: itemsList,
        shipping_address: addr,
        tracking_submit_url: trackingSubmitUrl,
        design_links: designLinks,
        printer_cost_summary: printerCostSummary,
        mock_image_url: mockImageUrl,
        shipping_cents: shippingCents,
        test_note: testNote,
      };

      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "printer_notification",
          recipient: settings.printer_email,
          relatedKind: "order",
          relatedId: order.id,
          variables: printerVars,
          attachments: [{ filename: `order-${shortId}.csv`, content: csvBase64 }],
        },
      });

      // CC both Kristin and Opie on every printer notification
      for (const cc of ["kmitch2087@gmail.com", "aopie91@gmail.com"]) {
        await supabase.functions.invoke("send-notification", {
          body: {
            templateKey: "printer_notification",
            recipient: cc,
            relatedKind: "order",
            relatedId: order.id,
            variables: printerVars,
            attachments: [{ filename: `order-${shortId}.csv`, content: csvBase64 }],
          },
        });
      }
    }
  } // end if (orderId)

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
