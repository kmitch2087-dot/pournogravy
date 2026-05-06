import { motion } from "framer-motion";
import { useActiveDrops } from "@/hooks/useActiveDrops";

/**
 * Banner shown at the top of the /shop page when a drop is live.
 * Only renders if show_shop_banner is true.
 */
export const DropShopBanner = () => {
  const { data: drops = [] } = useActiveDrops();
  const drop = drops.find((d) => d.show_shop_banner);
  if (!drop) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="border-b border-[#fde047]/20 bg-black/80"
    >
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center gap-4">
        {drop.flyer_url && (
          <img
            src={drop.flyer_url}
            alt=""
            className="h-14 w-14 object-cover rounded-sm shrink-0 border border-border"
          />
        )}
        <div className="flex-1 text-center sm:text-left">
          <p className="font-marker tracking-widest text-[#fde047] text-xs uppercase mb-0.5">
            🔥 New Drop
          </p>
          <p className="font-display tracking-widest text-base text-white">{drop.name.toUpperCase()}</p>
          {drop.teaser_blurb && (
            <p className="text-xs text-white/50 mt-0.5 truncate max-w-md">{drop.teaser_blurb}</p>
          )}
        </div>
        {drop.tag_type !== "none" && drop.tag_text && (
          drop.tag_type === "stamp" ? (
            <div className="bg-[#fde047] text-black px-3 py-1 text-xs font-marker tracking-wider stamp-rotate shrink-0">
              {drop.tag_text}
            </div>
          ) : (
            <span className="font-marker text-xl text-[#ff1744] drop-shadow-[0_0_8px_rgba(255,23,68,0.7)] shrink-0">
              {drop.tag_text}
            </span>
          )
        )}
      </div>
    </motion.div>
  );
};
