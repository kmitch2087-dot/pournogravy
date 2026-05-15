import SEO from "@/components/SEO";
import { DropShopBanner } from "@/components/DropShopBanner";
import ProductCard from "@/components/ProductCard";
import { products, collections } from "@/data/products";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get("collection") || "all";
  const [activeFilter, setActiveFilter] = useState(initial);
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Keep URL in sync so filter + search state is shareable/back-button friendly
  useEffect(() => {
    if (activeFilter === "all") {
      searchParams.delete("collection");
    } else {
      searchParams.set("collection", activeFilter);
    }
    if (query.trim()) {
      searchParams.set("q", query.trim());
    } else {
      searchParams.delete("q");
    }
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, query]);

  // Only published products are visible to shoppers. Drafts (anything not
  // explicitly `published: true`) are hidden from the catalog. This is the
  // pre-launch staging gate the owner controls per-product.
  const visible = useMemo(
    () => products.filter((p) => p.published === true),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible.filter((p) => {
      const matchesCollection = activeFilter === "all" || p.category === activeFilter;
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q);
      return matchesCollection && matchesSearch;
    });
  }, [activeFilter, query, visible]);

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
            SHOP
          </h1>
          <p className="text-white/70 text-sm md:text-base mt-3 max-w-md">
            Wear your frustration. Literally.
          </p>
        </div>
      </section>

      {/* Filters + grid */}
      <div className="container mx-auto px-4">
        {/* Filters */}
        <div className="sticky top-16 md:top-20 z-30 -mx-4 px-4 bg-background/90 backdrop-blur-md border-b border-border">
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-3">
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
              <p className="font-marker text-xs tracking-widest text-muted-foreground uppercase whitespace-nowrap ml-auto">
                {filtered.length} Product{filtered.length === 1 ? "" : "s"}
              </p>
            </div>
            {/* Collection filters */}
            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={activeFilter === "all"}
                onClick={() => setActiveFilter("all")}
              >
                All
              </FilterPill>
              {collections.map((col) => (
                <FilterPill
                  key={col.id}
                  active={activeFilter === col.id}
                  onClick={() => setActiveFilter(col.id)}
                >
                  {col.name}
                </FilterPill>
              ))}
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
              {query ? `No results for "${query}" — try a different search.` : "Try another filter — or check back after our next shift."}
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

const FilterPill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-xs font-display tracking-widest uppercase border transition-all ${
      active
        ? "bg-[#fde047] text-black border-[#fde047]"
        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
    }`}
    style={
      active
        ? { boxShadow: "0 0 16px rgba(253,224,71,0.4)" }
        : undefined
    }
  >
    {children}
  </button>
);

export default Shop;
