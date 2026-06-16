// Archive fulfilled/delivered/refunded orders older than 30 days.
// Intended to run Sunday midnight via Supabase cron (service role only).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: toArchive, error: fetchErr } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["fulfilled", "delivered", "refunded"])
      .lt("created_at", cutoff);

    if (fetchErr) throw fetchErr;
    if (!toArchive || toArchive.length === 0) {
      return new Response(JSON.stringify({ ok: true, archived: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const archiveRows = toArchive.map((o) => ({ ...o, archived_at: now }));

    const { error: insertErr } = await supabase.from("order_archive").insert(archiveRows);
    if (insertErr) throw insertErr;

    const ids = toArchive.map((o) => o.id as string);
    const { error: deleteErr } = await supabase.from("orders").delete().in("id", ids);
    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ ok: true, archived: toArchive.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[archive-orders]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
