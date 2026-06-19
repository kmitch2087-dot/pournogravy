import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarDays, Bell } from "lucide-react";
import { useActiveDrops } from "@/hooks/useActiveDrops";

function formatDropDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function MerchDrops() {
  const { data: drops, isLoading } = useActiveDrops();

  return (
    <>
      <Helmet>
        <title>Merch Drops — Pournogravy</title>
        <meta name="description" content="Upcoming limited merch drops from Pournogravy. Be the first to know." />
      </Helmet>

      {/* Hero */}
      <section className="relative bg-black text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(253,224,71,0.18), transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(255,23,68,0.12), transparent 50%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, #fde047 50%, transparent)",
            boxShadow: "0 0 20px rgba(253,224,71,0.5)",
          }}
        />
        <div className="container mx-auto px-4 pt-5 pb-6 md:pt-8 md:pb-10 relative">
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none">
            MERCH DROPS
          </h1>
          <p
            className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mt-3"
            style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
          >
            Limited runs. No restocks. No regrets.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-muted/30 animate-pulse rounded" />
            ))}
          </div>
        ) : drops && drops.length > 0 ? (
          <div className="space-y-8">
            {drops.map((drop, i) => (
              <motion.div
                key={drop.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="border border-[#fde047]/30 bg-black/40 p-6"
                style={{ boxShadow: "0 0 24px rgba(253,224,71,0.06)" }}
              >
                {drop.tag_text && (
                  <span className="inline-block mb-3 bg-[#fde047] text-black text-[10px] font-marker tracking-widest px-2 py-0.5 uppercase">
                    {drop.tag_text}
                  </span>
                )}
                {drop.flyer_url && (
                  <img
                    src={drop.flyer_url}
                    alt={drop.name}
                    className="w-full object-contain mb-4 max-h-72"
                  />
                )}
                <h2 className="font-display text-2xl md:text-3xl tracking-wider text-white mb-1">
                  {drop.name}
                </h2>
                <div className="flex items-center gap-2 text-[#fde047] mb-3">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-marker text-xs tracking-widest uppercase">
                    {drop.status === "active" ? "Available now" : `Drops ${formatDropDate(drop.scheduled_drop_at)}`}
                  </span>
                </div>
                {drop.teaser_blurb && (
                  <p className="text-white/80 text-sm leading-relaxed mb-4">{drop.teaser_blurb}</p>
                )}
                {drop.status === "active" ? (
                  <Link
                    to="/shop"
                    className="inline-block bg-[#fde047] text-black font-marker tracking-widest text-sm px-6 py-2 hover:bg-[#fbbf24] transition-colors"
                  >
                    SHOP THE DROP →
                  </Link>
                ) : (
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 border border-[#fde047]/50 text-[#fde047] font-marker tracking-widest text-xs px-5 py-2 hover:bg-[#fde047]/10 transition-colors"
                  >
                    <Bell className="w-3 h-3" /> NOTIFY ME
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          /* ── Empty state ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div
              className="inline-flex items-center justify-center w-20 h-20 border-2 border-[#fde047]/30 mb-6"
              style={{ boxShadow: "0 0 30px rgba(253,224,71,0.08)" }}
            >
              <CalendarDays className="w-8 h-8 text-[#fde047]/60" />
            </div>

            <h2 className="font-display text-3xl md:text-4xl tracking-wider text-white mb-3">
              NOTHING YET.
            </h2>
            <p
              className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-6"
              style={{ textShadow: "0 0 8px rgba(253,224,71,0.4)" }}
            >
              But we're cooking something.
            </p>
            <p className="text-white/60 text-sm max-w-sm mx-auto leading-relaxed mb-8">
              No drops are scheduled right now. Sign up for the newsletter and you'll be the first to know when something's about to drop — before it sells out.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/contact"
                className="inline-block bg-[#fde047] text-black font-marker tracking-widest text-sm px-8 py-3 hover:bg-[#fbbf24] transition-colors"
              >
                GET NOTIFIED
              </Link>
              <Link
                to="/shop"
                className="inline-block border border-white/20 text-white font-marker tracking-widest text-sm px-8 py-3 hover:border-white/50 transition-colors"
              >
                SHOP CURRENT MENU
              </Link>
            </div>

            <p className="mt-10 font-marker text-[10px] tracking-widest text-white/25 uppercase">
              Tip your bartender while you wait.
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}
