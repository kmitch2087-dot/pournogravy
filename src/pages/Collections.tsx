import { Link } from "react-router-dom";
import { collections, products } from "@/data/products";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const Collections = () => {
  return (
    <div className="min-h-screen pt-24 md:pt-28 relative">
      <div className="absolute inset-0 -z-10">
        <img src="/src/assets/karen3-bg.jpg" alt="" className="w-full h-full object-cover opacity-50" />
      </div>
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="font-display text-5xl md:text-7xl tracking-wider">COLLECTIONS</h1>
          <p className="font-marker text-muted-foreground text-sm mt-2 stamp-rotate inline-block">
            Curated chaos for every type of service industry survivor.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 pb-20">
          {collections.map((col, i) => {
            const count = products.filter((p) => p.category === col.id).length;
            return (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/shop?collection=${col.id}`}
                  className="group block border-2 border-foreground/10 rough-border p-8 md:p-12 hover:border-foreground/30 transition-colors noise-overlay"
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <h2 className="font-display text-3xl md:text-4xl tracking-wider group-hover:text-primary transition-colors">
                        <span className="mr-3">{col.emoji}</span>{col.name.toUpperCase()}
                      </h2>
                      <p className="font-marker text-muted-foreground text-xs mt-3 max-w-sm">{col.description}</p>
                      <p className="text-xs text-muted-foreground mt-4 font-display tracking-widest">
                        {count} PRODUCT{count !== 1 ? "S" : ""} ☠
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mt-2" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Collections;
