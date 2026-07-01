import SEO from "@/components/SEO";
import { SponsorAd } from "@/components/SponsorAd";
import { useSiteContent } from "@/context/SiteContentContext";
import { RichText } from "@/components/RichText";
import { DropShopBanner } from "@/components/DropShopBanner";
import ProductCard from "@/components/ProductCard";
import { useEffect, useMemo, useState } from "react";
import { useMergedProducts } from "@/lib/productSource";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X, ArrowUpDown } from "lucide-react";

const Shop = () => {
  const { getValue } = useSiteContent();
  const { data: mergedProducts } = useMergedProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "default");

  // Keep URL in sync so search + sort state is shareable/back-button friendly
  useEffect(() => {
    if (query.trim()) {
      searchParams.set("q", query.trim());
    } else {
      searchParams.delete("q");
    }
    if (sortBy !== "default") {
      searchParams.set("sort", sortBy);
    } else {
      searchParams.delete("sort");
    }
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sortBy]);


  const { data: shippingSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("free_shipping_threshold_cents")
        .eq("id", 1)
        .maybeSingle();
      return data as { free_shipping_threshold_cents: number | null } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const thresholdDollars = Math.round((shippingSettings?.free_shipping_threshold_cents ?? 7500) / 100);

  // Only published products are visible to shoppers. Drafts are hidden.
  const visible = useMemo(
    () => (mergedProducts ?? []).filter((p) => p.published === true),
    [mergedProducts]
  );

  // Count how many products share each product_group_id (for the "X+ styles" badge)
  const groupSizeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of visible) {
      if (p.product_group_id) {
        map.set(p.product_group_id, (map.get(p.product_group_id) ?? 0) + 1);
      }
    }
    return map;
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = visible.filter((p) => {
      return (
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
    if (sortBy === "price-asc") return [...base].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") return [...base].sort((a, b) => b.price - a.price);
    if (sortBy === "alpha") return [...base].sort((a, b) => a.name.localeCompare(b.name));
    // Default: sort by display_order ASC, then by name as tiebreaker
    return [...base].sort((a, b) => {
      const ao = a.display_order ?? 0;
      const bo = b.display_order ?? 0;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  }, [query, sortBy, visible]);

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <SEO
        title="Shop"
        description="Browse the full Pournogravy collection — tees for bartenders, by bartenders. Wear your war stories. Free shipping on orders over $50."
        url="https://pournogravy.com/shop"
        imageAlt="POURnogravy shop — bartender apparel"
      />
      {/* Drop Shop Banner */}
      <DropShopBanner />

      {/* Free shipping banner */}
      {thresholdDollars > 0 && (
        <div className="bg-[#fde047]/10 border-b border-[#fde047]/20 py-2 px-4 text-center">
          <p className="font-marker text-xs tracking-widest text-[#fde047] uppercase">
            🚚 Free shipping on orders over ${thresholdDollars}
          </p>
        </div>
      )}

      {/* Hero band */}
      <section className="relative bg-black text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(253,224,71,0.18), transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(255,23,68,0.12), transparent 50%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, #fde047 50%, transparent)",
            boxShadow: "0 0 20px rgba(253,224,71,0.5)",
          }}
        />
        <div className="container mx-auto px-4 pt-5 pb-6 md:pt-8 md:pb-10 relative">
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none">
            <RichText html={getValue("shop", "header", "heading", "SHOP")} />
          </h1>
          <p
            className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mt-3"
            style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
          >
            <RichText html={getValue("shop", "header", "subheading", "Wear your frustration. Literally.")} />
          </p>
        </div>
      </section>

      {/* Filters + grid */}
      <div className="container mx-auto px-4">
        {/* Filters */}
        <div className="sticky top-16 md:top-20 z-30 -mx-4 px-4 bg-background/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3 py-4">
            {/* Search input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="w-full pl-8 pr-8 py-2 text-xs bg-transparent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#fde047] transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-transparent border border-border text-muted-foreground focus:outline-none focus:border-[#fde047] py-1.5 px-2 cursor-pointer"
              >
                <option value="default">Featured</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="alpha">A → Z</option>
              </select>
              <p className="font-marker text-xs tracking-widest text-muted-foreground uppercase whitespace-nowrap hidden sm:block">
                {filtered.length} item{filtered.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {/* Sponsor banner — renders nothing when no active sponsor */}
        <SponsorAd placement="shop_banner" />

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 py-10 pb-20">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
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
                  <ProductCard
                    product={product}
                    priority={i < 3}
                    groupSize={product.product_group_id ? groupSizeMap.get(product.product_group_id) : undefined}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center">
            <p className="font-marker text-xl md:text-2xl tracking-wider text-muted-foreground uppercase">
              Nothing here yet.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              {query
                ? `No results for "${query}" — try a different search.`
                : "Check back after our next shift."}
            </p>
            {query && (
              <button onClick={() => setQuery("")} className="mt-4 text-xs text-[#fde047] hover:underline">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
