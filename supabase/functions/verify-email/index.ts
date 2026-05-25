// Public endpoint that validates an email address: syntax, disposable-domain
// blocklist, common-typo suggestion, and a live MX lookup via Cloudflare DNS.
// Called from the public custom-request form, so no JWT is required.
function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const SYNTAX_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A small but representative list of disposable / throwaway providers. Not
// exhaustive — combined with the MX check it catches the overwhelming
// majority of fake addresses.
const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "yopmail.com",
  "tempmail.com", "temp-mail.org", "throwawaymail.com", "trashmail.com",
  "getnada.com", "fakeinbox.com", "sharklasers.com", "maildrop.cc",
  "dispostable.com", "mintemail.com", "mailnesia.com", "mohmal.com",
  "spambog.com", "spam4.me", "trbvm.com", "tempr.email", "emailondeck.com",
  "33mail.com", "anonbox.net", "mailcatch.com", "mytemp.email", "burnermail.io",
  "discard.email", "inboxbear.com", "tempinbox.com", "mailpoof.com",
]);

// Frequent typos → corrected domain. Adding more here is cheap.
const TYPO_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "yaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotnail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "iclould.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.co": "icloud.com",
  "aol.co": "aol.com",
};

// Naive in-memory throttle keyed by client IP. Resets when the function
// instance is recycled — good enough to stop casual abuse.
const HITS = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = HITS.get(ip);
  if (!entry || entry.resetAt < now) {
    HITS.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`;
    const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
    if (!res.ok) return true; // fail-open if DNS service is down — don't block real users
    const data = await res.json();
    // Status 0 = NOERROR. Answer present = MX exists.
    if (data?.Status === 0 && Array.isArray(data?.Answer) && data.Answer.length > 0) {
      return true;
    }
    // Some domains accept mail on the A record if no MX is set — check A as fallback.
    const aRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      { headers: { Accept: "application/dns-json" } },
    );
    if (!aRes.ok) return true;
    const aData = await aRes.json();
    return aData?.Status === 0 && Array.isArray(aData?.Answer) && aData.Answer.length > 0;
  } catch (_err) {
    // Network glitch — don't punish the user, let the DB-level check be the backstop.
    return true;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, reason: "method" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ ok: false, reason: "rate_limited" }), {
      status: 429,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const raw = (body.email ?? "").trim().toLowerCase();

  if (!raw || raw.length > 255 || !SYNTAX_RE.test(raw)) {
    return new Response(JSON.stringify({ ok: false, reason: "syntax" }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const domain = raw.split("@")[1];

  if (TYPO_FIXES[domain]) {
    const local = raw.split("@")[0];
    return new Response(
      JSON.stringify({
        ok: false,
        reason: "typo",
        suggestion: `${local}@${TYPO_FIXES[domain]}`,
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return new Response(JSON.stringify({ ok: false, reason: "disposable" }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const mxOk = await hasMxRecord(domain);
  if (!mxOk) {
    return new Response(JSON.stringify({ ok: false, reason: "no_mx" }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
});
