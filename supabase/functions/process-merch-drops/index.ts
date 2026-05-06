/**
 * process-merch-drops
 * ───────────────────
 * Called manually from the admin dashboard OR wired to a scheduled trigger.
 *
 * 1. Finds SCHEDULED drops whose drop date has passed → flips to ACTIVE,
 *    sets all linked products to is_active = true.
 * 2. Finds ACTIVE drops whose ad_launch_at has passed and email_sent = false
 *    → sends the branded marketing email, marks email_sent = true.
 *
 * Wire this to a schedule via:
 *   - Supabase pg_cron (Pro plan): SELECT cron.schedule('process-drops', '* * * * *', $$SELECT net.http_post(...)$$);
 *   - OR a Cloudflare Scheduled Worker that invokes this function.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req) => {
  // Allow CORS for manual invocation from admin dashboard
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date().toISOString();
  const log: string[] = [];

  try {
    // ── 1. Auto-publish scheduled drops ──────────────────
    const { data: dueDrops, error: dueErr } = await supabase
      .from("merch_drops")
      .select("id, name")
      .eq("status", "scheduled")
      .lte("scheduled_drop_at", now);

    if (dueErr) throw dueErr;

    for (const drop of dueDrops ?? []) {
      // Flip drop status
      await supabase.from("merch_drops").update({ status: "active" }).eq("id", drop.id);

      // Activate all products in this drop
      const { data: dropProducts } = await supabase
        .from("merch_drop_products")
        .select("product_id")
        .eq("drop_id", drop.id);

      if (dropProducts && dropProducts.length > 0) {
        const productIds = dropProducts.map((r: { product_id: string }) => r.product_id);
        await supabase.from("products").update({ is_active: true, status: "active" }).in("id", productIds);
      }

      log.push(`✅ Activated drop: "${drop.name}" + ${dropProducts?.length ?? 0} products`);
    }

    // ── 2. Send pending marketing emails ─────────────────
    const { data: emailDue, error: emailErr } = await supabase
      .from("merch_drops")
      .select("*")
      .in("status", ["active", "scheduled"])
      .eq("email_sent", false)
      .lte("ad_launch_at", now)
      .not("ad_launch_at", "is", null);

    if (emailErr) throw emailErr;

    for (const drop of emailDue ?? []) {
      const sent = await sendDropEmail(drop, RESEND_API_KEY);
      if (sent) {
        await supabase.from("merch_drops").update({ email_sent: true }).eq("id", drop.id);
        log.push(`📧 Email sent for drop: "${drop.name}"`);
      } else {
        log.push(`⚠️  Email FAILED for drop: "${drop.name}"`);
      }
    }

    return new Response(JSON.stringify({ ok: true, log }), {
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});

async function sendDropEmail(drop: Record<string, unknown>, apiKey: string): Promise<boolean> {
  try {
    const subject = (drop.email_subject as string) || `🍺 Something's dropping. Staff meeting. You're invited.`;
    const html = buildDropEmailHtml(drop);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "POURnogravy <opie@pournogravy.com>",
        to:   ["kmitch2087@gmail.com"], // TODO: replace with subscriber list query
        subject,
        html,
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

function buildDropEmailHtml(drop: Record<string, unknown>): string {
  const name       = drop.name as string;
  const blurb      = drop.email_blurb as string | null;
  const flyerUrl   = drop.flyer_url as string | null;
  const dropDate   = drop.scheduled_drop_at as string;
  const formattedDate = new Date(dropDate).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const flyerSection = flyerUrl
    ? `<img src="${flyerUrl}" alt="${name}" style="width:100%;max-width:560px;border-radius:6px;display:block;margin:24px auto;" />`
    : `
      <div style="background:#111;border:1px solid #333;border-radius:6px;padding:40px 24px;text-align:center;margin:24px 0;">
        <p style="font-family:'Courier New',monospace;color:#fde047;font-size:24px;letter-spacing:4px;margin:0 0 8px;">
          ${name.toUpperCase()}
        </p>
        <p style="color:#666;font-size:13px;margin:0;">Dropping ${formattedDate}</p>
      </div>
    `;

  const blurbSection = blurb
    ? `<p style="font-family:Georgia,serif;color:#ccc;font-size:15px;line-height:1.7;margin:24px 0;">${blurb}</p>`
    : `<p style="font-family:Georgia,serif;color:#ccc;font-size:15px;line-height:1.7;margin:24px 0;">
        Look, we don't do this for just anyone. But you've been on this list long enough to deserve the heads up before the rest of the world finds out. Something limited is landing. Supplies are tight, the window is short, and the regulars are already circling. Don't say we didn't tell you.
      </p>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${name}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="100%" style="max-width:600px;background:#111;border-radius:8px;overflow:hidden;border:1px solid #222;">

        <!-- Header bar -->
        <tr>
          <td style="background:#ff1744;padding:0;height:4px;"></td>
        </tr>

        <!-- Logo -->
        <tr>
          <td align="center" style="padding:32px 24px 16px;border-bottom:1px solid #222;">
            <p style="margin:0;font-family:'Courier New',monospace;font-size:28px;font-weight:900;letter-spacing:6px;color:#fff;text-transform:uppercase;">
              POUR<span style="color:#fde047;">nogravy</span>
            </p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:4px;color:#555;text-transform:uppercase;">
              bartender-grade apparel
            </p>
          </td>
        </tr>

        <!-- Pre-Shift Meeting header -->
        <tr>
          <td align="center" style="padding:32px 24px 8px;">
            <p style="margin:0;font-size:11px;letter-spacing:3px;color:#555;text-transform:uppercase;font-family:sans-serif;">
              🍺 &nbsp; incoming transmission &nbsp; 🍺
            </p>
            <h1 style="
              margin: 12px 0 4px;
              font-size: 38px;
              color: #ff1744;
              font-family: 'Permanent Marker', 'Comic Sans MS', cursive;
              text-shadow: 0 0 20px rgba(255,23,68,0.5);
              letter-spacing: 2px;
              line-height: 1.1;
            ">Pre-Shift Meeting</h1>
            <p style="margin:0;font-size:11px;letter-spacing:3px;color:#555;text-transform:uppercase;">
              listen up — this one's important
            </p>
          </td>
        </tr>

        <!-- Drop name -->
        <tr>
          <td align="center" style="padding:8px 24px 0;">
            <h2 style="margin:0;font-family:'Courier New',monospace;font-size:20px;letter-spacing:4px;color:#fde047;text-transform:uppercase;">
              ${name.toUpperCase()}
            </h2>
          </td>
        </tr>

        <!-- Blurb -->
        <tr>
          <td style="padding:0 32px;">
            ${blurbSection}
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 32px;">
            <div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div>
          </td>
        </tr>

        <!-- Flyer or auto graphic -->
        <tr>
          <td style="padding:24px 32px 0;">
            ${flyerSection}
          </td>
        </tr>

        <!-- Drop date teaser -->
        <tr>
          <td align="center" style="padding:24px 32px;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#555;text-transform:uppercase;">dropping</p>
            <p style="margin:0;font-family:'Courier New',monospace;font-size:18px;color:#fff;letter-spacing:2px;">${formattedDate}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#666;">
              Supplies are limited. First come, first served. No rain checks.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:8px 32px 32px;">
            <a href="https://pournogravy.com/shop"
               style="display:inline-block;background:#fde047;color:#000;font-family:'Courier New',monospace;font-size:13px;font-weight:900;letter-spacing:4px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:2px;">
              SHOP NOW →
            </a>
          </td>
        </tr>

        <!-- Footer bar -->
        <tr>
          <td style="background:#ff1744;padding:0;height:2px;"></td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px;border-top:1px solid #1a1a1a;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;color:#444;text-transform:uppercase;">
              POURnogravy · pournogravy.com
            </p>
            <p style="margin:0;font-size:10px;color:#333;">
              You're on this list because you have taste. Or you signed up drunk. Either way, welcome.
            </p>
            <p style="margin:8px 0 0;font-size:10px;color:#2a2a2a;">
              <a href="https://pournogravy.com" style="color:#333;text-decoration:none;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
