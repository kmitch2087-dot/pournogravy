import SEO from "@/components/SEO";
import { useSiteContent } from "@/context/SiteContentContext";
import { DropShopBanner } from "@/components/DropShopBanner";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X, ArrowUpDown } from "lucide-react";

const Shop = () => {
  const { getValue } = useSiteContent();
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

  // Only published products are visible to shoppers. Drafts (anything not
  // explicitly `published: true`) are hidden from the catalog.
  const visible = useMemo(
    () => products.filter((p) => p.published === true),
    []
  );

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
    return base;
  }, [query, sortBy, visible]);

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <SEO
        title="Shop"
        description="Browse the full Pournogravy collection — tees for bartenders, by bartenders. Wear your war stories. Free shipping on orders over $50."
        url="https://pournogravy.com/shop"
      />
      {/* Drop Shop Banner */}
      <DropShopBanner />

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
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <p
            className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-3"
            style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
          >
            The whole catalog
          </p>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none">
            {getValue("shop", "header", "heading", "SHOP")}
          </h1>
          <p className="text-white/70 text-sm md:text-base mt-3 max-w-md">
            {getValue("shop", "header", "subheading", "Wear your frustration. Literally.")}
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
                  <ProductCard product={product} />
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
