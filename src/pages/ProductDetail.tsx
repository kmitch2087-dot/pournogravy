import SEO from "@/components/SEO";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { RichText } from "@/components/RichText";
import { type ProductVariant, type ProductColor } from "@/data/products";
import { useMergedProducts } from "@/lib/productSource";
import { useCart } from "@/context/CartContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Truck, RotateCcw, Star, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import CustomGarmentRequestModal from "@/components/CustomGarmentRequestModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface GroupMember {
  id: string;
  name: string;
  slug: string;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  const { data: mergedProducts, isLoading: productsLoading } = useMergedProducts();

  // In preview mode, try sessionStorage first; otherwise require published
  const previewProduct = isPreview && id
    ? (() => {
        try {
          const raw = sessionStorage.getItem(`preview_product_${id}`);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })()
    : null;

  const product = previewProduct ?? mergedProducts?.find((p) => p.id === id && (isPreview || p.published === true));

  const publishedProducts = (mergedProducts ?? []).filter((p) => p.published === true);
  const currentIndex = publishedProducts.findIndex((p) => p.id === id);
  const prevProduct = currentIndex > 0 ? publishedProducts[currentIndex - 1] : null;
  const nextProduct = currentIndex !== -1 && currentIndex < publishedProducts.length - 1 ? publishedProducts[currentIndex + 1] : null;
  const { addItem } = useCart();
  const { trackAddToCart } = useAnalytics();
  const [selectedSize, setSelectedSize] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
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
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Stripe purchasability check
  const stripeLoading = false;
  const showDropComingSoon = false;

  const handleSubscribe = async () => {
    if (!subscribeEmail.trim()) return;
    setSubscribing(true);
    await supabase.from("email_subscribers").insert({
      email: subscribeEmail.trim(),
      source: "product_drop",
    });
    setSubscribed(true);
    setSubscribing(false);
  };

  // Reviews
  const qc = useQueryClient();
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, body, created_at")
        .eq("product_slug", id ?? "")
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Product group members — other products in the same style group
  const { data: groupMembers } = useQuery<GroupMember[]>({
    queryKey: ["product-group", product?.product_group_id],
    queryFn: async () => {
      if (!product?.product_group_id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug")
        .eq("product_group_id", product.product_group_id)
        .eq("is_active", true)
        .neq("slug", id ?? "");
      if (error) throw error;
      return (data ?? []) as GroupMember[];
    },
    enabled: !!product?.product_group_id && !isPreview,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_slug: id,
        reviewer_name: reviewName.trim(),
        rating: reviewRating,
        body: reviewBody.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReviewSubmitted(true);
      setReviewName("");
      setReviewRating(0);
      setReviewBody("");
      qc.invalidateQueries({ queryKey: ["reviews", id] });
    },
  });

  const avgRating = reviews?.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  // Reset state when switching between products
  useEffect(() => {
    setSelectedSize("");
    setJustAdded(false);
    setAddedFeedback(false);
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

  if (productsLoading) {
    return (
      <div className="min-h-screen pt-32 text-center">
        <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase animate-pulse">
          ☠ Pouring...
        </p>
      </div>
    );
  }

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

  const related = (mergedProducts ?? [])
    .filter((p) => p.id !== product.id && p.published !== false)
    .sort(() => Math.random() - 0.5)
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
    trackAddToCart(product.id, { size: selectedSize, variant: selectedVariant?.id });
    setJustAdded(true);
    setAddedFeedback(true);
    toast.success('Added to cart', {
      description: product.name,
      duration: 2000,
    });
    setTimeout(() => {
      setJustAdded(false);
      setAddedFeedback(false);
    }, 2000);
  };

  // ── JSON-LD: Google rich results + Shopping eligibility ──────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? `${product.humor} — ${product.name}. Bartender-themed apparel for the service industry.`,
    brand: { "@type": "Brand", name: "POURnogravy" },
    image: (product.images ?? []).map((img: string) =>
      img.startsWith('http') ? img : `https://pournogravy.com${img}`
    ),
    sku: product.id,
    offers: {
      "@type": "Offer",
      price: product.price ?? 27.99,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://pournogravy.com/product/${product.id}`,
      seller: { "@type": "Organization", name: "POURnogravy" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "USD" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          businessDays: { "@type": "QuantitativeValue", minValue: 5, maxValue: 10 },
        },
      },
    },
    ...(reviews && reviews.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: (reviews.reduce((s: number, r: {rating: number}) => s + r.rating, 0) / reviews.length).toFixed(1),
        reviewCount: reviews.length,
      },
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://pournogravy.com" },
      { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://pournogravy.com/shop" },
      { "@type": "ListItem", "position": 3, "name": product.name, "item": `https://pournogravy.com/product/${product.id}` }
    ]
  };

  return (
    <div className={`min-h-screen pt-24 md:pt-28 ${isPreview ? "mt-10" : ""}`}>
      {isPreview && (
        <div className="fixed top-0 inset-x-0 z-50 bg-[#fde047] text-black py-2 px-4 flex items-center justify-center gap-3 text-sm font-display tracking-widest">
          <span>⚠ PREVIEW MODE — not live</span>
          <button
            onClick={() => window.close()}
            className="text-xs underline underline-offset-2 opacity-70 hover:opacity-100"
          >
            close
          </button>
        </div>
      )}
      {/* Prev/Next product navigation arrows */}
      {prevProduct && (
        <Link
          to={`/product/${prevProduct.id}`}
          aria-label={`Previous: ${prevProduct.name}`}
          className="fixed left-2 md:left-4 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/20 hover:bg-black/50 border border-white/10 hover:border-[#fde047]/40 text-white/50 hover:text-[#fde047] transition-all duration-200 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      )}
      {nextProduct && (
        <Link
          to={`/product/${nextProduct.id}`}
          aria-label={`Next: ${nextProduct.name}`}
          className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/20 hover:bg-black/50 border border-white/10 hover:border-[#fde047]/40 text-white/50 hover:text-[#fde047] transition-all duration-200 backdrop-blur-sm"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
      )}

      <SEO
        title={product.og_title || product.name}
        description={
          product.og_description ||
          product.humor ||
          product.description ||
          'Bartender-themed apparel from POURnogravy'
        }
        image={
          product.og_image ||
          product.images?.[0] ||
          product.image ||
          'https://pournogravy.com/pournogravy_back_logo_full.png'
        }
        imageAlt={product.og_title || product.name}
        url={`https://pournogravy.com/product/${product.id}`}
        type="product"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <link rel="canonical" href={`https://pournogravy.com/product/${product.id}`} />
      </Helmet>
      <div className="container mx-auto px-4">
        {/* Back link */}
        <a
          href="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors py-3 group mb-4 font-display tracking-widest uppercase"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Shop
        </a>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li><a href="/" className="hover:text-[#fde047] transition-colors">Home</a></li>
            <li className="opacity-40">/</li>
            <li><a href="/shop" className="hover:text-[#fde047] transition-colors">Shop</a></li>
            <li className="opacity-40">/</li>
            <li className="text-white/70">{product.name}</li>
          </ol>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 md:gap-16 pb-12 items-start">
          {/* Gallery — sticky so it travels with the user while they read copy */}
          <div className="space-y-4 md:sticky md:top-24 md:self-start">
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
                  alt={`${product.name} — view ${activeImage + 1}`}
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
              <div className="absolute top-3 right-3 z-10">
                <ShareButton
                  productName={product.name}
                  productUrl={`/product/${product.id}`}
                  productImage={product.images?.[0]
                    ? (product.images[0].startsWith('http') ? product.images[0] : `https://pournogravy.com${product.images[0]}`)
                    : undefined}
                  compact={true}
                />
              </div>
            </motion.div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex gap-2">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`relative h-20 w-20 border-2 overflow-hidden transition-all bg-muted ${
                      i === activeImage
                        ? "border-[#fde047] opacity-100"
                        : "border-transparent opacity-50 hover:opacity-80 hover:border-white/50"
                    }`}
                    style={
                      i === activeImage
                        ? { boxShadow: "0 0 12px rgba(253,224,71,0.4)" }
                        : undefined
                    }
                  >
                    <img
                      src={img}
                      alt={`${product.name} — view ${i + 1}`}
                      className="w-full h-full object-contain"
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
              <h1 className="font-display text-3xl md:text-5xl tracking-wider leading-[0.95]">
                {product.name}
              </h1>

              {avgRating !== null && (
                <div className="flex items-center gap-1.5 mt-2">
                  <StarRow rating={avgRating} />
                  <span className="text-xs text-muted-foreground">
                    {avgRating.toFixed(1)}
                  </span>
                  <a
                    href="#reviews"
                    className="text-xs text-muted-foreground hover:text-[#fde047] transition-colors underline underline-offset-2"
                  >
                    {reviews!.length} {reviews!.length === 1 ? 'review' : 'reviews'} ↓
                  </a>
                </div>
              )}
              {product.section_visibility?.humor !== false && (product.subheading || product.humor) && (
                <div
                  className="font-marker text-sm md:text-base tracking-[0.15em] text-[#fde047] italic mt-3"
                  style={{ textShadow: "0 0 8px rgba(253,224,71,0.4)" }}
                >
                  {(product.subheading || product.humor || '').startsWith('<')
                    ? <span dangerouslySetInnerHTML={{ __html: product.subheading || product.humor || '' }} />
                    : <span>{product.subheading || product.humor}</span>}
                </div>
              )}


            </div>

            {(product.sectionOrder ?? ["humor", "description", "longDescription", "badAdvice"]).map((sectionId) => {
              if (sectionId === "description" && product.section_visibility?.description !== false && product.description) return (
                <div key="description" className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  {product.description.startsWith('<')
                    ? <div dangerouslySetInnerHTML={{ __html: product.description }} />
                    : <p>{product.description}</p>}
                </div>
              );
              if (sectionId === "longDescription" && product.section_visibility?.longDescription !== false && product.longDescription?.length) return (
                <div key="longDescription" className="space-y-4">
                  {product.longDescription.map((para, i) => (
                    <div key={i} className="text-muted-foreground text-sm md:text-base leading-relaxed">
                      {para.startsWith('<')
                        ? <div dangerouslySetInnerHTML={{ __html: para }} />
                        : <RichText html={para} />}
                    </div>
                  ))}
                </div>
              );
              if (sectionId === "badAdvice" && product.section_visibility?.badAdvice !== false && product.badAdvice && product.badAdvice.paragraphs.length > 0) return (
                <div
                  key="badAdvice"
                  className="relative border-2 border-[#fde047]/60 bg-black/40 p-6 rough-border"
                  style={{ boxShadow: "0 0 24px rgba(253,224,71,0.15), inset 0 0 30px rgba(253,224,71,0.06)" }}
                >
                  <p
                    className="font-marker text-sm tracking-[0.3em] text-[#fde047] uppercase mb-4"
                    style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
                  >
                    ☠ {product.badAdvice.title || "Bad Bartender Advice"}
                  </p>
                  <div className="space-y-3">
                    {product.badAdvice.paragraphs.map((para, i) => (
                      para.startsWith('<')
                        ? <div key={i} className="text-lg text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: para }} />
                        : <p key={i} className="text-lg text-foreground/80 leading-relaxed">{para}</p>
                    ))}
                  </div>
                </div>
              );
              return null;
            })}

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

            {/* Style switcher — shown when product belongs to a group */}
            {groupMembers && groupMembers.length > 0 && (() => {
              // Derive short labels by stripping the longest common prefix
              const allNames = [product.name, ...groupMembers.map((m) => m.name)];
              const commonPrefixLen = (() => {
                let len = 0;
                const first = allNames[0];
                outer: for (let i = 0; i < first.length; i++) {
                  for (const name of allNames.slice(1)) {
                    if (name[i]?.toLowerCase() !== first[i]?.toLowerCase()) break outer;
                  }
                  len = i + 1;
                }
                return len;
              })();
              const shortLabel = (name: string) => {
                const stripped = name.slice(commonPrefixLen).trim();
                if (!stripped) return name.slice(0, 20);
                return stripped.length > 20 ? stripped.slice(0, 20) + "…" : stripped;
              };

              return (
                <div>
                  <p className="font-marker text-[11px] tracking-[0.25em] text-[#ff1744] uppercase mb-2">Style</p>
                  <div className="flex flex-wrap gap-2">
                    {/* Current product pill (active) */}
                    <button
                      className="px-4 py-1.5 text-xs font-display tracking-wider border-2 border-[#fde047] bg-[#fde047] text-black transition-all"
                      style={{ boxShadow: "0 0 12px rgba(253,224,71,0.3)" }}
                      disabled
                    >
                      {shortLabel(product.name)}
                    </button>
                    {/* Other group members */}
                    {groupMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => navigate(`/product/${m.slug}`)}
                        className="px-4 py-1.5 text-xs font-display tracking-wider border-2 border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-all"
                      >
                        {shortLabel(m.name)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="border-t border-border/40 pt-6 space-y-6">
              <p className="text-2xl md:text-3xl font-display tracking-wider">
                ${product.price.toFixed(2)}
              </p>
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-display tracking-widest uppercase text-muted-foreground">Size</span>
                  <div className="flex items-center gap-3">
                    {selectedSize && (
                      <p className="text-xs text-muted-foreground">
                        Selected: <span className="text-foreground font-display">{selectedSize}</span>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      className="text-xs text-[#fde047] underline underline-offset-2 hover:no-underline transition-all"
                    >
                      Size Guide
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 min-w-[56px] px-3 border-2 text-sm font-display tracking-wider transition-all ${
                        selectedSize === size
                          ? "bg-[#fde047] text-black border-[#fde047]"
                          : "border-white/30 text-white/70 hover:border-white hover:text-white"
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

              {/* Add to bag — or drop coming soon */}
              {showDropComingSoon ? (
                <div className="space-y-3 border border-border/50 rounded p-4 bg-muted/10">
                  <p className="text-sm font-display tracking-widest text-muted-foreground">
                    Drop coming soon — get on the list
                  </p>
                  {subscribed ? (
                    <p className="text-sm text-[#fde047] font-marker tracking-wider">
                      You're on the list.
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={subscribeEmail}
                        onChange={(e) => setSubscribeEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                        className="flex-1 bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#fde047]/60"
                      />
                      <Button
                        onClick={handleSubscribe}
                        disabled={!subscribeEmail.trim() || subscribing}
                        className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest text-xs px-4 disabled:opacity-40"
                      >
                        {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : "NOTIFY ME"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleAdd}
                  disabled={!selectedSize || stripeLoading}
                  className={`w-full h-14 font-display text-lg tracking-widest transition-all ${selectedSize ? "bg-[#fde047] text-black hover:bg-[#fde047]/90" : "bg-transparent border-2 border-[#fde047]/60 text-[#fde047]"}`}
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
                        {selectedSize ? "PUT IT ON MY TAB" : "SELECT A SIZE"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              )}

              {/* Shipping perks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-4 w-4 text-[#fde047]" />
                  <span>Free ship over $75</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RotateCcw className="h-4 w-4 text-[#fde047]" />
                  <span>30-day returns</span>
                </div>
              </div>

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

        {/* Size guide modal */}
        {sizeGuideOpen && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSizeGuideOpen(false)}
          >
            <div
              className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg tracking-wider">SIZE GUIDE</h3>
                <button onClick={() => setSizeGuideOpen(false)} aria-label="Close size guide"
                  className="text-muted-foreground hover:text-white">✕</button>
              </div>
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="pb-2 text-left">Size</th>
                    <th className="pb-2">Chest (in)</th>
                    <th className="pb-2">Length (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {[
                    ['XS', '31-34', '27'],
                    ['S', '34-37', '28'],
                    ['M', '38-41', '29'],
                    ['L', '42-45', '30'],
                    ['XL', '46-49', '31'],
                    ['2XL', '50-53', '32'],
                  ].map(([size, chest, length]) => (
                    <tr key={size}>
                      <td className="py-2 text-left font-medium">{size}</td>
                      <td className="py-2">{chest}</td>
                      <td className="py-2">{length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-4">Unisex fit. When in doubt, size up.</p>
            </div>
          </div>
        )}

        {/* Reviews */}
        <section id="reviews" className="pt-12 pb-8 border-t border-border">
          <h2 className="font-display text-2xl md:text-3xl tracking-wider mb-8">REVIEWS</h2>

          {reviews && reviews.length === 0 && (
            <p className="text-muted-foreground text-sm mb-8">
              Be the first to review this product.
            </p>
          )}

          {reviews && reviews.length > 0 && (
            <div className="space-y-6 mb-10">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-border pb-5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StarRow rating={r.rating} />
                      <span className="font-medium text-sm">{r.reviewer_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  {r.body && <p className="text-sm text-muted-foreground mt-1">{r.body}</p>}
                </div>
              ))}
            </div>
          )}

          {reviewSubmitted ? (
            <p className="text-sm text-[#fde047] font-marker tracking-wider">
              Thanks — your review is pending approval.
            </p>
          ) : (
            <div className="max-w-lg space-y-4">
              <h3 className="font-display tracking-widest text-sm uppercase">Leave a Review</h3>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewRating(n)}
                      aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
                      className="p-3 transition-transform hover:scale-110 -m-1"
                    >
                      <Star
                        className="h-6 w-6"
                        fill={n <= reviewRating ? "#fde047" : "none"}
                        stroke={n <= reviewRating ? "#fde047" : "currentColor"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Your name"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#fde047]/60"
                />
              </div>

              <div>
                <textarea
                  placeholder="Your review (optional)"
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#fde047]/60 resize-none"
                />
              </div>

              <Button
                onClick={() => submitReview.mutate()}
                disabled={!reviewName.trim() || reviewRating === 0 || submitReview.isPending}
                className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest"
              >
                {submitReview.isPending ? "Submitting…" : "SUBMIT REVIEW"}
              </Button>
              {submitReview.isError && (
                <p className="text-xs text-destructive">Something went wrong. Try again.</p>
              )}
            </div>
          )}
        </section>

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

const StarRow = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className="h-3.5 w-3.5"
        fill={n <= Math.round(rating) ? "#fde047" : "none"}
        stroke={n <= Math.round(rating) ? "#fde047" : "currentColor"}
      />
    ))}
  </div>
);

export default ProductDetail;
