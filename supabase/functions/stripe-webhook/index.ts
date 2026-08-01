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
    shippingCents = Number(pi.metadata?.shipping_cents ?? 0);
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
    // Mark order paid — outside try-catch; returns {data,error}, never throws
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

    try {

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

    if (!order) {
      console.error("[stripe-webhook] order re-fetch null", { orderId });
      return new Response("ok", { status: 200 });
    }

    // Record the Stripe tax transaction (Task 16). No-op when tax was off
    // for this order (no stripe_tax_calculation_id). Idempotent for webhook
    // retries: skip once stripe_tax_transaction_id is already set. Isolated
    // try-catch so a tax-transaction failure never blocks the fulfillment
    // email/printer flow below.
    if (order.stripe_tax_calculation_id && !order.stripe_tax_transaction_id) {
      try {
        const tx = await stripe.tax.transactions.createFromCalculation({
          calculation: order.stripe_tax_calculation_id,
          reference: order.id,
        });
        await supabase.from("orders").update({ stripe_tax_transaction_id: tx.id }).eq("id", order.id);
        order.stripe_tax_transaction_id = tx.id;
      } catch (taxErr) {
        console.error("[stripe-webhook] tax transaction creation failed", {
          orderId: order.id,
          error: taxErr instanceof Error ? taxErr.message : String(taxErr),
        });
      }
    }

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
      const { error: confirmErr } = await supabase.functions.invoke("send-notification", {
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
      if (confirmErr) console.error("[stripe-webhook] order_confirmation send failed", { recipient, error: confirmErr });
    }

    // 2) Pour Points — 1 point per $1 spent on products only (auth users only; shipping excluded; program enabled)
    if (order.user_id && (order.total_cents ?? 0) > 0 && (loyaltyRules?.pour_points_enabled ?? false)) {
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
      const { error: queueErr } = await supabase.from("printer_queue").insert([{
        order_id: order.id,
        payload: { items, shipping: order.shipping_address, total: order.total_cents },
        status: "queued",
      }]);
      if (queueErr) console.error("[stripe-webhook] printer_queue insert failed", { orderId: order.id, error: queueErr });

      // Design file URLs are stored in Supabase Storage keyed by product slug
      const STORAGE_BASE = "https://emtjkawcmsfgjyimnncf.supabase.co/storage/v1/object/public/print-files";

      // Print files use short design codes, not the product slug. Map slug → code so the
      // Front print URLs resolve. Anything unmapped falls back to the slug (prior behavior),
      // so this is strictly additive and cannot regress existing behavior.
      // Only confident, unambiguous mappings are listed; ambiguous designs are intentionally
      // omitted (they keep the slug fallback) to avoid ever printing the wrong artwork.
      const PRINT_BASE: Record<string, string> = {
        "the-finger-tee": "finger_male",
        "the-finger-tee-female": "finger_female",
        "the-finger-tee-unisex": "finger_mf",
        // Atheist/Introvert female graphics need their own print PNGs (atheist_female,
        // introvert_female) uploaded before mapping — omitted until then to avoid
        // printing the male artwork on a female order.
        // "atheist-tee-female": "atheist_female",
        // "introverted-bartender-tee-female": "introvert_female",
        "pourn-hand-tee": "pourn_hand_mens",
        "pourn-hand-tee-female": "pourn_hand_womens",
        "second-most-fun-job-tee": "legal_job_male",
        "second-most-fun-job-tee-female": "legal_job_female",
        "legally-fun-tee-text-only": "legal_job_text",
        "atheist-tee": "atheist",
        "atheist-with-text-only": "atheist_text",
        "cow-tipping": "cow",
        "f-off-karen": "f_off_karen",
        "do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee": "glass_can",
        "i-would-totally-tap-that-keg-tee": "keg_tap",
        "im-your-favorite-bartenders-favorite-bartender-tee": "fav_bartender",
        "introverted-bartender-tee": "introvert",
        "last-call-for-karen-tee": "last_call_karen",
        "service-bartender-do-not-approach-tee": "service_bar",
        "tip-your-therapist-tee": "therapist",
        "i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee": "real_job_image",
        "i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only": "real_job_text",
        "strn-drink-tee-text-and-image": "strong_drink_image",
        "your-next-drink-is-only-as-strong-as-your-last-tip-tee": "strong_drink_text",
        "well-it-ain-t-gonna-lick-itself-tee": "lick_itself",
        "dear-karen-you-stink-tee": "shocker",
        "pournogravy-og-tee-the-official-uniform-for-bartender-legends": "logo_full_tag",
        "saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee": "tagline_without_logo",
        "tea-toes-and-vodka-please-tee": "tea_please",
      };
      const printBaseFor = (slug: string): string => PRINT_BASE[slug] ?? slug;

      // Determine which ink color (black or white) to use for the back logo
      // based on garment color: dark garments get white ink, light garments get black ink.
      const DARK_GARMENTS = ["black", "charcoal", "navy", "dark", "graphite", "forest", "maroon", "royal", "hunter", "slate"];
      const isDarkGarment = (c: string) => DARK_GARMENTS.some((d) => c.toLowerCase().includes(d));
      const backLogoPath = (garmentColor: string): string =>
        `back/logo_back_${isDarkGarment(garmentColor) ? "white" : "black"}.png`;

      // print-files is a private bucket — deliver long-lived (1 year) signed URLs so the
      // printer can open the artwork straight from the order email. Falls back to the
      // public path if signing fails (keeps working if the bucket is still public).
      const SIGN_TTL = 31_536_000; // 1 year
      const signPath = async (p: string): Promise<string> => {
        try {
          const { data } = await supabase.storage.from("print-files").createSignedUrl(p, SIGN_TTL);
          return data?.signedUrl ?? `${STORAGE_BASE}/${p}`;
        } catch {
          return `${STORAGE_BASE}/${p}`;
        }
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
          const printBase = printBaseFor(slug);
          const [frontBlack, frontWhite, backUrl] = await Promise.all([
            signPath(`black/${printBase}_black.png`),
            signPath(`white/${printBase}_white.png`),
            signPath(backLogoPath(garmentColor)),
          ]);
          designLinkLines.push(
            `${slug} (${garmentColor || "color unknown"}) — TWO-SIDED:\n` +
            `  Front Black Ink: ${frontBlack}\n` +
            `  Front White Ink: ${frontWhite}\n` +
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
      const csvRows = await Promise.all((items ?? []).map(async (it: { product_id?: string; quantity: number; product_snapshot?: Record<string, unknown> }) => {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        const slug = String(s.slug ?? "");
        const garmentColor = String(s.color ?? "");
        const isDark = isDarkGarment(garmentColor);
        const inkSuffix = isDark ? "white" : "black";
        const inkFolder = isDark ? "white" : "black";
        const frontUrl = slug ? await signPath(`${inkFolder}/${printBaseFor(slug)}_${inkSuffix}.png`) : "";
        const backUrl = await signPath(backLogoPath(garmentColor));
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
      }));

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

      // Generate fulfillment tokens — per-order for tracking submit, portal for two-tap advance links
      const fulfillmentSecret = Deno.env.get("FULFILLMENT_SECRET");
      const siteUrl = Deno.env.get("SITE_URL") ?? "https://pournogravy.com";
      let trackingSubmitUrl = "";
      let actionLinks = "";
      if (fulfillmentSecret) {
        const tok = await generateFulfillmentToken(order.id, fulfillmentSecret);
        trackingSubmitUrl = `${siteUrl}/ship/${order.id}?token=${tok}`;

        const portalTok = await generateFulfillmentToken("fulfillment-portal", fulfillmentSecret);
        const supabaseProjectUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const inProductionUrl = `${supabaseProjectUrl}/functions/v1/fulfillment-portal?action=advance&orderId=${order.id}&to=in_production&token=${encodeURIComponent(portalTok)}`;
        const portalUrl = `${siteUrl}/fulfillment?t=${encodeURIComponent(portalTok)}`;
        actionLinks = `<div style="margin:0 0 20px;padding:14px 16px;background:#f5f5f5;border-radius:4px;border-left:4px solid #fde047;">
  <p style="margin:0 0 10px;font-weight:bold;font-size:13px;color:#111;letter-spacing:.05em;">QUICK ACTIONS:</p>
  <a href="${inProductionUrl}" style="display:inline-block;margin-right:10px;margin-bottom:8px;background:#000;color:#fde047;padding:10px 16px;font-weight:bold;font-size:13px;text-decoration:none;border:2px solid #fde047;">✅ Got it — Mark In Production</a>
  <a href="${trackingSubmitUrl}" style="display:inline-block;margin-bottom:8px;background:#fde047;color:#000;padding:10px 16px;font-weight:bold;font-size:13px;text-decoration:none;">📦 Add Tracking Number →</a>
  <p style="margin:8px 0 0;font-size:11px;color:#999;">View all orders: <a href="${portalUrl}" style="color:#888;">${portalUrl}</a></p>
</div>`;
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
        action_links: actionLinks,
      };

      const { error: printerErr } = await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "printer_notification",
          recipient: settings.printer_email,
          relatedKind: "order",
          relatedId: order.id,
          variables: printerVars,
          attachments: [{ filename: `order-${shortId}.csv`, content: csvBase64 }],
        },
      });
      if (printerErr) {
        console.error("[stripe-webhook] printer_notification send failed", { orderId: order.id, error: printerErr });
        await supabase.from("notifications").insert({
          type: "email",
          template_key: "printer_notification",
          recipient: settings.printer_email,
          related_kind: "order",
          related_id: order.id,
          status: "failed",
          subject: "",
          body_html: "",
          body_text: "",
        });
      }

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
    } catch (processingErr) {
      // Log the actual error so we can see it in Supabase edge function logs,
      // then return 200 to stop Stripe retrying — order is already marked paid.
      console.error("[stripe-webhook] PROCESSING ERROR", {
        orderId,
        eventType: event.type,
        error: processingErr instanceof Error ? processingErr.message : String(processingErr),
        stack: processingErr instanceof Error ? processingErr.stack : undefined,
      });
    }

  } // end if (orderId)

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
