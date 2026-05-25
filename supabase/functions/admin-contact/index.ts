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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { message, fromPage } = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      return new Response(
        JSON.stringify({ ok: true, queued: true, note: "RESEND_API_KEY not configured" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const senderEmail = userData.user.email ?? "the admin";
    const pageLabel = fromPage ? ` · Page: ${fromPage}` : "";
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#e5e5e5;border-radius:8px;overflow:hidden;">
        <div style="background:#fde047;padding:20px 24px;">
          <h2 style="margin:0;font-size:18px;color:#0f0f0f;letter-spacing:0.15em;font-weight:800;">
            POURNOGRAVY — ADMIN HELP REQUEST
          </h2>
          <p style="margin:6px 0 0;font-size:12px;color:#333;letter-spacing:0.1em;">${timestamp} ET${pageLabel}</p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:0.1em;text-transform:uppercase;">From</p>
          <p style="margin:0 0 20px;font-size:14px;color:#e5e5e5;">${senderEmail}</p>
          <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:0.1em;text-transform:uppercase;">Message</p>
          <div style="background:#1a1a1a;border-left:3px solid #fde047;padding:16px;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:#555;">
            Reply to this email to respond to ${senderEmail}.
          </p>
        </div>
      </div>
    `;

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "POURnogravy Admin <opie@pournogravy.com>",
        to: ["kristinmitchell@aethyx.space"],
        reply_to: senderEmail,
        subject: `Admin Help Request — ${timestamp}`,
        html,
        text: `POURNOGRAVY ADMIN HELP REQUEST\n${timestamp}${pageLabel}\nFrom: ${senderEmail}\n\n${message}`,
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 502,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[admin-contact]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
