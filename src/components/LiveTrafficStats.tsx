import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Consumes the `cloudflare-stats` edge function (Cloudflare GraphQL Analytics
// for the pournogravy.com zone). Shows a live "Live Site Traffic" section when
// the CF_ANALYTICS_TOKEN secret is configured and returns data; otherwise falls
// back to whatever `fallback` is passed (the manual audience-stat box).
interface CfStats {
  available: boolean;
  page_views_30d?: number;
  unique_visitors_30d?: number;
  requests_30d?: number;
  since?: string;
  until?: string;
}

const nf = new Intl.NumberFormat("en-US");

export function LiveTrafficStats({ fallback }: { fallback: ReactNode }) {
  const [stats, setStats] = useState<CfStats | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.functions
      .invoke("cloudflare-stats")
      .then(({ data }) => { if (alive) { setStats(data as CfStats); setDone(true); } })
      .catch(() => { if (alive) setDone(true); });
    return () => { alive = false; };
  }, []);

  // Not loaded yet, or CF not configured → show the manual fallback box.
  if (!done || !stats?.available) return <>{fallback}</>;

  const cards = [
    { num: stats.unique_visitors_30d ?? 0, label: "Unique Visitors · 30 days" },
    { num: stats.page_views_30d ?? 0,      label: "Page Views · 30 days" },
    { num: stats.requests_30d ?? 0,        label: "Requests · 30 days" },
  ];

  return (
    <section className="border-b border-white/10 bg-black">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="inline-flex items-center gap-2 text-xs tracking-[0.3em] text-[#fde047] uppercase mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fde047] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fde047]" />
            </span>
            Live Site Traffic
          </p>
          <h2 className="font-display text-3xl md:text-4xl tracking-wider text-white">
            Real numbers, straight from the edge
          </h2>
          <p className="text-white/50 text-sm md:text-base mt-4 leading-relaxed">
            Measured by Cloudflare's network — not our own code, so nothing here can be
            inflated. Last 30 days, refreshed automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {cards.map((c) => (
            <div key={c.label} className="border border-white/10 bg-white/[0.02] rounded-lg py-8 px-4 text-center">
              <p className="font-display text-4xl md:text-5xl text-[#fde047] tracking-wider tabular-nums">
                {nf.format(c.num)}
              </p>
              <p className="text-[11px] text-white/50 uppercase tracking-widest mt-3">{c.label}</p>
            </div>
          ))}
        </div>

        {stats.since && stats.until && (
          <p className="text-center text-[10px] text-white/30 mt-6 tracking-wider">
            {stats.since} → {stats.until} · via Cloudflare network analytics
          </p>
        )}
      </div>
    </section>
  );
}
