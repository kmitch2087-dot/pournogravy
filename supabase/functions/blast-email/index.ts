// blast-email edge function
// Sends a template email to every email_subscriber.
// Auth: caller must be an admin user (is_admin = true in profiles).
// Body: { templateKey: string; subject?: string; variables?: Record<string, string> }
// Returns: { sent: number; failed: number; errors: string[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth: must be an admin ────────────────────────────────────────────
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const svcClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await svcClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: CORS });

    // ── Parse body ────────────────────────────────────────────────────────
    const { templateKey, subject, variables = {} } = await req.json() as {
      templateKey: string;
      subject?: string;
      variables?: Record<string, string>;
    };
    if (!templateKey) {
      return new Response(JSON.stringify({ error: "templateKey required" }), { status: 400, headers: CORS });
    }

    // ── Fetch all subscribers ─────────────────────────────────────────────
    const { data: subscribers, error: subErr } = await svcClient
      .from("email_subscribers")
      .select("email");
    if (subErr) throw subErr;
    const emails = (subscribers ?? []).map((s: { email: string }) => s.email).filter(Boolean);
    if (emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, errors: [] }), { headers: CORS });
    }

    // ── Send to each subscriber via send-notification ─────────────────────
    const sendNotificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        const res = await fetch(sendNotificationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            templateKey,
            recipient: email,
            variables: { ...variables, ...(subject ? { subject_override: subject } : {}) },
          }),
        });
        if (res.ok) {
          sent++;
        } else {
          const body = await res.text();
          errors.push(`${email}: ${body}`);
          failed++;
        }
      } catch (err) {
        errors.push(`${email}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
      // Respect Resend rate limits (~10 req/s; 100ms keeps us at 10/s)
      await delay(100);
    }

    return new Response(JSON.stringify({ sent, failed, errors }), { headers: CORS });
  } catch (err) {
    console.error("blast-email error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: CORS },
    );
  }
});
