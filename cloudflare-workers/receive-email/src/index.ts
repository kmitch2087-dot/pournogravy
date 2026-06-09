/**
 * Cloudflare Email Worker — pournogravy-receive-email
 *
 * Triggered by Cloudflare Email Routing when mail arrives at opie@pournogravy.com.
 * Parses the raw MIME message with postal-mime, then POSTs structured data to the
 * Supabase receive-email edge function which stores the message and forwards a
 * notification alert to aopie91@gmail.com.
 *
 * Deploy:
 *   cd cloudflare-workers/receive-email
 *   npm install
 *   npx wrangler secret put SUPABASE_URL        # e.g. https://emtjkawcmsfgjyimnncf.supabase.co
 *   npx wrangler secret put RECEIVE_EMAIL_SECRET # any strong random string — set same in Supabase
 *   npx wrangler deploy
 *
 * Then in Cloudflare Dashboard → Email → Email Routing → Routes:
 *   opie@pournogravy.com  →  Worker  →  pournogravy-receive-email
 */

import PostalMime from "postal-mime";

interface Env {
  SUPABASE_URL: string;
  RECEIVE_EMAIL_SECRET: string;
}

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    // Collect the raw email bytes
    const rawBytes = await new Response(message.raw).arrayBuffer();

    // Parse MIME
    const parser = new PostalMime();
    const parsed = await parser.parse(rawBytes);

    const payload = {
      from_email: message.from,
      from_name:  parsed.from?.name ?? null,
      subject:    parsed.subject    ?? "(no subject)",
      body_text:  parsed.text       ?? null,
      body_html:  parsed.html       ?? null,
      message_id: parsed.messageId  ?? null,
      in_reply_to: parsed.inReplyTo ?? null,
    };

    const supabaseUrl = env.SUPABASE_URL;
    const secret      = env.RECEIVE_EMAIL_SECRET;

    if (!supabaseUrl) {
      console.error("[receive-email worker] SUPABASE_URL secret not set — dropping message");
      return;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/receive-email`, {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-webhook-secret": secret ?? "",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "(no body)");
      console.error(
        `[receive-email worker] Supabase returned ${res.status}: ${errText}`,
      );
      // Don't throw — Cloudflare would retry, potentially causing duplicates.
      // The edge function has upsert protection via message_id uniqueness.
    } else {
      console.log(`[receive-email worker] Stored message from ${message.from}`);
    }
  },
};
