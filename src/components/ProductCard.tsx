import { Link } from "react-router-dom";
import { Product } from "@/data/products";
import { useSiteContent } from "@/context/SiteContentContext";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useProductRatings } from "@/hooks/useProductRatings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useRef } from "react";
import { useCardImageFlip } from "@/hooks/useCardImageFlip";
import { ShareButton } from "@/components/ShareButton";

// Module-level no-repeat state — persists across renders, resets on page reload
let _lastCartPhrase = '';

function pickCartPhrase(phrases: string[]): string {
  if (!phrases.length) return 'Add to Cart';
  if (phrases.length === 1) return phrases[0];
  const available = phrases.filter(p => p !== _lastCartPhrase);
  const next = available[Math.floor(Math.random() * available.length)];
  _lastCartPhrase = next;
  return next;
}

// ─── Easter egg fallbacks ──────────────────────────────────────────────────
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

const CTA_PHRASES = [
  "RING IT UP",
  "ADD TO BAG",
  "ADD TO MY TAB",
  "TAKE IT TO-GO",
  "FIRE",
  "PUT IT ON THE BOOKS",
  "RUN IT",
  "CLOSE ME OUT",
  "ONE MORE ROUND",
];

const ProductCard = ({ product, priority = false, groupSize }: { product: Product; priority?: boolean; groupSize?: number }) => {
  const { isSaved, toggle } = useWishlist();
  const ratings = useProductRatings();
  const saved = isSaved(product.id);
  const rating = ratings.get(product.id);
  const { rows: siteContentRows } = useSiteContent();

  // Stable random seed per card instance — only computed once on mount
  const seedRef = useRef<number>(Math.floor(Math.random() * 99999));
  const seed = seedRef.current;

  // ── Easter eggs ──────────────────────────────────────────────────────────
  const { data: eggsData } = useEasterEggs();

  const footerNote = useMemo(() => {
    const eggsNotes = (eggsData ?? []).filter(e => e.category === 'footer_note').map(e => e.text);
    const dbFooterNotes = siteContentRows
      .filter(r => r.page === 'shop' && r.section === 'cart_variants')
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .map(r => r.value ?? r.default_value ?? '')
      .filter(Boolean);
    // Priority: DB easter eggs → site_content cart_variants → hardcoded fallback
    const arr = eggsNotes.length > 0 ? eggsNotes : (dbFooterNotes.length > 0 ? dbFooterNotes : FALLBACK_FOOTER_NOTES);
    return seededPick(arr, seed + 3);
  }, [eggsData, siteContentRows, seed]);

  // Add-to-cart phrase: DB phrases with no-repeat, fall back to CTA_PHRASES
  const addToCartPhrases = useMemo(() => {
    const dbPhrases = (eggsData ?? [])
      .filter(e => e.category === 'add_to_cart')
      .map(e => e.text);
    return dbPhrases.length > 0 ? dbPhrases : CTA_PHRASES;
  }, [eggsData]);

  // Pick once on mount and stick with it for this card instance
  const ctaPhraseRef = useRef<string | null>(null);
  if (ctaPhraseRef.current === null) {
    ctaPhraseRef.current = pickCartPhrase(addToCartPhrases);
  }
  const ctaPhrase = ctaPhraseRef.current;

  const cardImages = product.images && product.images.length > 0
    ? product.images
    : product.image ? [product.image] : [];
  const zoomSrc = product.flip_enabled ? (product.flip_image_url ?? undefined) : undefined;
  const showZoom = useCardImageFlip(!!zoomSrc);

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
      <div className="relative overflow-hidden bg-card">

        {/* ── PRODUCT IMAGE — full width, no rounded corners, wishlist heart overlaid ── */}
        <div className="relative aspect-square bg-[#111] overflow-hidden">
          <Link to={`/product/${product.id}`} aria-label={`View ${product.name}`} className="group block w-full h-full">
            {cardImages.length > 0 ? (
              <>
                {cardImages[0] && (
                  <img
                    src={cardImages[0]}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ opacity: showZoom ? 0 : 1, transition: 'opacity 0.8s ease-in-out' }}
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : "auto"}
                    decoding="async"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      if (el.src.endsWith('.webp')) el.src = el.src.replace('.webp', '.png');
                    }}
                  />
                )}
                {zoomSrc && (
                  <img
                    src={zoomSrc}
                    alt={`${product.name} graphic detail`}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ opacity: showZoom ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <span className="font-mono text-center text-xs leading-tight text-gray-400 group-hover:text-gray-200 transition-colors">
                  {product.name}
                </span>
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Badges — overlaid top-left */}
          <div className="absolute top-2 left-2 flex flex-col gap-0.5 z-20">
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
            {groupSize && groupSize > 1 && (
              <span className="bg-black/70 text-white/80 px-1.5 py-0 text-[9px] font-bold tracking-wider uppercase border border-white/20">
                {groupSize}+ styles
              </span>
            )}
          </div>

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

        {/* ── ITEM LINE: name left, price right ── */}
        <Link to={`/product/${product.id}`} className="group block">
          <div className="flex items-baseline justify-between px-3 pt-2 pb-1">
            <span className="text-[11px] font-bold text-foreground pr-2 leading-tight">
              {product.name.toUpperCase()}
            </span>
            <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
              ${product.price.toFixed(2)}
            </span>
          </div>

          {/* ── STAR RATING ── */}
          {rating && (
            <div className="flex items-center gap-0.5 px-3 pb-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-2.5 h-2.5 ${
                    s <= Math.round(rating.avg)
                      ? "fill-[#fde047] text-[#fde047]"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
              <span className="text-[9px] text-muted-foreground ml-0.5">({rating.count})</span>
            </div>
          )}
        </Link>

        {/* ── ADD TO CART BUTTON — full width, yellow, black text, no rounding ── */}
        <div className="px-3 pt-1 pb-2">
          <Link
            to={`/product/${product.id}`}
            className="flex items-center justify-between w-full bg-[#fde047] text-black px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase hover:bg-[#fbbf24] transition-colors rounded-none"
          >
            <span>{ctaPhrase}</span>
            <span>${product.price.toFixed(2)}</span>
          </Link>
        </div>

        {/* ── FOOTER NOTE + SHARE ── */}
        <div className="px-3 pb-2 flex items-end justify-between">
          <span className="text-[8px] text-muted-foreground italic leading-tight">
            {footerNote}
          </span>
          <ShareButton
            productName={product.name}
            productUrl={`/product/${product.id}`}
            productImage={cardImages[0]
              ? (cardImages[0].startsWith('http') ? cardImages[0] : `https://pournogravy.com${cardImages[0]}`)
              : undefined}
            className="shrink-0 ml-2"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
