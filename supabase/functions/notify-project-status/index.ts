// notify-project-status edge function
// Sends a project update email to Opie (aopie91@gmail.com).
// Rate-limited to once per day — enforced via settings.last_status_email_at column.
// Admin-only endpoint.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPIE_EMAIL = "aopie91@gmail.com";
const RATE_LIMIT_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    // Authenticate caller — must be admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for settings read/write
    const admin = createClient(supabaseUrl, serviceKey);

    // Check rate limit
    const { data: settings } = await admin
      .from("settings")
      .select("last_status_email_at")
      .eq("id", 1)
      .maybeSingle();

    if (settings?.last_status_email_at) {
      const lastSent = new Date(settings.last_status_email_at);
      const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
      if (hoursSince < RATE_LIMIT_HOURS) {
        const nextAllowed = new Date(lastSent.getTime() + RATE_LIMIT_HOURS * 60 * 60 * 1000);
        return new Response(
          JSON.stringify({
            error: `Rate limit: one email per day. Next send allowed after ${nextAllowed.toLocaleString("en-US", { timeZone: "America/New_York" })} ET`,
            rateLimited: true,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Parse request body
    const { summary, changes } = await req.json();
    if (!summary?.trim()) {
      return new Response(JSON.stringify({ error: "summary is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "long",
      timeStyle: "short",
    });

    const changesHtml = changes?.trim()
      ? `<div style="margin-top:20px;">
          <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:0.1em;text-transform:uppercase;">What Changed</p>
          <div style="background:#1a1a1a;border-left:3px solid #fde047;padding:16px;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#e5e5e5;">${changes}</p>
          </div>
        </div>`
      : "";

    const html = `
      <div style="font-family:sans-serif;max-width:620px;margin:0 auto;background:#0f0f0f;color:#e5e5e5;border-radius:8px;overflow:hidden;">
        <div style="background:#fde047;padding:24px 28px;">
          <h1 style="margin:0 0 4px;font-size:20px;color:#0f0f0f;letter-spacing:0.15em;font-weight:900;text-transform:uppercase;">
            Pournogravy — Site Update
          </h1>
          <p style="margin:0;font-size:12px;color:#333;letter-spacing:0.08em;">${timestamp}</p>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:0.1em;text-transform:uppercase;">Summary</p>
          <p style="margin:0;font-size:16px;line-height:1.7;color:#e5e5e5;">${summary}</p>
          ${changesHtml}
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid #2a2a2a;">
            <p style="margin:0 0 16px;font-size:13px;color:#aaa;line-height:1.6;">
              Want to see the full project timeline? Log into your admin dashboard and check the Project Status tab — it shows every update from day one.
            </p>
            <a href="https://pournogravy.com/admin/project-status"
               style="display:inline-block;background:#fde047;color:#0f0f0f;font-weight:800;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:12px 24px;border-radius:4px;">
              View Full Timeline →
            </a>
          </div>
          <p style="margin:28px 0 0;font-size:11px;color:#444;line-height:1.6;">
            This update was sent by Kristin Mitchell · Aethyx · <a href="mailto:kristinmitchell@aethyx.space" style="color:#fde047;">kristinmitchell@aethyx.space</a><br>
            <em>This project uses multiple AI-assisted development tools. Dates reflect system-recognized milestones, not literal calendar hours.</em>
          </p>
        </div>
      </div>`;

    if (!resendKey) {
      // Dry-run mode — record timestamp but don't send
      await admin.from("settings").update({ last_status_email_at: new Date().toISOString() }).eq("id", 1);
      return new Response(
        JSON.stringify({ ok: true, dryRun: true, note: "RESEND_API_KEY not set — email not sent, rate limit updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: "Pournogravy Updates <opie@pournogravy.com>",
        to: [OPIE_EMAIL],
        reply_to: "kristinmitchell@aethyx.space",
        subject: `Pournogravy Site Update — ${timestamp}`,
        html,
        text: `POURNOGRAVY SITE UPDATE\n${timestamp}\n\n${summary}${changes ? `\n\nWhat Changed:\n${changes}` : ""}\n\nView full timeline: https://pournogravy.com/admin/project-status`,
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record send time
    await admin.from("settings").update({ last_status_email_at: new Date().toISOString() }).eq("id", 1);

    return new Response(
      JSON.stringify({ ok: true, sentTo: OPIE_EMAIL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[notify-project-status]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
