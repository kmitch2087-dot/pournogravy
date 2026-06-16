// resend-printer-notification edge function
// Allows an admin to resend the printer fulfillment email for an existing order,
// regenerating a fresh HMAC magic link so the printer can still submit tracking.
//
// SECRETS REQUIRED:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   FULFILLMENT_SECRET  — same secret used to originally sign printer tokens
//   SITE_URL            — defaults to https://pournogravy.com
//
// POST /resend-printer-notification
// Headers: Authorization: Bearer <admin JWT>
// Body: { orderId: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate HMAC-SHA256 token for printer tracking link (base64url, no padding)
async function generateFulfillmentToken(orderId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(orderId));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // ── 1. Require admin auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use the caller's JWT to check their admin status
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await callerClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Validate request body ───────────────────────────────────────────────
    let body: { orderId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId } = body;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Load required secrets ───────────────────────────────────────────────
    const fulfillmentSecret = Deno.env.get("FULFILLMENT_SECRET");
    if (!fulfillmentSecret) {
      return new Response(JSON.stringify({ error: "FULFILLMENT_SECRET not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://pournogravy.com";

    // ── 4. Fetch order, items, settings via service role ──────────────────────
    const supabase = createClient(supabaseUrl, serviceKey);

    const [{ data: order, error: orderErr }, { data: items }, { data: settings }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    // ── 5. 404 if order not found ──────────────────────────────────────────────
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 6. Regenerate HMAC fulfillment token ───────────────────────────────────
    const tok = await generateFulfillmentToken(orderId, fulfillmentSecret);

    // ── 7. Build tracking submit URL ───────────────────────────────────────────
    const trackingSubmitUrl = `${siteUrl}/ship/${orderId}?token=${tok}`;

    // ── 8. Build printer notification variables ────────────────────────────────
    const shortId = order.id.slice(0, 8).toUpperCase();

    const itemsList = (items ?? [])
      .map((it) => {
        const s = (it.product_snapshot ?? {}) as Record<string, unknown>;
        return `• ${it.quantity}x ${(s.name as string) ?? "Item"}${s.size ? ` [${s.size}]` : ""}${s.variant ? ` ${s.variant}` : ""}${s.color ? ` ${s.color}` : ""}`;
      })
      .join("\n");

    const ship = order.shipping_address as Record<string, unknown> | null;
    const shipAddr = ship?.address as Record<string, unknown> | null;
    const addr = ship
      ? `${shipAddr?.line1 ?? ""}, ${shipAddr?.city ?? ""}, ${shipAddr?.state ?? ""} ${shipAddr?.postal_code ?? ""}`
      : "(no address)";

    const printerVars = {
      order_number: shortId,
      customer_name: order.email.split("@")[0],
      customer_email: order.email,
      order_items: itemsList,
      shipping_address: addr,
      tracking_submit_url: trackingSubmitUrl,
      design_links: "",                         // skip rebuilding on resend
      printer_cost_summary: "See original order email for cost breakdown.",
      mock_image_url: "",
    };

    const printerEmail = settings?.printer_email;
    if (!printerEmail) {
      return new Response(JSON.stringify({ error: "No printer_email configured in settings" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 9. Send to printer ─────────────────────────────────────────────────────
    const { error: printerSendErr } = await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "printer_notification",
        recipient: printerEmail,
        relatedKind: "order",
        relatedId: orderId,
        variables: printerVars,
      },
    });

    if (printerSendErr) {
      console.error("[resend-printer-notification] send-notification error (printer):", printerSendErr);
    }

    // ── 10. CC Kristin ─────────────────────────────────────────────────────────
    const { error: ccSendErr } = await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "printer_notification",
        recipient: "kmitch2087@gmail.com",
        relatedKind: "order",
        relatedId: orderId,
        variables: printerVars,
      },
    });

    if (ccSendErr) {
      console.error("[resend-printer-notification] send-notification error (CC):", ccSendErr);
    }

    // ── 11. Return success ─────────────────────────────────────────────────────
    return new Response(JSON.stringify({ ok: true, trackingSubmitUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[resend-printer-notification] unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
