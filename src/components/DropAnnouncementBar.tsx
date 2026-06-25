import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveDrops } from "@/hooks/useActiveDrops";
import { cn } from "@/lib/utils";
import { useSiteContent } from "@/context/SiteContentContext";

/**
 * Thin persistent bar at the top of every public page.
 * Pulls the first active drop with show_announcement_bar=true.
 * User can dismiss per-session.
 */
export const DropAnnouncementBar = () => {
  const { data: drops = [] } = useActiveDrops();
  const [dismissed, setDismissed] = useState(false);
  const { getValue } = useSiteContent();

  const drop = drops.find((d) => d.show_announcement_bar);
  if (!drop || dismissed) return null;

  const text = drop.teaser_blurb ?? `${drop.name} — dropping soon. Don't sleep on it.`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-50 bg-[#ff1744] text-white overflow-hidden"
      >
        <div className="container mx-auto px-4 py-1.5 flex items-center justify-center gap-3 min-h-[34px]">
          <span className="font-marker tracking-widest text-xs uppercase mr-2 opacity-90">
            🍺 {getValue('home', 'announcement', 'label', 'Pre-Shift Bulletin:')}
          </span>
          <p className="text-xs font-medium text-center flex-1 max-w-xl line-clamp-2 sm:line-clamp-1">{text}</p>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 opacity-70 hover:opacity-100 transition"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
