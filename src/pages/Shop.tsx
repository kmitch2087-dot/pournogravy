import ProductCard from "@/components/ProductCard";
import { products, collections } from "@/data/products";
import { useState } from "react";

const Shop = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = activeFilter === "all"
    ? products
    : products.filter((p) => p.category === activeFilter);

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-display text-5xl md:text-7xl tracking-wider">SHOP</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Wear your frustration. Literally.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 text-xs font-display tracking-widest border transition-colors ${
              activeFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            ALL
          </button>
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveFilter(col.id)}
              className={`px-4 py-2 text-xs font-display tracking-widest border transition-colors ${
                activeFilter === col.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {col.name.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-20">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Shop;
