// Send-notification edge function.
// Renders an email template (looking up by `templateKey` in `email_templates`,
// substituting {{variables}}), records a row in `notifications`, then
// dispatches via Resend if RESEND_API_KEY is configured.
//
// If RESEND_API_KEY is missing the row is still written with status='queued_no_sender'
// so nothing is lost — the admin can wire a sender later and replay.
//
// CALLERS: any backend function (stripe-webhook, admin actions). Authenticated
// admin users can also invoke this directly from the dashboard for replies.

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

interface Attachment {
  filename: string;
  content: string; // base64-encoded
}

interface Body {
  templateKey?: string;
  recipient: string;
  relatedKind?: string;
  relatedId?: string;
  variables?: Record<string, string>;
  attachments?: Attachment[];
  // Free-form (no template) compose fields
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
}

const render = (template: string, vars: Record<string, string>) =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");

// Branded email wrapper — wraps any body HTML in the guest-check header.
// The logo is served from the public CDN so it renders in email clients.
function brandedEmail(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: #f0f0f0; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #222; }
  .header { background: #000; border-bottom: 3px solid #fde047; padding: 24px 32px; text-align: center; }
  .header img { height: 64px; width: auto; display: block; margin: 0 auto; }
  .check-rule { height: 2px; background: repeating-linear-gradient(90deg, #fde047 0, #fde047 8px, transparent 8px, transparent 16px); margin: 0; }
  .body { padding: 32px; color: #e8e8e8; line-height: 1.6; }
  .body a { color: #fde047; }
  .footer { padding: 16px 32px; background: #000; border-top: 1px solid #222; text-align: center; font-size: 11px; color: #555; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <img src="https://pournogravy.com/logo.webp" alt="POURnogravy" />
  </div>
  <div class="check-rule"></div>
  <div class="body">${bodyHtml}</div>
  <div class="check-rule"></div>
  <div class="footer">POURnogravy · opie@pournogravy.com · pournogravy.com</div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    // AUTH: only admins (logged-in users with profiles.is_admin = true) or
    // server-to-server callers presenting the service-role key may invoke this.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    let authorized = false;

    if (token && token === serviceKey) {
      // Server-to-server (stripe-webhook, fulfillment running with service role)
      authorized = true;
    } else if (token) {
      // Validate user JWT and check admin flag
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (!userErr && userData?.user) {
        const { data: profile } = await userClient
          .from("profiles")
          .select("is_admin")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (profile?.is_admin) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const {
      templateKey, recipient, relatedKind, relatedId, variables = {}, attachments,
      subject: freeSubject, bodyHtml: freeBodyHtml, bodyText: freeBodyText,
    } = (await req.json()) as Body;

    if (!recipient) {
      return new Response(JSON.stringify({ error: "recipient required" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!templateKey && !freeSubject) {
      return new Response(JSON.stringify({ error: "templateKey or subject required" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up template + settings in parallel (template optional for free-form sends)
    const [tplResult, { data: settings }] = await Promise.all([
      templateKey
        ? supabase.from("email_templates").select("*").eq("key", templateKey).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (templateKey && (tplResult.error || !tplResult.data)) {
      return new Response(JSON.stringify({ error: `Unknown template: ${templateKey}` }), {
        status: 404,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const tpl = tplResult.data;
    const subject = tpl ? render(tpl.subject, variables) : (freeSubject ?? "");
    const rawBodyHtml = tpl ? render(tpl.body_html, variables) : (freeBodyHtml ?? "");
    const bodyText = tpl ? render(tpl.body_text, variables) : (freeBodyText ?? "");
    // Always wrap in branded chrome unless body is already a full HTML doc
    const bodyHtml = rawBodyHtml.trimStart().startsWith("<!DOCTYPE")
      ? rawBodyHtml
      : brandedEmail(rawBodyHtml);

    // Always log the notification first (audit trail)
    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert([{
        type: "email",
        template_key: templateKey,
        recipient,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        related_kind: relatedKind ?? null,
        related_id: relatedId ?? null,
        status: "pending",
      }])
      .select("id")
      .single();

    if (insertError) throw insertError;

    const resendKey = Deno.env.get("RESEND_API_KEY");

    // No sender configured → leave queued. Admin can replay later.
    if (!resendKey) {
      await supabase
        .from("notifications")
        .update({ status: "queued_no_sender", error: "RESEND_API_KEY not configured" })
        .eq("id", notification.id);
      return new Response(
        JSON.stringify({ ok: true, queued: true, notificationId: notification.id }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const fromName = settings?.from_name ?? "POURnogravy";
    const fromEmail = settings?.from_email ?? "opie@pournogravy.com";

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [recipient],
        subject,
        html: bodyHtml,
        text: bodyText,
        ...(attachments?.length ? { attachments } : {}),
      }),
    });

    const sendBody = await sendRes.json().catch(() => ({}));

    if (!sendRes.ok) {
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          attempts: 1,
          error: typeof sendBody === "object"
            ? JSON.stringify(sendBody)
            : `HTTP ${sendRes.status}`,
        })
        .eq("id", notification.id);
      return new Response(JSON.stringify({ ok: false, error: sendBody }), {
        status: 502,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString(), attempts: 1 })
      .eq("id", notification.id);

    return new Response(
      JSON.stringify({ ok: true, notificationId: notification.id }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-notification]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
