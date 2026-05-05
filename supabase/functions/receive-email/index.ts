// Inbound email webhook.
// Called by Cloudflare Email Worker (or any email router) when a message
// arrives at opie@pournogravy.com.
//
// Auth: x-webhook-secret header must match RECEIVE_EMAIL_SECRET env var.
// On success: stores message in inbox_messages, forwards alert to Gmail via Resend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface InboundPayload {
  from_email: string;
  from_name?: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  message_id?: string;
  in_reply_to?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("RECEIVE_EMAIL_SECRET");
    if (secret) {
      const provided = req.headers.get("x-webhook-secret");
      if (provided !== secret) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as InboundPayload;

    if (!body.from_email) {
      return new Response(JSON.stringify({ error: "from_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve thread: does in_reply_to match a known message_id?
    let threadId: string | null = null;
    if (body.in_reply_to) {
      const { data: parent } = await supabase
        .from("inbox_messages")
        .select("id, thread_id")
        .eq("message_id", body.in_reply_to)
        .maybeSingle();
      if (parent) {
        threadId = parent.thread_id ?? parent.id;
      }
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("inbox_messages")
      .insert({
        from_email:  body.from_email,
        from_name:   body.from_name  ?? null,
        subject:     body.subject    ?? "(no subject)",
        body_text:   body.body_text  ?? null,
        body_html:   body.body_html  ?? null,
        message_id:  body.message_id ?? null,
        in_reply_to: body.in_reply_to ?? null,
        thread_id:   threadId,   // null = will be set to own id below
        kind:        "inbound",
        status:      "unread",
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    // If no existing thread, the message starts its own thread
    if (!threadId) {
      await supabase
        .from("inbox_messages")
        .update({ thread_id: inserted.id })
        .eq("id", inserted.id);
    }

    // Forward alert to aopie91@gmail.com via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const preview = (body.body_text ?? "").slice(0, 300).replace(/\n/g, " ");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "POURnogravy Inbox <opie@pournogravy.com>",
          to: ["aopie91@gmail.com"],
          reply_to: body.from_email,
          subject: `📧 New message: ${body.subject ?? "(no subject)"}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#fde047;padding:16px 20px;">
                <h2 style="margin:0;font-size:16px;color:#0f0f0f;letter-spacing:0.15em;font-weight:800;">
                  NEW MESSAGE — POURNOGRAVY INBOX
                </h2>
              </div>
              <div style="padding:20px;background:#0f0f0f;color:#e5e5e5;">
                <p style="margin:0 0 4px;font-size:12px;color:#888;">From</p>
                <p style="margin:0 0 16px;">${body.from_name ? `${body.from_name} &lt;${body.from_email}&gt;` : body.from_email}</p>
                <p style="margin:0 0 4px;font-size:12px;color:#888;">Subject</p>
                <p style="margin:0 0 16px;">${body.subject ?? "(no subject)"}</p>
                <div style="background:#1a1a1a;border-left:3px solid #fde047;padding:12px 16px;border-radius:0 4px 4px 0;">
                  <p style="margin:0;white-space:pre-wrap;font-size:14px;">${preview}${preview.length === 300 ? "…" : ""}</p>
                </div>
                <p style="margin:16px 0 0;font-size:12px;color:#555;">
                  Reply from within your admin dashboard at pournogravy.com/admin/inbox
                </p>
              </div>
            </div>
          `,
          text: `New message from ${body.from_email}\nSubject: ${body.subject ?? "(no subject)"}\n\n${preview}`,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[receive-email]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
