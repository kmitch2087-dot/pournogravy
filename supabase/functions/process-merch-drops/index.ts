/**
 * process-merch-drops
 * ───────────────────
 * Called manually from the admin dashboard OR wired to a pg_cron schedule.
 *
 * Case 1: Products with publish_at <= now and is_active = false → flip live.
 * Case 2: Merch drops whose scheduled_drop_at <= now and status = 'scheduled'
 *         → flip to 'active', activate all linked products.
 * Case 3: Active/scheduled drops whose ad_launch_at has passed and email_sent = false
 *         → send the branded marketing email, mark email_sent = true + email_sent_at = now.
 * Case 4: Scheduled drops 6–8 days out (or ad_launch_at passed) with no email_sent_at
 *         → send advance-notice email blast to subscribers.
 *
 * Wire to a schedule via:
 *   SELECT cron.schedule('process-merch-drops', '*\/5 * * * *',
 *     $$SELECT net.http_post(url := 'https://<ref>.supabase.co/functions/v1/process-merch-drops',
 *                            headers := '{"Content-Type":"application/json"}'::jsonb,
 *                            body := '{}'::jsonb)$$);
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date().toISOString();
  const log: string[] = [];

  try {
    // ── Case 1: Auto-publish products with publish_at <= now ─────────────────
    const { data: scheduledProducts } = await supabase
      .from("products")
      .select("id, name")
      .lte("publish_at", now)
      .eq("is_active", false)
      .not("publish_at", "is", null);

    for (const product of scheduledProducts ?? []) {
      const { error } = await supabase.from("products").update({
        is_active: true,
        published: true,
        status: "published",
        publish_at: null,
        went_live_at: now,
      }).eq("id", product.id);
      if (!error) {
        log.push(`✅ Scheduled product activated: "${product.name}"`);
      } else {
        log.push(`⚠️  Failed to activate product "${product.name}": ${error.message}`);
      }
    }

    // ── Case 2: Auto-publish scheduled drops whose drop date has passed ──────
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
        await supabase.from("products").update({
          is_active: true,
          published: true,
          status: "published",
          went_live_at: now,
        }).in("id", productIds);
      }

      log.push(`✅ Activated drop: "${drop.name}" + ${dropProducts?.length ?? 0} products`);
    }

    // ── Case 3: Send pending marketing emails (ad_launch_at passed, not sent) ─
    const { data: emailDue, error: emailErr } = await supabase
      .from("merch_drops")
      .select("*")
      .in("status", ["active", "scheduled"])
      .eq("email_sent", false)
      .lte("ad_launch_at", now)
      .not("ad_launch_at", "is", null);

    if (emailErr) throw emailErr;

    for (const drop of emailDue ?? []) {
      const subscribers = await getSubscribers(supabase);
      const sent = await sendDropEmail(drop, RESEND_API_KEY, subscribers);
      if (sent) {
        await supabase.from("merch_drops").update({
          email_sent: true,
          email_sent_at: now,
        }).eq("id", drop.id);
        log.push(`📧 Email sent for drop: "${drop.name}" (${subscribers.length} subscribers)`);
      } else {
        log.push(`⚠️  Email FAILED for drop: "${drop.name}"`);
      }
    }

    // ── Case 4: Advance-notice blast for upcoming drops (6–8 days out) ───────
    const sixDays   = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    const eightDays = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();

    const { data: upcomingDrops } = await supabase
      .from("merch_drops")
      .select("id, name, scheduled_drop_at, ad_launch_at, email_sent_at")
      .eq("status", "scheduled")
      .is("email_sent_at", null)
      .gte("scheduled_drop_at", sixDays)
      .lte("scheduled_drop_at", eightDays);

    // Also check drops whose ad_launch_at has passed but haven't had an advance email yet
    const { data: adLaunchDrops } = await supabase
      .from("merch_drops")
      .select("id, name, scheduled_drop_at, ad_launch_at, email_sent_at")
      .eq("status", "scheduled")
      .is("email_sent_at", null)
      .lte("ad_launch_at", now)
      .not("ad_launch_at", "is", null);

    // Deduplicate by id
    const advanceMap = new Map<string, Record<string, unknown>>();
    for (const d of [...(upcomingDrops ?? []), ...(adLaunchDrops ?? [])]) {
      if (!advanceMap.has(d.id)) advanceMap.set(d.id, d as Record<string, unknown>);
    }

    if (advanceMap.size > 0 && RESEND_API_KEY) {
      const subscribers = await getSubscribers(supabase);

      for (const drop of advanceMap.values()) {
        const dropDateStr = drop.scheduled_drop_at as string | null;
        const dropDate = dropDateStr
          ? new Date(dropDateStr).toLocaleDateString("en-US", { month: "long", day: "numeric" })
          : "soon";

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "POURnogravy <opie@pournogravy.com>",
            to: subscribers.length > 0 ? subscribers : ["kmitch2087@gmail.com"],
            subject: `New drop incoming: ${(drop.name as string) ?? "Something big"} — ${dropDate}`,
            html: buildDropEmailHtml(drop),
          }),
        });

        if (res.ok) {
          await supabase.from("merch_drops").update({ email_sent_at: now }).eq("id", drop.id as string);
          log.push(`📧 Advance blast sent for drop "${drop.name as string}" (${subscribers.length} subscribers)`);
        } else {
          log.push(`⚠️  Advance blast FAILED for drop "${drop.name as string}"`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, log }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSubscribers(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("email_subscribers")
      .select("email")
      .eq("active", true);
    return (data ?? []).map((s: { email: string }) => s.email).filter(Boolean);
  } catch {
    return [];
  }
}

async function sendDropEmail(
  drop: Record<string, unknown>,
  apiKey: string,
  subscribers: string[],
): Promise<boolean> {
  try {
    const subject = (drop.email_subject as string) || `🍺 Something's dropping. Staff meeting. You're invited.`;
    const html = buildDropEmailHtml(drop);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "POURnogravy <opie@pournogravy.com>",
        to: subscribers.length > 0 ? subscribers : ["kmitch2087@gmail.com"],
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
  const dropDate   = drop.scheduled_drop_at as string | null;
  const formattedDate = dropDate
    ? new Date(dropDate).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "soon";

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

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}
