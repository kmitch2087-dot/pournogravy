// validate-discount edge function.
// Validates a promo code against the current cart total and returns
// the discount amount. Does NOT increment use_count — that happens
// in create-checkout when the session is actually created.
//
// Request body: { code: string, cart_total_cents: number }
// Response:     { valid: boolean, discount_cents: number, message: string }

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { code, cart_total_cents } = await req.json() as {
      code: string;
      cart_total_cents: number;
    };

    if (!code || typeof cart_total_cents !== "number") {
      return new Response(
        JSON.stringify({ valid: false, discount_cents: 0, message: "Missing code or cart total" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const { data: discount, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("is_active", true)
      .ilike("code", code.trim())
      .maybeSingle();

    if (error) throw error;

    if (!discount) {
      return new Response(
        JSON.stringify({ valid: false, discount_cents: 0, message: "Invalid promo code." }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    if (discount.expires_at && new Date(discount.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ valid: false, discount_cents: 0, message: "This code has expired." }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    if (discount.max_uses !== null && discount.use_count >= discount.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, discount_cents: 0, message: "This code has reached its usage limit." }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    if (cart_total_cents < discount.min_order_cents) {
      const min = (discount.min_order_cents / 100).toFixed(2);
      return new Response(
        JSON.stringify({
          valid: false,
          discount_cents: 0,
          message: `Minimum order of $${min} required for this code.`,
        }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const discount_cents = discount.discount_type === "percent"
      ? Math.round(cart_total_cents * discount.discount_value / 100)
      : Math.min(discount.discount_value, cart_total_cents);

    return new Response(
      JSON.stringify({
        valid: true,
        discount_cents,
        message: discount.discount_type === "percent"
          ? `${discount.discount_value}% off applied!`
          : `$${(discount_cents / 100).toFixed(2)} off applied!`,
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[validate-discount]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, discount_cents: 0, message: msg }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
