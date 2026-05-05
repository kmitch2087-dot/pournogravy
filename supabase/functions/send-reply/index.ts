// Send a reply from opie@pournogravy.com via Resend.
// Stores a copy in inbox_messages (kind='reply') and marks the parent as 'replied'.
// Auth: admin JWT required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  to: string;
  subject: string;
  body: string;
  threadId: string;
  parentId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey    = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token      = authHeader.replace(/^Bearer\s+/i, "");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await userClient
      .from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, body, threadId, parentId } = (await req.json()) as Body;
    if (!to || !body?.trim()) {
      return new Response(JSON.stringify({ error: "to and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the original message_id so we can set In-Reply-To correctly
    const { data: parent } = await supabase
      .from("inbox_messages")
      .select("message_id")
      .eq("id", parentId)
      .maybeSingle();

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222;">
        <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;">${body}</div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;">
          Sent from POURnogravy — pournogravy.com
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
        from: "Opie — POURnogravy <opie@pournogravy.com>",
        to: [to],
        subject,
        html: htmlBody,
        text: `${body}\n\n---\nSent from POURnogravy — pournogravy.com`,
        headers: parent?.message_id
          ? { "In-Reply-To": parent.message_id, References: parent.message_id }
          : undefined,
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store reply copy and mark parent as replied
    await Promise.all([
      supabase.from("inbox_messages").insert({
        from_email: "opie@pournogravy.com",
        from_name:  "Opie — POURnogravy",
        subject,
        body_text:  body,
        body_html:  htmlBody,
        thread_id:  threadId,
        parent_id:  parentId,
        kind:       "reply",
        status:     "read",
      }),
      supabase.from("inbox_messages")
        .update({ status: "replied" })
        .eq("id", parentId),
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-reply]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
