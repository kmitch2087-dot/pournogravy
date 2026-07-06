// Printer-facing fulfillment portal — no JWT, HMAC-protected.
//
// Auth token = HMAC-SHA256("fulfillment-portal", FULFILLMENT_SECRET)
// Per-order tokens = HMAC-SHA256(orderId, FULFILLMENT_SECRET)
// Both are accepted for all actions (advance/note also accept per-order token).
//
// GET  ?action=list                          → active orders, safe fields only
// POST {action:"advance", orderId, to}       → advance status, append to history
// GET  ?action=advance&orderId=X&to=Y&token= → same, returns branded HTML (email tap)
// POST {action:"note", orderId, note}        → append note to printer_queue
//
// SECRETS: FULFILLMENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const PORTAL_MSG = "fulfillment-portal";
const STORAGE_BASE = "https://emtjkawcmsfgjyimnncf.supabase.co/storage/v1/object/public/print-files";

const ALLOWED: Record<string, string[]> = {
  paid:          ["in_production", "cancelled"],
  in_production: ["shipped", "cancelled"],
  shipped:       ["delivered", "fulfilled"],
  delivered:     ["fulfilled"],
};

function canAdvance(from: string, to: string) {
  return ALLOWED[from]?.includes(to) ?? false;
}

// Maps canonical order status → printer_queue.status (must satisfy existing CHECK constraint)
const QUEUE_MAP: Record<string, string> = {
  in_production: "printed",
  shipped:       "shipped",
  cancelled:     "cancelled",
  delivered:     "shipped",
  fulfilled:     "shipped",
};

async function sign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function verify(message: string, token: string, secret: string): Promise<boolean> {
  const expected = await sign(message, secret);
  if (expected.length !== token.length) return false;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(token);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ (b[i] ?? 0);
  return diff === 0;
}

