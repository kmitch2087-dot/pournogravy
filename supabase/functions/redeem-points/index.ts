/**
 * redeem-points
 * Converts 100 Pour Points into a $5 single-use discount code.
 * Requires authenticated user (JWT in Authorization header).
 *
 * Points rate: 100 points = $5 off
 * Minimum redemption: 100 points
 * Code expires 30 days from creation.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  // Verify calling user
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  // Service role client for writes
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const POINTS_PER_REDEMPTION = 100;
  const DISCOUNT_CENTS = 500; // $5

  // Check current balance
  const { data: account, error: acctErr } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (acctErr) return json({ error: "Could not fetch account" }, 500);
  if (!account || account.points_balance < POINTS_PER_REDEMPTION) {
    return json({ error: `Not enough points. You need ${POINTS_PER_REDEMPTION} to redeem.` }, 400);
  }

  // Generate unique code
  const code = `POUR${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create discount code
  const { error: discountErr } = await admin.from("discount_codes").insert({
    code,
    type: "fixed",
    value: DISCOUNT_CENTS,
    min_order_cents: 0,
    max_uses: 1,
    use_count: 0,
    is_active: true,
    expires_at: expiresAt,
  });
  if (discountErr) return json({ error: "Failed to create discount code" }, 500);

  // Deduct points atomically
  const { error: updateErr } = await admin
    .from("loyalty_accounts")
    .update({ points_balance: account.points_balance - POINTS_PER_REDEMPTION })
    .eq("user_id", user.id)
    .eq("points_balance", account.points_balance); // optimistic concurrency

  if (updateErr) {
    // Roll back discount code
    await admin.from("discount_codes").delete().eq("code", code);
    return json({ error: "Redemption failed — please try again" }, 500);
  }

  // Record transaction
  await admin.from("loyalty_transactions").insert({
    user_id: user.id,
    points: -POINTS_PER_REDEMPTION,
    type: "redeemed",
    description: `Redeemed for $5 off — code ${code}`,
  });

  return json({ code, discount_cents: DISCOUNT_CENTS, expires_at: expiresAt });
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
