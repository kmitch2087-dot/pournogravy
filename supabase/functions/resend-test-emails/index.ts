// resend-test-emails
// Admin-only edge function that replays the order_confirmation + printer_notification
// emails for a given test order. Requires service role key in Authorization header.
// Customer confirmation goes to the two internal recipients; printer notification goes
// to the actual printer_email + CC to both internal recipients.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTERNAL_RECIPIENTS = ["kmitch2087@gmail.com", "aopie91@gmail.com"];
const DARK_GARMENTS = ["black", "charcoal", "navy", "dark", "graphite", "forest", "maroon", "royal", "hunter", "slate"];
const STORAGE_BASE = "https://emtjkawcmsfgjyimnncf.supabase.co/storage/v1/object/public/print-files";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { order_id } = await req.json();
  if (!order_id) {
    return new Response(JSON.stringify({ error: "order_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  const [{ data: order }, { data: items }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", order_id).single(),
    supabase.from("order_items").select("*").eq("order_id", order_id),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (!order) {
    return new Response(JSON.stringify({ error: "Order not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const itemsList = (items ?? [])
    .map((it) => {
      const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
      return `• ${it.quantity}x ${(s.name as string) ?? "Item"}${s.size ? ` [${s.size}]` : ""}${s.color ? ` ${s.color}` : ""}`;
    })
    .join("\n");

  const subtotalCents = (order.total_cents ?? 0) - (order.shipping_cents ?? 0);
  const orderTotal = `$${((order.total_cents ?? 0) / 100).toFixed(2)}`;
  const orderSubtotal = `$${(subtotalCents / 100).toFixed(2)}`;
  const shippingCostForEmail = (order.shipping_cents ?? 0) > 0
    ? `$${((order.shipping_cents ?? 0) / 100).toFixed(2)}`
    : "TBD";

  // 1) Customer confirmation → both internal recipients
  for (const recipient of INTERNAL_RECIPIENTS) {
    await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "order_confirmation",
        recipient,
        relatedKind: "order",
        relatedId: order.id,
        variables: {
          customer_name: "TEST ORDER",
          order_number: order.id.slice(0, 8).toUpperCase(),
          order_items: itemsList,
          order_subtotal: orderSubtotal,
          shipping_cost: shippingCostForEmail,
          order_total: orderTotal,
          mock_image_url: "",
        },
      },
    });
  }

  // 2) Printer notification → actual printer + CC both internal
  if (settings?.fulfillment_provider === "local_printer" && settings.printer_email) {
    const backLogoForColor = (garmentColor: string) => {
      const isDark = DARK_GARMENTS.some((d) => garmentColor.toLowerCase().includes(d));
      return `${STORAGE_BASE}/back/logo_back_${isDark ? "white" : "black"}.png`;
    };

    const seenSlugs = new Set<string>();
    const designLinkLines: string[] = [];
    for (const it of (items ?? [])) {
      const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
      const slug = String(s.slug ?? "");
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

    const ship = order.shipping_address as Record<string, unknown> | null;
    const shipAddr = ship?.address as Record<string, unknown> | null;
    const shipName = (ship?.name as string) ?? "";
    const addr = ship
      ? `${shipAddr?.line1 ?? ""}, ${shipAddr?.city ?? ""}, ${shipAddr?.state ?? ""} ${shipAddr?.postal_code ?? ""}`
      : "(no address — test order)";

    const csvHeader = "Order ID,Date,Product Name,Slug,Size,Color,Qty,Ship Name,Address 1,City,State,Zip,Country,Front Print File URL,Back Print File URL,Shipping Collected";
    const csvRows = (items ?? []).map((it) => {
      const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
      const slug = String(s.slug ?? "");
      const garmentColor = String(s.color ?? "");
      const isDark = DARK_GARMENTS.some((d) => garmentColor.toLowerCase().includes(d));
      const inkFolder = isDark ? "white" : "black";
      const inkSuffix = isDark ? "white" : "black";
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
        col((order.shipping_cents ?? 0) > 0 ? `$${((order.shipping_cents ?? 0) / 100).toFixed(2)}` : "TBD"),
      ].join(",");
    });

    const totalItemCount = (items ?? []).reduce((sum, it) => sum + (it.quantity ?? 1), 0);
    const printerCostCents = totalItemCount * 1200;
    const totalInvoiceCents = printerCostCents + (order.shipping_cents ?? 0);
    const printerCostSummary = [
      `[TEST ORDER — DO NOT FULFILL]`,
      ``,
      `Print cost: $12.00/item × ${totalItemCount} item${totalItemCount !== 1 ? "s" : ""} = $${(printerCostCents / 100).toFixed(2)}`,
      (order.shipping_cents ?? 0) > 0
        ? `Shipping (pass-through): $${((order.shipping_cents ?? 0) / 100).toFixed(2)}`
        : `Shipping: TBD — check order`,
      ``,
      `TOTAL TO INVOICE US: $${(totalInvoiceCents / 100).toFixed(2)}`,
    ].join("\n");

    const shortId = order.id.slice(0, 8).toUpperCase();
    const csvContent = [csvHeader, ...csvRows].join("\n");
    const csvBase64 = btoa(csvContent);

    const printerVars = {
      order_number: shortId,
      customer_name: "TEST ORDER — DO NOT FULFILL",
      customer_email: order.email,
      order_items: itemsList,
      shipping_address: addr,
      tracking_submit_url: "",
      design_links: designLinkLines.join("\n\n") || "(no design links — check product slugs)",
      printer_cost_summary: printerCostSummary,
      mock_image_url: "",
      shipping_cents: order.shipping_cents ?? 0,
    };

    const printerRecipients = [
      settings.printer_email,
      ...INTERNAL_RECIPIENTS,
    ];

    for (const recipient of printerRecipients) {
      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "printer_notification",
          recipient,
          relatedKind: "order",
          relatedId: order.id,
          variables: printerVars,
          attachments: [{ filename: `TEST-order-${shortId}.csv`, content: csvBase64 }],
        },
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, order_id, sent_to: INTERNAL_RECIPIENTS }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
