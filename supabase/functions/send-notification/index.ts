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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  templateKey: string;
  recipient: string;
  relatedKind?: string;
  relatedId?: string;
  variables?: Record<string, string>;
}

const render = (template: string, vars: Record<string, string>) =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { templateKey, recipient, relatedKind, relatedId, variables = {} } =
      (await req.json()) as Body;

    if (!templateKey || !recipient) {
      return new Response(JSON.stringify({ error: "templateKey and recipient required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up template + settings in parallel
    const [{ data: tpl, error: tplError }, { data: settings }] = await Promise.all([
      supabase.from("email_templates").select("*").eq("key", templateKey).maybeSingle(),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (tplError || !tpl) {
      return new Response(JSON.stringify({ error: `Unknown template: ${templateKey}` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = render(tpl.subject, variables);
    const bodyHtml = render(tpl.body_html, variables);
    const bodyText = render(tpl.body_text, variables);

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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString(), attempts: 1 })
      .eq("id", notification.id);

    return new Response(
      JSON.stringify({ ok: true, notificationId: notification.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-notification]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
