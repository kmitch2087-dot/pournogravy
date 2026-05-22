// useAnalytics — fire-and-forget event tracking
// Uses fetch() with credentials: 'omit' so the browser does not send cookies.
// This allows the edge function to return Access-Control-Allow-Origin: * without
// triggering the CORS preflight rejection that sendBeacon() caused (sendBeacon
// always sends credentials: include, which is incompatible with wildcard CORS).

import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`;

// Stable session ID: persists for the browser session (survives page navigations)
function getSessionId(): string {
  const key = "pg_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

interface TrackOptions {
  product_id?: string;
  order_id?: string;
  revenue?: number;
  metadata?: Record<string, unknown>;
}

function send(event_type: string, page: string, opts: TrackOptions = {}) {
  const payload = JSON.stringify({
    event_type,
    page,
    session_id: getSessionId(),
    referrer: document.referrer || undefined,
    ...opts,
  });

  // fetch with credentials: 'omit' — analytics never need cookies.
  // This is compatible with Access-Control-Allow-Origin: * in the edge function.
  // keepalive: true preserves the request even if the page is navigating away.
  fetch(TRACK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    credentials: "omit",
    keepalive: true,
  }).catch(() => {/* swallow — analytics must never break the user experience */});
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const { pathname } = useLocation();
  const lastPathRef = useRef<string>("");

  // Auto-fire page_view on every route change
  useEffect(() => {
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    // Small delay so the page title has time to update
    const t = setTimeout(() => send("page_view", pathname), 100);
    return () => clearTimeout(t);
  }, [pathname]);

  const trackAddToCart = useCallback(
    (product_id: string, metadata?: Record<string, unknown>) =>
      send("add_to_cart", pathname, { product_id, metadata }),
    [pathname],
  );

  const trackCheckoutStart = useCallback(
    () => send("checkout_start", pathname),
    [pathname],
  );

  const trackPurchase = useCallback(
    (order_id: string, revenue: number) =>
      send("purchase", pathname, { order_id, revenue }),
    [pathname],
  );

  return { trackAddToCart, trackCheckoutStart, trackPurchase };
}
