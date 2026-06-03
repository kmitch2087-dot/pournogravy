// submit-tracking edge function
// Called by the printer's magic link form to submit a tracking number.
// Validates a HMAC-SHA256 token (order_id signed with FULFILLMENT_SECRET),
// updates the order status → shipped, then fires the order_shipped email.
//
// SECRETS REQUIRED:
//   FULFILLMENT_SECRET  — any random string, used to sign/verify printer tokens
//
// POST /submit-tracking
// Body: { orderId, token, trackingNumber, trackingCarrier }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

async function verifyToken(orderId: string, token: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const tokenBytes = Uint8Array.from(atob(token.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, tokenBytes, enc.encode(orderId));
}

function carrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const c = carrier.toLowerCase().trim();
  if (c.includes("usps"))   return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (c.includes("ups"))    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes("fedex"))  return `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`;
  if (c.includes("dhl"))    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${trackingNumber}`)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const secret = Deno.env.get("FULFILLMENT_SECRET");
  if (!secret) return new Response("FULFILLMENT_SECRET not configured", { status: 500, headers: corsHeaders });

  let body: { orderId?: string; token?: string; trackingNumber?: string; trackingCarrier?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const { orderId, token, trackingNumber, trackingCarrier } = body;

  if (!orderId || !token || !trackingNumber || !trackingCarrier) {
    return new Response(JSON.stringify({ error: "orderId, token, trackingNumber, and trackingCarrier are required" }), {
      status: 400, headers: corsHeaders,
    });
  }

  // Verify HMAC token
  let valid = false;
  try { valid = await verifyToken(orderId, token, secret); } catch { valid = false; }
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 403, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
  }

  if (order.status === "shipped") {
    return new Response(JSON.stringify({ ok: true, alreadyShipped: true }), { headers: corsHeaders });
  }

  const trackingUrl = carrierTrackingUrl(trackingCarrier, trackingNumber);

  // Update order
  await supabase
    .from("orders")
    .update({
      status: "shipped",
      tracking_number: trackingNumber,
      tracking_carrier: trackingCarrier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  // Fire customer shipped email
  const shortId = order.id.slice(0, 8).toUpperCase();
  await supabase.functions.invoke("send-notification", {
    body: {
      templateKey: "order_shipped",
      recipient: order.email,
      relatedKind: "order",
      relatedId: order.id,
      variables: {
        customer_name: order.email.split("@")[0],
        order_number: shortId,
        tracking_carrier: trackingCarrier,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
      },
    },
  });

  return new Response(JSON.stringify({ ok: true, trackingUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
