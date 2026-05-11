// useAnalytics — fire-and-forget event tracking via navigator.sendBeacon
// Non-blocking: sendBeacon queues the POST even if the page is being unloaded.
// Falls back to fetch() if sendBeacon is unavailable.

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

  // sendBeacon is preferred: works during page unload, never blocks
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(TRACK_URL, blob);
  } else {
    // Fallback for environments without sendBeacon (rare)
    fetch(TRACK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {/* swallow — analytics must never break the user experience */});
  }
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
