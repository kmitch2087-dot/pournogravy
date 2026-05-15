import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import SEO from "@/components/SEO";
import ProductCard from "@/components/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { products } from "@/data/products";
import { motion } from "framer-motion";

const Wishlist = () => {
  const { wishlist, loading } = useWishlist();

  const saved = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <SEO
        title="Wishlist"
        description="Your saved Pournogravy items."
        url="https://pournogravy.com/wishlist"
      />

      <section className="relative bg-black text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(255,23,68,0.18), transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(253,224,71,0.1), transparent 50%)",
          }}
        />
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <p className="font-marker text-xs tracking-[0.3em] text-[#ff1744] uppercase mb-3">
            Your list
          </p>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none flex items-center gap-4">
            WISHLIST
            <Heart className="w-10 h-10 fill-[#ff1744] text-[#ff1744]" />
          </h1>
          <p className="text-white/70 text-sm md:text-base mt-3">
            {loading ? "Loading…" : saved.length === 0 ? "Nothing saved yet." : `${saved.length} item${saved.length === 1 ? "" : "s"} saved`}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 pb-20">
        {!loading && saved.length === 0 ? (
          <div className="py-24 text-center">
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-marker text-xl tracking-wider text-muted-foreground uppercase">
              Your wishlist is empty
            </p>
            <p className="text-sm text-muted-foreground mt-3 mb-8">
              Hit the heart on any product to save it for later.
            </p>
            <Link
              to="/shop"
              className="inline-block bg-[#fde047] text-black font-display text-xs tracking-widest uppercase px-8 py-3 hover:bg-[#fde047]/90 transition-colors"
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {saved.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
