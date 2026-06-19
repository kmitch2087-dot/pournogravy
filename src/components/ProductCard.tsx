import { Link } from "react-router-dom";
import { Product } from "@/data/products";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useProductRatings } from "@/hooks/useProductRatings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useRef } from "react";

// ─── Easter egg fallbacks ──────────────────────────────────────────────────
const FALLBACK_TABLE_NAMES = [
  "69", "Pool Bathroom", "THAT Guy Again", "The Needy End",
  "Last Call Corner", "VIP (lol)", "Industry Night",
  "Purgatory", "Bar 12", "The Karen Section",
];
const FALLBACK_SERVER_NAMES = [
  "Some Poor Bastard", "Opie (he's stuck here)",
  "Whoever Drew Short Straw", "Your Problem Now",
  "The One Who Cares", "Not Me", "Ask Literally Anyone Else",
];
const FALLBACK_SPECIAL_INSTRUCTIONS = [
  "No substitutions. I mean it.", "Extra needy, apparently.",
  "Allergic to tipping well.", "Has opinions about ice.",
  "Will ask for manager. Will tip 10%.", "Ordered the well, asked for top shelf.",
  "Said 'surprise me' then complained.", "Third time tonight. God help us.",
];
const FALLBACK_FOOTER_NOTES = [
  "Management not responsible for decisions made after shot #4.",
  "Tip your bartender or don't come back.",
  "No, we can't make it 'a little stronger.'",
  "If you clap at the bar, you're the problem.",
  "Gluten-free beer is still your fault.",
  "Karen has been 86'd. You're welcome.",
  "We water the well. No we don't. Maybe.",
  "Last call was 20 minutes ago. Move.",
];

// ─── DB easter egg shape ───────────────────────────────────────────────────
interface EasterEgg {
  id: string;
  category: string;
  text: string;
  active: boolean;
}

// Stable seeded pick — pick index based on seed mod array length
function seededPick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

// ─── Shared query — fetched once per page, cached 10 minutes ──────────────
const useEasterEggs = () =>
  useQuery<EasterEgg[]>({
    queryKey: ["easter-eggs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_easter_eggs")
        .select("id, category, text, active")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as EasterEgg[];
    },
    staleTime: 10 * 60 * 1000,
    // Silently fall back to undefined on error — component uses fallbacks
    throwOnError: false,
  });

// ─── Constants ─────────────────────────────────────────────────────────────
const NEW_BADGE_MS = 14 * 24 * 60 * 60 * 1000;

