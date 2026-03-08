import { useParams, Link } from "react-router-dom";
import { products } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";

const ProductDetail = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState("");

  if (!product) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <h1 className="font-display text-4xl tracking-wider">PRODUCT NOT FOUND</h1>
        <p className="text-muted-foreground mt-4">Just like your patience on a Friday night.</p>
        <Link to="/shop" className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground underline">
          Back to Shop
        </Link>
      </div>
    );
  }

  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <div className="container mx-auto px-4">
        {/* Back link */}
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 font-display tracking-wider">
          <ArrowLeft className="h-4 w-4" /> BACK TO SHOP
        </Link>

        <div className="grid md:grid-cols-2 gap-8 md:gap-16">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square bg-muted border border-border flex items-center justify-center p-12"
          >
            <span className="font-display text-2xl md:text-3xl text-center tracking-wider text-muted-foreground leading-tight">
              {product.name}
            </span>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {product.badge && (
              <span className="inline-block bg-primary text-primary-foreground px-3 py-1 text-[10px] font-display tracking-widest">
                {product.badge}
              </span>
            )}

            <h1 className="font-display text-3xl md:text-4xl tracking-wider leading-tight">{product.name}</h1>
            <p className="text-2xl font-display tracking-wider">${product.price.toFixed(2)}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            <p className="text-xs text-muted-foreground italic">"{product.humor}"</p>

            {/* Size selector */}
            <div>
              <p className="text-xs font-display tracking-widest mb-3">SIZE</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-10 w-12 border text-sm font-display tracking-wider transition-colors ${
                      selectedSize === size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => {
                if (selectedSize) addItem(product, selectedSize);
              }}
              disabled={!selectedSize}
              className="w-full h-14 font-display text-lg tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
            >
              {selectedSize ? "ADD TO BAG" : "SELECT A SIZE"}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Free shipping on orders over $75. Returns within 30 days.
            </p>
          </motion.div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-20 pb-20">
            <h2 className="font-display text-2xl tracking-wider mb-8">YOU MIGHT ALSO HATE</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
