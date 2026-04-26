import { useParams, Link } from "react-router-dom";
import { products, type ProductVariant, type ProductColor } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Truck, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import CustomGarmentRequestModal from "@/components/CustomGarmentRequestModal";

const ProductDetail = () => {
  const { id } = useParams();
  // Only show published products on direct URL access. Drafts 404
  // (matches the behavior of the shop grid + featured row hiding them).
  const product = products.find((p) => p.id === id && p.published === true);
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  // Selected fit (Men's / Women's). Defaults to the first variant on the product.
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product?.variants?.[0],
  );
  // Selected color (Black / Cream). Defaults to the first color on the product.
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>(
    product?.colors?.[0],
  );
  // "Want this on a hoodie/speedo/whatever?" request modal.
  const [customOpen, setCustomOpen] = useState(false);

  // Reset state when switching between products
  useEffect(() => {
    setSelectedSize("");
    setJustAdded(false);
    setActiveImage(0);
    setSelectedVariant(product?.variants?.[0]);
    setSelectedColor(product?.colors?.[0]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id, product]);

  // Reset the active gallery slot whenever the fit OR color changes
  // so we always land on that combination's first image.
  // IMPORTANT: hooks MUST live above the early-return below — React's
  // Rules of Hooks require the same number of hooks on every render.
  useEffect(() => {
    setActiveImage(0);
  }, [selectedVariant?.id, selectedColor?.id]);

  if (!product) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-4">
          ☠ 86'd
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider">
          PRODUCT NOT FOUND
        </h1>
        <p className="text-muted-foreground mt-4">
          Just like your patience on a Friday night.
        </p>
        <Link
          to="/shop"
          className="mt-8 inline-block text-sm text-muted-foreground hover:text-[#fde047] underline underline-offset-4"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const related = products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3);

  // Photo lookup chain — most specific match wins:
  //   1. color.imagesByFit[fitId]   — fit + color combo (e.g. Men's Cream)
  //   2. color.images               — color override shared by both fits
  //   3. variant.images             — fit-specific images (e.g. Women's Black)
  //   4. product.images             — fallback for both
  //   5. product.image              — last-resort single image
  const gallery: string[] = (() => {
    const fitId = selectedVariant?.id;
    if (selectedColor) {
      if (fitId && selectedColor.imagesByFit?.[fitId]?.length) {
        return selectedColor.imagesByFit[fitId];
      }
      if (selectedColor.images && selectedColor.images.length > 0) {
        return selectedColor.images;
      }
    }
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      return selectedVariant.images;
    }
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    return product.image ? [product.image] : [];
  })();

  const handleAdd = () => {
    if (!selectedSize) return;
    // Pass fit + color so the cart can distinguish Men's L Black from
    // Women's L Cream (they're different SKUs to the printer).
    addItem(product, selectedSize, selectedVariant?.id, selectedColor?.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <div className="container mx-auto px-4">
        {/* Back link */}
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#fde047] transition-colors mb-8 font-display tracking-widest uppercase"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Shop
        </Link>

        <div className="grid md:grid-cols-2 gap-8 md:gap-16 pb-12">
          {/* Gallery */}
          <div className="space-y-4">
            <motion.div
              key={activeImage}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-square bg-muted border-2 border-foreground/10 rough-border overflow-hidden noise-overlay"
            >
              {gallery[activeImage] ? (
                <img
                  src={gallery[activeImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-12">
                  <span className="font-display text-2xl md:text-3xl text-center tracking-wider text-muted-foreground leading-tight">
                    {product.name}
                  </span>
                </div>
              )}

              {product.badge && (
                <div
                  className="absolute top-3 left-3 bg-[#fde047] text-black px-3 py-1 text-[10px] font-marker tracking-widest stamp-rotate uppercase"
                  style={{ boxShadow: "0 0 16px rgba(253,224,71,0.4)" }}
                >
                  {product.badge}
                </div>
              )}
            </motion.div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex gap-2">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`relative h-20 w-20 border-2 overflow-hidden transition-all ${
                      i === activeImage
                        ? "border-[#fde047]"
                        : "border-border hover:border-foreground/40"
                    }`}
                    style={
                      i === activeImage
                        ? { boxShadow: "0 0 12px rgba(253,224,71,0.4)" }
                        : undefined
                    }
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-6"
          >
            <div>
              <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-3">
                {product.category || "Bartender Apparel"}
              </p>
              <h1 className="font-display text-3xl md:text-5xl tracking-wider leading-[0.95]">
                {product.name}
              </h1>
              <p className="text-2xl md:text-3xl font-display tracking-wider mt-4">
                ${product.price.toFixed(2)}
              </p>
            </div>

            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              {product.description}
            </p>

            {product.longDescription?.map((para, i) => (
              <p
                key={i}
                className="text-muted-foreground text-sm md:text-base leading-relaxed"
              >
                {para}
              </p>
            ))}

            {/* Short zinger callout */}
            {product.humor && (
              <div
                className="relative border-l-2 border-[#fde047] bg-muted/40 p-5"
                style={{ boxShadow: "inset 0 0 20px rgba(253,224,71,0.05)" }}
              >
                <p className="font-marker text-sm md:text-base italic text-foreground/90 leading-relaxed">
                  "{product.humor}"
                </p>
              </div>
            )}

            {/* Bad Bartender Advice — multi-paragraph featured story */}
            {product.badAdvice && (
              <div
                className="relative border-2 border-[#fde047]/60 bg-black/40 p-6 rough-border"
                style={{ boxShadow: "0 0 24px rgba(253,224,71,0.15), inset 0 0 30px rgba(253,224,71,0.06)" }}
              >
                <p
                  className="font-marker text-[10px] tracking-[0.3em] text-[#fde047] uppercase mb-2"
                  style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
                >
                  ☠ Bad Bartender Advice
                </p>
                <h3 className="font-display text-xl md:text-2xl tracking-wider uppercase mb-4 leading-tight">
                  {product.badAdvice.title}
                </h3>
                <div className="space-y-3">
                  {product.badAdvice.paragraphs.map((para, i) => (
                    <p
                      key={i}
                      className="text-sm md:text-base text-foreground/80 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Fit / gender variant selector — only shown when product has variants */}
            {product.variants && product.variants.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-display tracking-widest uppercase">Fit</p>
                  {selectedVariant && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="text-foreground font-display">{selectedVariant.label}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`h-12 px-5 border-2 text-sm font-display tracking-wider transition-all ${
                        selectedVariant?.id === v.id
                          ? "bg-[#fde047] text-black border-[#fde047]"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      }`}
                      style={
                        selectedVariant?.id === v.id
                          ? { boxShadow: "0 0 16px rgba(253,224,71,0.4)" }
                          : undefined
                      }
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color swatch selector — only shown when product has more than one color */}
            {product.colors && product.colors.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-display tracking-widest uppercase">Color</p>
                  {selectedColor && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="text-foreground font-display">{selectedColor.label}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((c) => {
                    const active = selectedColor?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedColor(c)}
                        aria-label={`Color: ${c.label}`}
                        aria-pressed={active}
                        title={c.label}
                        className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                          active
                            ? "border-[#fde047]"
                            : "border-border hover:border-foreground/40"
                        }`}
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: active
                            ? "0 0 14px rgba(253,224,71,0.45)"
                            : undefined,
                        }}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-offset-background ring-[#fde047]/60"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-display tracking-widest uppercase">Size</p>
                {selectedSize && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="text-foreground font-display">{selectedSize}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-12 min-w-[56px] px-3 border-2 text-sm font-display tracking-wider transition-all ${
                      selectedSize === size
                        ? "bg-[#fde047] text-black border-[#fde047]"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                    style={
                      selectedSize === size
                        ? { boxShadow: "0 0 16px rgba(253,224,71,0.4)" }
                        : undefined
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to bag */}
            <Button
              onClick={handleAdd}
              disabled={!selectedSize}
              className="w-full h-14 font-display text-lg tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              style={
                selectedSize && !justAdded
                  ? { boxShadow: "0 0 20px rgba(253,224,71,0.25)" }
                  : undefined
              }
            >
              <AnimatePresence mode="wait">
                {justAdded ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-5 w-5" /> ADDED
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {selectedSize ? "ADD TO BAG" : "SELECT A SIZE"}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* Shipping perks */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-[#fde047]" />
                <span>Free ship over $75</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RotateCcw className="h-4 w-4 text-[#fde047]" />
                <span>30-day returns</span>
              </div>
            </div>

            {/* Custom garment request — "pain in the ass" CTA */}
            <div className="pt-2 text-xs text-muted-foreground leading-relaxed">
              If you wanna be a pain in the ass and get this design on a
              different garment — hoodie, tank, speedo, whatever —{" "}
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                className="font-marker tracking-wider text-[#fde047] underline underline-offset-4 hover:text-[#fde047]/80 transition-colors"
              >
                click here
              </button>
              .
            </div>
          </motion.div>
        </div>

        {/* Custom garment request modal */}
        <CustomGarmentRequestModal
          open={customOpen}
          onOpenChange={setCustomOpen}
          designId={product.id}
          designName={product.name}
        />

        {/* Related */}
        {related.length > 0 && (
          <section className="pt-12 pb-20 border-t border-border">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-2">
                  More from this shift
                </p>
                <h2 className="font-display text-3xl md:text-4xl tracking-wider">
                  YOU MIGHT ALSO HATE
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {related.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group relative"
                >
                  <div
                    aria-hidden="true"
                    className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 50%, rgba(253,224,71,0.2), transparent 70%)",
                      filter: "blur(20px)",
                    }}
                  />
                  <div className="relative">
                    <ProductCard product={p} />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