const ProductCard = ({ product }: { product: Product }) => {
  const { isSaved, toggle } = useWishlist();
  const ratings = useProductRatings();
  const saved = isSaved(product.id);
  const rating = ratings.get(product.id);

  // Stable random seed per card instance — only computed once on mount
  const seedRef = useRef<number>(Math.floor(Math.random() * 99999));
  const seed = seedRef.current;

  // Stable stain position — randomised per card, stable per render
  const stainX = useMemo(() => 10 + (seed % 60), [seed]);
  const stainY = useMemo(() => 10 + ((seed * 7) % 60), [seed]);

  // Random check number (4-digit), stable per card
  const checkNumber = useMemo(
    () => String(1000 + (seed % 9000)).padStart(4, "0"),
    [seed],
  );

  // Current time — captured once on mount (receipt-accurate)
  const checkTime = useMemo(() => new Date().toLocaleTimeString(), []);

  // ── Easter eggs ──────────────────────────────────────────────────────────
  const { data: eggsData } = useEasterEggs();

  const { tableName, serverName, specialInstruction, footerNote } =
    useMemo(() => {
      const byCategory = (cat: string): string[] => {
        const found = (eggsData ?? []).filter((e) => e.category === cat).map((e) => e.text);
        return found.length > 0 ? found : null!;
      };

      const tableArr  = byCategory("table_name")          ?? FALLBACK_TABLE_NAMES;
      const serverArr = byCategory("server_name")         ?? FALLBACK_SERVER_NAMES;
      const instrArr  = byCategory("special_instruction") ?? FALLBACK_SPECIAL_INSTRUCTIONS;
      const footerArr = byCategory("footer_note")         ?? FALLBACK_FOOTER_NOTES;

      return {
        tableName:          seededPick(tableArr,  seed),
        serverName:         seededPick(serverArr, seed + 1),
        specialInstruction: seededPick(instrArr,  seed + 2),
        footerNote:         seededPick(footerArr, seed + 3),
      };
    }, [eggsData, seed]);

  const cardImage =
    product.variants?.[0]?.images?.[0] ?? product.image ?? product.images?.[0];

  const isNew = product.wentLiveAt
    ? Date.now() - new Date(product.wentLiveAt).getTime() < NEW_BADGE_MS
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      {/* ── Receipt card shell ── */}
      <div
        className="relative font-mono overflow-hidden"
        style={{ backgroundColor: "#faf6f0" }}
      >
        {/* Water / coffee stain overlay — unique position per card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse 55% 40% at ${stainX}% ${stainY}%, rgba(139,90,43,0.09) 0%, transparent 70%),
                         radial-gradient(ellipse 30% 25% at ${100 - stainX}% ${100 - stainY}%, rgba(180,130,60,0.06) 0%, transparent 65%)`,
          }}
        />

        {/* ── HEADER ROW: TABLE + CHECK # ── */}
        <div className="relative z-10 flex items-start justify-between px-3 pt-2 pb-0.5">
          <span className="text-[10px] text-gray-600 leading-tight">
            TABLE: <span className="font-bold text-gray-800">{tableName}</span>
          </span>
          <div className="text-right">
            {/* Badges live in the top-right header area */}
            <div className="flex flex-col items-end gap-0.5 mb-0.5">
              {isNew && (
                <span className="bg-[#fde047] text-black px-1.5 py-0 text-[9px] font-bold tracking-widest uppercase">
                  NEW
                </span>
              )}
              {product.badge && (
                <span className="bg-black text-white px-1.5 py-0 text-[9px] font-bold tracking-wider uppercase">
                  {product.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-600">
              CHECK #{checkNumber}
            </span>
          </div>
        </div>

        {/* ── TIME ROW ── */}
        <div className="relative z-10 flex justify-end px-3 pb-1">
          <span className="text-[9px] text-gray-500">{checkTime}</span>
        </div>

        {/* ── DASHED SEPARATOR ── */}
        <div className="relative z-10 border-dashed border-t border-gray-400 mx-3 my-1" />

        {/* ── PRODUCT IMAGE — full width, no rounded corners, wishlist heart overlaid ── */}
        <div className="relative z-10 aspect-square bg-gray-100 overflow-hidden">
          <Link to={`/product/${product.id}`} className="group block w-full h-full">
            {cardImage ? (
              <img
                src={cardImage}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <span className="font-mono text-center text-xs leading-tight text-gray-600 group-hover:text-gray-900 transition-colors">
                  {product.name}
                </span>
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Wishlist heart — overlaid top-right */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            className="absolute top-2 right-2 p-2 bg-black/50 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity hover:bg-black/70 z-20"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${saved ? "fill-[#ff1744] text-[#ff1744]" : "text-white"}`}
            />
          </button>
        </div>

        {/* ── DASHED SEPARATOR ── */}
        <div className="relative z-10 border-dashed border-t border-gray-400 mx-3 my-1" />

        {/* ── ITEM LINE: name left, price right ── */}
        <Link to={`/product/${product.id}`} className="group block">
          <div className="relative z-10 flex items-baseline justify-between px-3 py-1">
            <span className="text-[11px] font-bold text-gray-900 truncate pr-2 leading-tight">
              {product.name.toUpperCase()}
            </span>
            <span className="text-[11px] font-bold text-gray-900 whitespace-nowrap">
              ${product.price.toFixed(2)}
            </span>
          </div>

          {/* ── STAR RATING ── */}
          {rating && (
            <div className="relative z-10 flex items-center gap-0.5 px-3 pb-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-2.5 h-2.5 ${
                    s <= Math.round(rating.avg)
                      ? "fill-[#fde047] text-[#fde047]"
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="text-[9px] text-gray-400 ml-0.5">({rating.count})</span>
            </div>
          )}

          {/* ── SVR LINE ── */}
          <div className="relative z-10 px-3 pb-0.5">
            <span className="text-[9px] text-gray-500">
              SVR: {serverName}
            </span>
          </div>

          {/* ── SPECIAL INSTRUCTIONS ── */}
          <div className="relative z-10 px-3 pb-1">
            <span className="text-[9px] italic text-gray-400">{specialInstruction}</span>
          </div>
        </Link>

        {/* ── DASHED SEPARATOR ── */}
        <div className="relative z-10 border-dashed border-t border-gray-400 mx-3 my-1" />

        {/* ── ADD TO CART BUTTON — full width, yellow, black text, no rounding ── */}
        <div className="relative z-10 px-3 pb-2">
          <Link
            to={`/product/${product.id}`}
            className="flex items-center justify-between w-full bg-[#fde047] text-black px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase hover:bg-[#fbbf24] transition-colors rounded-none"
          >
            <span>RING IT UP</span>
            <span>${product.price.toFixed(2)}</span>
          </Link>
        </div>

        {/* ── FOOTER NOTE ── */}
        <div className="relative z-10 px-3 pb-2 text-center">
          <span className="text-[8px] text-gray-400 italic leading-tight block">
            {footerNote}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
