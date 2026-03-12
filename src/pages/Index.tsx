import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import { products, quotes } from "@/data/products";
import { useState } from "react";

const Index = () => {
  const [email, setEmail] = useState("");
  const featured = products.filter((p) => p.featured).slice(0, 8);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden noise-overlay">
        <div className="absolute inset-0">
          <img src="/hero-bg.jpg" alt="" className="w-full h-full object-cover opacity-30" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.9] tracking-wider mb-6 text-grit">
              APPAREL FOR<br />
              BARTENDERS WHO<br />
              HAVE SEEN<br />
              SOME SHIT.
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-muted-foreground text-sm md:text-base tracking-widest uppercase mb-8 font-display"
          >
            Saving My Bar From the Socially Stupid, One Karen at a Time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Link to="/shop">
              <Button className="h-14 px-10 font-display text-lg tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                SHOP NOW <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Marquee quote strip */}
      <section className="border-y border-border bg-muted py-3 overflow-hidden">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...quotes, ...quotes].map((q, i) => (
            <span key={i} className="mx-8 font-display text-sm tracking-wider text-muted-foreground">
              ★ {q}
            </span>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl md:text-5xl tracking-wider">FEATURED</h2>
            <p className="text-muted-foreground text-sm mt-2">The shirts that start conversations. And bar fights.</p>
          </div>
          <Link to="/shop" className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-display tracking-wider">
            VIEW ALL <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link to="/shop">
            <Button variant="outline" className="font-display tracking-widest border-border text-foreground">
              VIEW ALL PRODUCTS
            </Button>
          </Link>
        </div>
      </section>

      {/* Quote Section */}
      <section className="border-y border-border">
        <div className="container mx-auto px-4 py-20 text-center">
          <motion.blockquote
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-5xl tracking-wider leading-tight max-w-4xl mx-auto"
          >
            "I DON'T HAVE A<br />
            DRINKING PROBLEM.<br />
            I HAVE A CUSTOMER<br />
            PROBLEM."
          </motion.blockquote>
          <p className="text-muted-foreground text-sm mt-6 font-display tracking-wider">— EVERY BARTENDER EVER</p>
        </div>
      </section>

      {/* Email Signup */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl tracking-wider mb-4">JOIN THE SHIFT</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Get exclusive drops, industry humor, and discounts. No spam — we're too tired for that.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEmail("");
            }}
            className="flex gap-2 max-w-md mx-auto"
          >
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" className="h-12 px-6 font-display tracking-widest bg-primary text-primary-foreground">
              SUBSCRIBE
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Index;
