/**
 * refresh-market-rates
 *
 * Called weekly by pg_cron (Sunday 2am UTC). Attempts to parse current USPS
 * Priority Mail commercial base rates from public sources and update the
 * shipping_market_rates table. Falls back to sending a notification email if
 * scraping fails so Kristin knows to update rates manually.
 *
 * Carriers update rates once per year (January), so most weeks this is a
 * no-op — but it verifies data is current and keeps the "last_updated" fresh.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ZONE_LABELS = [
  "Zone 1–2 (Local/West)",
  "Zone 3–4 (Central)",
  "Zone 5–6 (East/South)",
  "Zone 7–8 (Remote)",
] as const;

type ZoneLabel = typeof ZONE_LABELS[number];

interface RateRow {
  carrier: string;
  service: string;
  zone_label: ZoneLabel;
  weight_label: string;
  weight_oz: number;
  rate_cents: number;
  effective_date: string;
  source_note: string;
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

// ── Rate parsers ───────────────────────────────────────────────────────────────
// Each parser fetches a public URL and tries to extract rate data.
// Returns null if the page changed structure and parsing fails.

async function fetchUspsRates(): Promise<RateRow[] | null> {
  try {
    const res = await fetch("https://atoship.com/blog/usps-shipping-rates/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PournogravyRateBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Look for patterns like "$7.90" or "$10.50" near zone labels
    // Pattern: zones 1-2, 4, 6, 8 are confirmed anchor points in the atoship article
    const z12Match = html.match(/[Zz]one[s]?\s*1[-–]2[^$]*\$(\d+\.\d{2})/);
    const z4Match  = html.match(/[Zz]one\s*4[^$]*\$(\d+\.\d{2})/);
    const z6Match  = html.match(/[Zz]one\s*6[^$]*\$(\d+\.\d{2})/);
    const z8Match  = html.match(/[Zz]one\s*8[^$]*\$(\d+\.\d{2})/);

    if (!z12Match || !z4Match || !z6Match || !z8Match) return null;

    const z12 = Math.round(parseFloat(z12Match[1]) * 100);
    const z4  = Math.round(parseFloat(z4Match[1])  * 100);
    const z6  = Math.round(parseFloat(z6Match[1])  * 100);
    const z8  = Math.round(parseFloat(z8Match[1])  * 100);

    // Interpolate zone 3 (between z12 and z4), zone 5 (between z4 and z6), zone 7 (between z6 and z8)
    const z3 = Math.round((z12 + z4) / 2);
    const z5 = Math.round((z4 + z6) / 2);
    const z7 = Math.round((z6 + z8) / 2);

    const effectiveDate = new Date().toISOString().slice(0, 10);
    const sourceNote = `USPS Commercial Base — auto-parsed ${effectiveDate}`;

    // Extract year for source note if visible
    const yearMatch = html.match(/202\d/);
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

    return [
      { carrier: "USPS", service: "Priority Mail", zone_label: "Zone 1–2 (Local/West)", weight_label: "1 lb", weight_oz: 16, rate_cents: z12, effective_date: `${year}-01-19`, source_note: `USPS Commercial Base ${year} — zones 1-2 confirmed, auto-parsed` },
      { carrier: "USPS", service: "Priority Mail", zone_label: "Zone 3–4 (Central)",    weight_label: "1 lb", weight_oz: 16, rate_cents: z3,  effective_date: `${year}-01-19`, source_note: `USPS Commercial Base ${year} — zone 4 confirmed, zone 3 interpolated, auto-parsed` },
      { carrier: "USPS", service: "Priority Mail", zone_label: "Zone 5–6 (East/South)", weight_label: "1 lb", weight_oz: 16, rate_cents: z6,  effective_date: `${year}-01-19`, source_note: `USPS Commercial Base ${year} — zone 6 confirmed, auto-parsed` },
      { carrier: "USPS", service: "Priority Mail", zone_label: "Zone 7–8 (Remote)",     weight_label: "1 lb", weight_oz: 16, rate_cents: z8,  effective_date: `${year}-01-19`, source_note: `USPS Commercial Base ${year} — zone 8 confirmed, auto-parsed` },
    ];
  } catch {
    return null;
  }
}

async function fetchFedexRates(): Promise<RateRow[] | null> {
  try {
    const res = await fetch("https://parcelpath.com/carrier-services/fedex-ground-economy-rates/", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PournogravyRateBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Look for Zone 2, 4, 6, 8 exact rates in a rate table
    const z2Match = html.match(/[Zz]one\s*2[^$\d]*\$(\d+\.\d{2})/);
    const z4Match = html.match(/[Zz]one\s*4[^$\d]*\$(\d+\.\d{2})/);
    const z6Match = html.match(/[Zz]one\s*6[^$\d]*\$(\d+\.\d{2})/);
    const z8Match = html.match(/[Zz]one\s*8[^$\d]*\$(\d+\.\d{2})/);

    if (!z2Match || !z4Match || !z6Match || !z8Match) return null;

    const z2 = Math.round(parseFloat(z2Match[1]) * 100);
    const z4 = Math.round(parseFloat(z4Match[1]) * 100);
    const z6 = Math.round(parseFloat(z6Match[1]) * 100);
    const z8 = Math.round(parseFloat(z8Match[1]) * 100);

    const yearMatch = html.match(/202\d/);
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
    const effectiveDate = `${year}-01-05`;

    return [
      { carrier: "FedEx", service: "Ground Economy", zone_label: "Zone 1–2 (Local/West)", weight_label: "1 lb", weight_oz: 16, rate_cents: z2, effective_date: effectiveDate, source_note: `FedEx Ground Economy ${year} — Zone 2 exact, auto-parsed` },
      { carrier: "FedEx", service: "Ground Economy", zone_label: "Zone 3–4 (Central)",    weight_label: "1 lb", weight_oz: 16, rate_cents: z4, effective_date: effectiveDate, source_note: `FedEx Ground Economy ${year} — Zone 4 exact, auto-parsed` },
      { carrier: "FedEx", service: "Ground Economy", zone_label: "Zone 5–6 (East/South)", weight_label: "1 lb", weight_oz: 16, rate_cents: z6, effective_date: effectiveDate, source_note: `FedEx Ground Economy ${year} — Zone 6 exact, auto-parsed` },
      { carrier: "FedEx", service: "Ground Economy", zone_label: "Zone 7–8 (Remote)",     weight_label: "1 lb", weight_oz: 16, rate_cents: z8, effective_date: effectiveDate, source_note: `FedEx Ground Economy ${year} — Zone 8 exact, auto-parsed` },
    ];
  } catch {
    return null;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const results: string[] = [];

    // ── Attempt USPS parse ──
    const uspsRates = await fetchUspsRates();
    if (uspsRates) {
      for (const r of uspsRates) {
        await supabase.from("shipping_market_rates")
          .update({ rate_cents: r.rate_cents, source_note: r.source_note, effective_date: r.effective_date, last_updated: new Date().toISOString() })
          .eq("carrier", "USPS")
          .eq("zone_label", r.zone_label);
      }
      results.push(`✅ USPS: updated ${uspsRates.length} zone rates`);
    } else {
      results.push("⚠️ USPS: parse failed — rates unchanged, manual check recommended");
    }

    // ── Attempt FedEx parse ──
    const fedexRates = await fetchFedexRates();
    if (fedexRates) {
      for (const r of fedexRates) {
        await supabase.from("shipping_market_rates")
          .update({ rate_cents: r.rate_cents, source_note: r.source_note, effective_date: r.effective_date, last_updated: new Date().toISOString() })
          .eq("carrier", "FedEx")
          .eq("zone_label", r.zone_label);
      }
      results.push(`✅ FedEx: updated ${fedexRates.length} zone rates`);
    } else {
      results.push("⚠️ FedEx: parse failed — rates unchanged, manual check recommended");
    }

    // UPS doesn't have a reliable scrapeable source — just update last_updated timestamp
    // so the UI shows it was checked, and flag if it's been 365+ days since effective_date
    const { data: upsRow } = await supabase
      .from("shipping_market_rates")
      .select("effective_date")
      .eq("carrier", "UPS")
      .limit(1)
      .maybeSingle();

    const upsAgeDays = upsRow
      ? Math.floor((Date.now() - new Date(upsRow.effective_date).getTime()) / 86_400_000)
      : 999;

    await supabase.from("shipping_market_rates")
      .update({ last_updated: new Date().toISOString() })
      .eq("carrier", "UPS");

    if (upsAgeDays > 300) {
      results.push(`⚠️ UPS: rates are ${upsAgeDays} days old — verify against ups.com/rates and update manually if January has passed`);
    } else {
      results.push(`✅ UPS: rates current (${upsAgeDays} days old)`);
    }

    // ── Send summary email if anything needs attention ──
    const hasWarnings = results.some((r) => r.startsWith("⚠️"));
    if (hasWarnings) {
      const { data: settings } = await supabase
        .from("settings")
        .select("from_email")
        .eq("id", 1)
        .maybeSingle();

      await supabase.functions.invoke("send-notification", {
        body: {
          templateKey: "admin_alert",
          to: "kmitch2087@gmail.com",
          variables: {
            subject: "⚠️ POURnogravy: shipping rate auto-refresh needs attention",
            message: [
              "Weekly shipping rate refresh ran. Some sources couldn't be parsed:",
              "",
              ...results,
              "",
              "Go to pournogravy.com/admin → Settings → Fulfillment → Shipping Zones to verify and update manually if needed.",
              "",
              "Rate sources:",
              "• USPS: https://atoship.com/blog/usps-shipping-rates-2026",
              "• FedEx: https://parcelpath.com/carrier-services/fedex-ground-economy-rates/",
              "• UPS: https://www.ups.com/us/en/support/shipping-support/shipping-costs-rates.page",
            ].join("\n"),
          },
        },
      }).catch(() => {}); // don't fail the function if notification fails
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[refresh-market-rates]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
