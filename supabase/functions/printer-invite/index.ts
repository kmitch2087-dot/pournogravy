// printer-invite edge function.
// Ensures the printer's Supabase Auth user exists and emails them a branded
// "create your password" link for the /printer catalog portal.
//
// AUTH: caller must be an admin (valid JWT + profiles.is_admin) OR present
// x-invite-secret matching the PRINTER_INVITE_SECRET function secret.
// Never callable anonymously.
//
// Delivery: generates a Supabase action link (invite for a new user, recovery
// for an existing one) that redirects to <SITE>/printer/set-password, then
// dispatches it through the existing branded send-notification function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE = "https://pournogravy.com";
const SUPPORT_EMAIL = "kristinmitchell@aethyx.space";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info, x-invite-secret",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function inviteBody(actionLink: string, printerName: string): string {
  return `
    <h1 style="font-family:system-ui,sans-serif;font-size:22px;letter-spacing:.04em;color:#fde047;margin:0 0 8px;">
      YOUR PRINT-FILE PORTAL IS READY
    </h1>
    <p style="margin:0 0 16px;">Hi ${printerName || "there"},</p>
    <p style="margin:0 0 16px;">
      POURnogravy has set up a private portal where you can access the <strong>entire catalog</strong>
      of print-ready graphics any time. Tap below to create your password and get in.
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${actionLink}"
         style="display:inline-block;background:#fde047;color:#000;font-weight:700;
                font-family:system-ui,sans-serif;letter-spacing:.06em;text-decoration:none;
                padding:14px 28px;border-radius:4px;">
        CREATE YOUR PASSWORD
      </a>
    </p>
    <div style="border-top:1px solid #333;margin:24px 0 0;padding-top:18px;font-size:13px;color:#bdbdbd;line-height:1.7;">
      <p style="margin:0 0 10px;">
        <strong style="color:#e8e8e8;">This portal is a backup.</strong> You should receive the print files
        as links in every order email &mdash; that's your primary source for each job.
      </p>
      <p style="margin:0 0 10px;">
        If you ever have trouble with an order's files, email
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#fde047;">${SUPPORT_EMAIL}</a>.
      </p>
      <p style="margin:0;">
        In the meantime you'll always have access to the whole catalog of graphics right here in the portal.
      </p>
    </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const inviteSecret = Deno.env.get("PRINTER_INVITE_SECRET") ?? "";

    // ── AuthZ: admin JWT or shared invite secret ──
    let authorized = false;
    const providedSecret = req.headers.get("x-invite-secret") ?? "";
    if (inviteSecret && providedSecret && providedSecret === inviteSecret) {
      authorized = true;
    } else {
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (token && token === serviceKey) {
        authorized = true;
      } else if (token) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData } = await userClient.auth.getUser();
        if (userData?.user) {
          const { data: profile } = await userClient
            .from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle();
          if (profile?.is_admin) authorized = true;
        }
      }
    }
    if (!authorized) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve target: the configured printer (settings.printer_email) unless overridden.
    const bodyIn = (await req.json().catch(() => ({}))) as { email?: string };
    const { data: settings } = await admin
      .from("settings").select("printer_email, printer_name").eq("id", 1).maybeSingle();
    const email = (bodyIn.email ?? settings?.printer_email ?? "").trim().toLowerCase();
    const printerName = settings?.printer_name ?? "";
    if (!email) return json({ error: "No printer email configured" }, 400);

    // Keep the allowlist in sync so is_printer() will pass for this email.
    await admin.from("printer_allowlist").upsert({ email }, { onConflict: "email" });

    const redirectTo = `${SITE}/printer/set-password`;

    // New user -> invite link (creates the user). Existing user -> recovery link.
    let actionLink: string | null = null;
    const invite = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });
    if (!invite.error && invite.data?.properties?.action_link) {
      actionLink = invite.data.properties.action_link;
    } else {
      const recovery = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      if (recovery.error || !recovery.data?.properties?.action_link) {
        return json({ error: `Could not generate link: ${recovery.error?.message ?? invite.error?.message}` }, 500);
      }
      actionLink = recovery.data.properties.action_link;
    }

    // Dispatch through the branded send-notification function (service-to-service).
    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        recipient: email,
        subject: "Your Pournogravy print-file portal access",
        bodyHtml: inviteBody(actionLink, printerName),
        relatedKind: "printer_invite",
      }),
    });
    const sendBody = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) return json({ error: "send-notification failed", detail: sendBody }, 502);

    return json({ ok: true, email, sent: sendBody });
  } catch (err) {
    console.error("[printer-invite]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