function carrierUrl(carrier: string, tracking: string): string {
  const c = carrier.toLowerCase();
  if (c.includes("usps"))  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`;
  if (c.includes("ups"))   return `https://www.ups.com/track?tracknum=${tracking}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?tracknumbers=${tracking}`;
  if (c.includes("dhl"))   return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${tracking}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${tracking}`)}`;
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function confirmHtml(shortId: string, to: string, portalUrl: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{background:#000;color:#fde047;font-family:Arial,sans-serif;display:flex;align-items:center;
justify-content:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box;}
.card{background:#111;border:2px solid #fde047;padding:32px 40px;text-align:center;max-width:420px;width:100%;}
h1{margin:0 0 12px;font-size:28px;letter-spacing:.15em;text-transform:uppercase;}
p{color:#ccc;margin:8px 0;font-size:15px;}strong{color:#fff;}
a{color:#fde047;font-size:12px;margin-top:20px;display:block;text-decoration:none;letter-spacing:.08em;}
a:hover{text-decoration:underline;}</style></head>
<body><div class="card"><h1>✅ Got it</h1>
<p>Order <strong>${shortId}</strong> marked <strong>${to.replace(/_/g," ").toUpperCase()}</strong>.</p>
<a href="${portalUrl}">→ VIEW ALL ORDERS</a></div></body></html>`,
    { headers: { ...CORS, "Content-Type": "text/html" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const secret = Deno.env.get("FULFILLMENT_SECRET");
  if (!secret) return jsonRes({ error: "Not configured" }, 500);

  const siteUrl = Deno.env.get("SITE_URL") ?? "https://pournogravy.com";

  // Parse params from URL (GET) or body (POST)
  const url = new URL(req.url);
  let action: string, orderId: string | null, token: string, to: string | null, note: string | null;

  if (req.method === "GET") {
    action  = url.searchParams.get("action") ?? "list";
    orderId = url.searchParams.get("orderId");
    token   = url.searchParams.get("token") ?? "";
    to      = url.searchParams.get("to");
    note    = url.searchParams.get("note");
  } else {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty ok */ }
    action  = (body.action as string) ?? "list";
    orderId = (body.orderId as string) ?? null;
    token   = (body.token as string) ?? "";
    to      = (body.to as string) ?? null;
    note    = (body.note as string) ?? null;
  }

  // Verify portal token; for advance/note also accept per-order token
  const portalOk = await verify(PORTAL_MSG, token, secret);
  if (!portalOk) {
    const orderOk = (action === "advance" || action === "note") && orderId
      ? await verify(orderId, token, secret)
      : false;
    if (!orderOk) return jsonRes({ error: "Invalid token" }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (action === "list") {
    const { data: qRows, error: qErr } = await supabase
      .from("printer_queue")
      .select("id, order_id, status, notes, status_history, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (qErr) return jsonRes({ error: qErr.message }, 500);
    if (!qRows?.length) return jsonRes({ orders: [] });

    const orderIds = [...new Set(qRows.map(r => r.order_id as string))];

    const [{ data: orderRows }, { data: itemRows }] = await Promise.all([
      supabase.from("orders")
        .select("id, status, created_at, shipping_address, tracking_number, tracking_carrier")
        .in("id", orderIds),
      supabase.from("order_items")
        .select("order_id, quantity, product_snapshot")
        .in("order_id", orderIds),
    ]);

    const orderMap = new Map((orderRows ?? []).map(o => [o.id as string, o]));
    const itemMap = new Map<string, typeof itemRows>([]);
    for (const it of (itemRows ?? [])) {
      const oid = it.order_id as string;
      if (!itemMap.has(oid)) itemMap.set(oid, []);
      itemMap.get(oid)!.push(it);
    }

    const rows = await Promise.all(qRows.map(async (q) => {
      const order = orderMap.get(q.order_id as string);
      if (!order) return null;

      const items = (itemMap.get(q.order_id as string) ?? []).map(it => {
        const s = (it.product_snapshot as Record<string, unknown>) ?? {};
        return {
          qty:   it.quantity as number,
          name:  (s.name  as string) ?? "Item",
          size:  (s.size  as string) ?? "",
          color: (s.color as string) ?? "",
          slug:  (s.slug  as string) ?? "",
        };
      });

      const slugs = [...new Set(items.map(i => i.slug).filter(Boolean))];
      const printLinks = slugs.map(slug => ({
        slug,
        black: `${STORAGE_BASE}/black/${slug}_black.png`,
        white: `${STORAGE_BASE}/white/${slug}_white.png`,
      }));

      const trackTok = await sign(order.id as string, secret);
      const shipUrl  = `${siteUrl}/ship/${order.id}?token=${trackTok}`;

      return {
        queueId:         q.id,
        queueStatus:     q.status,
        notes:           q.notes,
        statusHistory:   q.status_history,
        orderId:         order.id,
        shortId:         (order.id as string).slice(0, 8).toUpperCase(),
        orderStatus:     order.status,
        createdAt:       order.created_at,
        shippingAddress: order.shipping_address,
        trackingNumber:  order.tracking_number,
        trackingCarrier: order.tracking_carrier,
        items,
        printLinks,
        shipUrl,
      };
    }));

    return jsonRes({ orders: rows.filter(Boolean) });
  }

  // ── ADVANCE ───────────────────────────────────────────────────────────────
  if (action === "advance") {
    if (!orderId || !to) return jsonRes({ error: "orderId and to required" }, 400);

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("id, status, email, tracking_number, tracking_carrier")
      .eq("id", orderId)
      .single();

    if (oErr || !order) return jsonRes({ error: "Order not found" }, 404);

    const portalUrl = `${siteUrl}/fulfillment?t=${encodeURIComponent(await sign(PORTAL_MSG, secret))}`;

    // Idempotent — already at target
    if (order.status === to) {
      if (req.method === "GET") return confirmHtml((order.id as string).slice(0, 8).toUpperCase(), to as string, portalUrl);
      return jsonRes({ ok: true, alreadyAt: to });
    }

    if (!canAdvance(order.status as string, to as string)) {
      return jsonRes({ error: `Cannot advance from ${order.status} to ${to}` }, 400);
    }

    await supabase.from("orders").update({ status: to }).eq("id", orderId);

    const { data: pq } = await supabase
      .from("printer_queue")
      .select("id, status_history")
      .eq("order_id", orderId)
      .maybeSingle();

    if (pq) {
      const history = Array.isArray(pq.status_history) ? [...pq.status_history] : [];
      history.push({ status: to, at: new Date().toISOString(), source: "printer" });
      await supabase.from("printer_queue")
        .update({ status: QUEUE_MAP[to as string] ?? "printed", status_history: history })
        .eq("id", pq.id);
    }

    // Fire shipped email if tracking is already set
    if (to === "shipped" && order.tracking_number && order.tracking_carrier) {
      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "order_shipped",
          recipient: order.email,
          relatedKind: "order",
          relatedId: order.id,
          variables: {
            customer_name: (order.email as string).split("@")[0],
            order_number:  (order.id as string).slice(0, 8).toUpperCase(),
            tracking_carrier: order.tracking_carrier,
            tracking_number:  order.tracking_number,
            tracking_url: carrierUrl(order.tracking_carrier as string, order.tracking_number as string),
          },
        },
      });
    }

    if (req.method === "GET") {
      return confirmHtml((order.id as string).slice(0, 8).toUpperCase(), to as string, portalUrl);
    }
    return jsonRes({ ok: true, from: order.status, to });
  }

  // ── NOTE ─────────────────────────────────────────────────────────────────
  if (action === "note") {
    if (!orderId || !note) return jsonRes({ error: "orderId and note required" }, 400);

    const { data: pq } = await supabase
      .from("printer_queue")
      .select("id, notes")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!pq) return jsonRes({ error: "Queue entry not found" }, 404);

    const prefix  = new Date().toISOString().slice(0, 10);
    const updated = pq.notes ? `${pq.notes}\n${prefix}: ${note}` : `${prefix}: ${note}`;
    await supabase.from("printer_queue").update({ notes: updated }).eq("id", pq.id);

    return jsonRes({ ok: true });
  }

  return jsonRes({ error: "Unknown action" }, 400);
});
