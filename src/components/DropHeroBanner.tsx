import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useActiveDrops } from "@/hooks/useActiveDrops";

/**
 * Full-width banner shown in the homepage hero area when a drop is live.
 * Only shows if show_hero_banner is true on the active drop.
 */
export const DropHeroBanner = () => {
  const { data: drops = [] } = useActiveDrops();
  const drop = drops.find((d) => d.show_hero_banner);
  if (!drop) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative bg-black border-b border-[#ff1744]/40 overflow-hidden"
    >
      {/* Neon glow lines */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(255,23,68,0.15), transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(253,224,71,0.08), transparent 60%)",
        }}
      />
      <div className="relative container mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row items-center gap-6">
        {drop.flyer_url && (
          <img
            src={drop.flyer_url}
            alt={drop.name}
            className="h-24 w-24 md:h-28 md:w-28 object-cover rounded-md border border-[#ff1744]/30 shrink-0"
          />
        )}
        <div className="flex-1 text-center md:text-left">
          <p
            className="font-marker tracking-widest text-[#ff1744] text-sm md:text-base mb-1"
            style={{ textShadow: "0 0 12px rgba(255,23,68,0.7)" }}
          >
            🔥 NOW DROPPING
          </p>
          <h2 className="font-display text-2xl md:text-3xl tracking-widest text-white mb-2">
            {drop.name.toUpperCase()}
          </h2>
          {drop.teaser_blurb && (
            <p className="text-sm text-white/60 max-w-lg">{drop.teaser_blurb}</p>
          )}
        </div>
        <Link
          to="/shop"
          className="shrink-0 px-6 py-2.5 bg-[#fde047] text-black font-display tracking-widest text-sm hover:bg-[#fde047]/90 transition rounded-sm"
        >
          SHOP NOW
        </Link>
      </div>
    </motion.div>
  );
};
