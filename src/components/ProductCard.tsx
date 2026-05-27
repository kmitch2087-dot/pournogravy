import { Link } from "react-router-dom";
import { Product } from "@/data/products";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useProductRatings } from "@/hooks/useProductRatings";

const NEW_BADGE_MS = 14 * 24 * 60 * 60 * 1000;

const ProductCard = ({ product }: { product: Product }) => {
  const { isSaved, toggle } = useWishlist();
  const ratings = useProductRatings();
  const saved = isSaved(product.id);
  const rating = ratings.get(product.id);

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
      <Link to={`/product/${product.id}`} className="group block">
        <div className="relative aspect-square bg-muted overflow-hidden border-2 border-foreground/10 rough-border">
          {cardImage ? (
            <img
              src={cardImage}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover scale-[1.35] group-hover:scale-[1.45] transition-transform duration-500"
              style={{ transformOrigin: `${product.thumbnailFocalX ?? 40}% ${product.thumbnailFocalY ?? 40}%` }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <span className="font-display text-center text-lg leading-tight tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                {product.name}
              </span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* NEW badge — shown for 14 days after went_live_at */}
          {isNew && (
            <div className="absolute top-2 left-2 bg-[#fde047] text-black px-2 py-0.5 text-[10px] font-marker tracking-widest uppercase z-10">
              NEW
            </div>
          )}

          {/* Product badge (e.g. "LIMITED") — offset if NEW badge showing */}
          {product.badge && (
            <div className={`absolute left-2 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-marker tracking-wider stamp-rotate ${isNew ? "top-8" : "top-2"}`}>
              {product.badge}
            </div>
          )}

          {/* Wishlist heart */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
            aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity hover:bg-black/70"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${saved ? "fill-[#ff1744] text-[#ff1744]" : "text-white"}`}
            />
          </button>
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="font-display text-sm tracking-wider truncate">{product.name}</h3>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">${product.price.toFixed(2)}</p>
            {rating && (
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((s) => (
                  <Star
                    key={s}
                    className={`w-2.5 h-2.5 ${s <= Math.round(rating.avg) ? "fill-[#fde047] text-[#fde047]" : "text-muted-foreground/30"}`}
                  />
                ))}
                <span className="text-[9px] text-muted-foreground ml-0.5">({rating.count})</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
