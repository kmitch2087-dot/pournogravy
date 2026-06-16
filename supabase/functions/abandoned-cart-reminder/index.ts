// Abandoned cart reminder edge function.
// Finds auth users whose cart items have not been updated in > 1 hour,
// then sends them the 'abandoned_cart' email via send-notification.
//
// SCHEDULING (pg_cron):
//   Run this function every hour from Supabase pg_cron or from Supabase
//   scheduled functions once that feature is GA.
//
//   Example pg_cron SQL (run in Supabase SQL editor):
//     select cron.schedule(
//       'abandoned-cart-hourly',
//       '0 * * * *',
//       $$
//       select net.http_post(
//         url     => '<YOUR_FUNCTION_URL>/abandoned-cart-reminder',
//         headers => '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
//         body    => '{}'::jsonb
//       );
//       $$
//     );
//
//   Replace <YOUR_FUNCTION_URL> and <SERVICE_ROLE_KEY> with actual values.
//   The function URL is available in Supabase dashboard → Edge Functions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://pournogravy.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Only allow service-role callers (pg_cron or admin trigger)
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Find carts idle for > 1 hour with an authenticated user
  const { data: staleCarts, error } = await supabase
    .from("cart_items")
    .select("user_id, product_slug, size, quantity, variant_id, color_id, last_updated_at")
    .not("user_id", "is", null)
    .lt("last_updated_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if (error) {
    console.error("[abandoned-cart] query error", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!staleCarts?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  // Group by user_id
  const byUser = new Map<string, typeof staleCarts>();
  for (const row of staleCarts) {
    const uid = row.user_id as string;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(row);
  }

  let sent = 0;
  const errors: string[] = [];

  for (const [userId, cartRows] of byUser) {
    // Get user email from auth.users via admin API
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
    if (userErr || !userData?.user?.email) {
      errors.push(`user ${userId}: ${userErr?.message ?? "no email"}`);
      continue;
    }

    const email = userData.user.email;

    // Build plain-text item list for the email
    const itemsList = cartRows
      .map((r) => {
        const parts = [`${r.product_slug}`, `Size: ${r.size}`, `Qty: ${r.quantity}`];
        if (r.variant_id) parts.push(`Fit: ${r.variant_id}`);
        if (r.color_id)   parts.push(`Color: ${r.color_id}`);
        return `  • ${parts.join(" | ")}`;
      })
      .join("\n");

    const { error: sendErr } = await supabase.functions.invoke("send-notification", {
      body: {
        templateKey: "abandoned_cart",
        recipient: email,
        relatedKind: "user",
        relatedId: userId,
        variables: {
          items: itemsList,
          site_url: SITE_URL,
        },
      },
    });

    if (sendErr) {
      errors.push(`${email}: ${sendErr.message}`);
    } else {
      sent++;
    }
  }

  console.log(`[abandoned-cart] sent=${sent} errors=${errors.length}`);

  return new Response(
    JSON.stringify({ ok: true, processed: byUser.size, sent, errors }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
