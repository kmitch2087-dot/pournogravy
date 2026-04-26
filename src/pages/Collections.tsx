import { Link } from "react-router-dom";
import { collections, products } from "@/data/products";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const Collections = () => {
  return (
    <div className="min-h-screen pt-24 md:pt-28">
      {/* Hero band */}
      <section className="relative bg-black text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 20% 20%, rgba(253,224,71,0.2), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255,23,68,0.15), transparent 50%)",
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p
              className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-3"
              style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
            >
              Curated chaos
            </p>
            <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none">
              COLLECTIONS
            </h1>
            <p className="text-white/70 text-sm md:text-base mt-3 max-w-md">
              For every type of service industry survivor.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Collection cards */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {collections.map((col, i) => {
            const count = products.filter((p) => p.category === col.id).length;
            const preview = products.find((p) => p.category === col.id)?.image;
            return (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative"
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(253,224,71,0.25), transparent 70%)",
                    filter: "blur(24px)",
                  }}
                />
                <Link
                  to={`/shop?collection=${col.id}`}
                  className="relative block border-2 border-foreground/10 hover:border-[#fde047]/50 transition-all p-8 md:p-10 noise-overlay overflow-hidden aspect-[4/3] md:aspect-[5/3]"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)",
                  }}
                >
                  {/* Preview image backdrop if available */}
                  {preview && (
                    <img
                      src={preview}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity"
                      loading="lazy"
                      decoding="async"
                    />
                  )}

                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-3">
                        <span className="mr-2">{col.emoji}</span>
                        {count} Product{count !== 1 ? "s" : ""}
                      </p>
                      <h2 className="font-display text-3xl md:text-5xl tracking-wider leading-[0.95] group-hover:text-[#fde047] transition-colors">
                        {col.name.toUpperCase()}
                      </h2>
                      <p className="font-marker text-muted-foreground text-sm mt-4 max-w-sm leading-relaxed">
                        {col.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-6 font-display text-xs tracking-widest uppercase text-muted-foreground group-hover:text-[#fde047] transition-colors">
                      Shop the set
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Collections;
