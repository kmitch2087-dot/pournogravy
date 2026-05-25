// track-event — anonymous analytics ingestion endpoint
// Called via navigator.sendBeacon (fire-and-forget, non-blocking).
// No auth required for INSERT. Only IP-level rate limiting (CF handles it).
// DO NOT return sensitive data — this endpoint is fully public.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

interface EventBody {
  event_type: "page_view" | "add_to_cart" | "checkout_start" | "purchase";
  page?: string;
  product_id?: string;
  order_id?: string;
  revenue?: number;
  session_id?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

const VALID_EVENTS = new Set([
  "page_view",
  "add_to_cart",
  "checkout_start",
  "purchase",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  // Only POST accepted
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body: EventBody = await req.json();

    // Validate event type
    if (!body.event_type || !VALID_EVENTS.has(body.event_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_type" }),
        { status: 400, headers: { ...corsHeaders(req), "content-type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role so RLS insert policy applies cleanly
      { auth: { persistSession: false } },
    );

    // Try to get user_id from Authorization header if present (optional)
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      user_id = data?.user?.id ?? null;
    }

    const { error } = await supabase.from("analytics_events").insert({
      event_type:  body.event_type,
      page:        body.page        ?? null,
      product_id:  body.product_id  ?? null,
      order_id:    body.order_id    ?? null,
      revenue:     body.revenue     ?? null,
      session_id:  body.session_id  ?? null,
      referrer:    body.referrer    ?? null,
      user_agent:  req.headers.get("user-agent") ?? null,
      metadata:    body.metadata    ?? {},
      user_id,
    });

    if (error) {
      console.error("[track-event] insert error:", error.message);
      return new Response(
        JSON.stringify({ error: "Failed to record event" }),
        { status: 500, headers: { ...corsHeaders(req), "content-type": "application/json" } },
      );
    }

    return new Response(null, { status: 204, headers: corsHeaders(req) });
  } catch (err) {
    console.error("[track-event] unexpected error:", err);
    return new Response(null, { status: 204, headers: corsHeaders(req) }); // still 204 — don't break the client
  }
});
