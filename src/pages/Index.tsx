import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import { products, quotes } from "@/data/products";
import { DropHeroBanner } from "@/components/DropHeroBanner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TICKER_ITEMS = [
  "Offend a Karen without having to open your mouth.",
  "Go out and show fellow bartenders that you're a bartender too without having to verbally announce it (You entitled freak!).",
  "Call out the general public on certain undesirable behaviors.",
  "THEY'RE NOT CUSTOMERS! THEY'RE GUESTS!...OH, SHUT UP!!!",
  ...quotes,
];

// Hero carousel config — slide 0 is the glass headline, the rest feature shirts.
// Product IDs are pulled from products.ts at runtime so name/price/humor stay
// in sync with your data; if a product isn't found OR isn't published it's
// silently skipped (so the hero never tries to feature a draft).
const HERO_PRODUCT_IDS = [
  "well-it-ain-t-gonna-lick-itself-tee",   // Cinco de Mayo / Grand Opening drop — anchor
  "last-call-for-karen-tee",
  "the-finger-tee",
  "service-bartender-do-not-approach-tee",
];

// Per-slide duration. Slide 0 (the glass headline) flashes by quickly so visitors
// land on the actual product carousel fast; product slides linger long enough
// to read the name + zinger + price.
const HERO_DURATIONS_MS = {
  intro: 3500,
  product: 5000,
};
// (slide duration is computed inline below using the heroSlides array)

const Index = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0); // ALWAYS starts at 0 on mount
  const [heroPaused, setHeroPaused] = useState(false);
  // First-load only: show the bare logo background for 3s before the glass
  // headline stamps in, and freeze the auto-rotation timer until then. After
  // the carousel cycles back to the intro slide later, the glass appears
  // immediately like it does on every other slide.
  const [introHoldElapsed, setIntroHoldElapsed] = useState(false);
  const INTRO_HOLD_MS = 3000;
  // Featured row only shows published products. During pre-launch this is the
  // 5–6 launch lineup; new drafts the owner adds later won't appear until he
  // toggles them on from the dashboard.
  const featured = products
    .filter((p) => p.published === true && p.featured)
    .slice(0, 6);

  // Build hero slides: headline first, then product slides (only published & resolved).
  // The intro headline is re-inserted between every product slide so it acts as a
  // recurring "anchor" between drops.
  const heroProducts = HERO_PRODUCT_IDS
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.published === true);

  // slides: 'intro' | { type: 'product', product }
  type HeroSlide = { type: "intro" } | { type: "product"; product: typeof heroProducts[number] };
  const heroSlides: HeroSlide[] = [];
  heroProducts.forEach((p) => {
    heroSlides.push({ type: "intro" });
    heroSlides.push({ type: "product", product: p });
  });
  if (heroSlides.length === 0) heroSlides.push({ type: "intro" });
  const totalSlides = heroSlides.length;

  // Rotate quote every 6s, respect prefers-reduced-motion
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // First-load intro hold: keep the glass hidden for 3s after mount.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setIntroHoldElapsed(true);
      return;
    }
    const id = setTimeout(() => setIntroHoldElapsed(true), INTRO_HOLD_MS);
    return () => clearTimeout(id);
  }, []);

  // Hero auto-rotation — reset whenever index changes (so manual clicks
  // restart the timer) or pause state flips. Per-slide duration so the
  // intro slide moves faster than the product slides. The very first intro
  // slide also waits for the bare-background hold to elapse before counting.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || heroPaused || totalSlides <= 1) return;
    if (!introHoldElapsed && heroIndex === 0) return;
    const id = setTimeout(() => {
      setHeroIndex((i) => (i + 1) % totalSlides);
    }, heroSlides[heroIndex]?.type === "intro" ? HERO_DURATIONS_MS.intro : HERO_DURATIONS_MS.product);
    return () => clearTimeout(id);
  }, [heroIndex, heroPaused, totalSlides, introHoldElapsed]);

  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <SEO
        title="Home"
        description="Bartender-themed apparel for the people who pour for a living. Because someone has to deal with the public, and it might as well be stylish."
        url="https://pournogravy.com"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Pournogravy",
          "url": "https://pournogravy.com",
          "logo": "https://pournogravy.com/logo.webp",
          "description": "Bartender-themed apparel for the people who pour for a living.",
          "sameAs": [],
        }}
      />
      {/* Drop Hero Banner — shown above carousel when a drop is live */}
      <DropHeroBanner />

      {/* Hero carousel — slide 0 is the glass headline, rest are shirts.
          Section-wide hover pause was removed by request — only hovering the
          dot indicators below pauses the rotation, so a customer reading a
          shirt blurb still moves on without having to look away. */}
      <section
        className="relative min-h-[90vh] overflow-hidden noise-overlay bg-black"
        aria-roledescription="carousel"
        aria-label="Pournogravy hero"
      >
        {/* ---- Slides: intro headline interleaved between product slides ---- */}
        {heroSlides.map((slide, slideIdx) => {
          const active = heroIndex === slideIdx;

          if (slide.type === "intro") {
            return (
              <div
                key={`intro-${slideIdx}`}
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
                  active ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slideIdx + 1} of ${totalSlides}: intro`}
                aria-hidden={!active}
              >
                <div className="absolute inset-x-0 bottom-0 top-6 md:top-10">
                  <img
                    src="/hero-bg.jpg"
                    alt=""
                    className="w-full h-full object-contain object-top"
                    loading="eager"
                    decoding="async"
                  />
                </div>

                <div className="relative z-10 container mx-auto px-4 text-center">
                  {/* On the very first visit, hold the bare logo background for
                      INTRO_HOLD_MS, then stamp the glass container in. After
                      the carousel cycles back here, the content shows
                      immediately like every other slide. */}
                  {(introHoldElapsed || slideIdx > 0) && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.4, rotate: -18 }}
                        animate={active ? { opacity: 1, scale: 1, rotate: -2 } : { opacity: 0, scale: 0.4, rotate: -18 }}
                        transition={{ type: "spring", stiffness: 380, damping: 14, mass: 0.9, delay: 0.4 }}
                        className="inline-block bg-primary/20 backdrop-blur-md rounded-2xl px-8 py-6 md:px-14 md:py-10"
                      >
                        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-wider mb-0 text-primary-foreground">
                          MILDLY OFFENSIVE<br />
                          BARTENDER APPAREL<br />
                          FOR THE{" "}
                          <span className="font-marker stamp-rotate inline-block text-[#ff1744] drop-shadow-[0_0_12px_rgba(255,23,68,0.8)] drop-shadow-[0_0_40px_rgba(255,23,68,0.4)]">MILDLY</span><br />
                          OFFENSIVE BARTENDER.
                        </h1>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ delay: 0.9, duration: 0.5 }}
                      >
                        <Link to="/shop">
                          <Button className="h-14 px-10 font-display text-lg tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                            SHOP THE DROP <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            );
          }

          const { product } = slide;
          return (
            <div
              key={`product-${slideIdx}-${product.id}`}
              className={`absolute inset-0 flex items-start sm:items-center pt-6 sm:pt-2 transition-opacity duration-700 ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIdx + 1} of ${totalSlides}: ${product.name}`}
              aria-hidden={!active}
            >
              {/* Backdrop: dark with layered neon glows */}
              <div className="absolute inset-0 bg-black" />
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse at 20% 30%, rgba(253,224,71,0.2), transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(255,23,68,0.18), transparent 50%)",
                }}
              />

              <div className="relative z-10 container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-3 md:gap-12 items-center">
                  {/* Product image — taped polaroid vibe */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
                    animate={
                      active
                        ? { opacity: 1, scale: 1, rotate: -2 }
                        : { opacity: 0, scale: 0.9, rotate: -3 }
                    }
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="order-2 md:order-1 relative mx-auto max-w-[180px] sm:max-w-sm md:max-w-md w-full"
                  >
                    <div
                      className="relative aspect-square bg-muted border-[12px] border-white/90 shadow-2xl overflow-hidden"
                      style={{
                        boxShadow:
                          "0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(253,224,71,0.15)",
                      }}
                    >
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading={slideIdx <= 3 ? "eager" : "lazy"}
                          decoding="async"
                        />
                      )}
                    </div>
                    {/* Stamp badge */}
                    {product.badge && (
                      <div
                        className="absolute -top-3 -right-3 bg-[#fde047] text-black px-4 py-1.5 font-marker text-xs tracking-widest uppercase stamp-rotate"
                        style={{ boxShadow: "0 0 20px rgba(253,224,71,0.5)" }}
                      >
                        {product.badge}
                      </div>
                    )}
                  </motion.div>

                  {/* Copy */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                    className="order-1 md:order-2 text-white text-center md:text-left"
                  >
                    <p
                      className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-2 md:mb-4"
                      style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
                    >
                      ☠ Featured drop
                    </p>
                    <h2 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-wider leading-[0.95] mb-2 md:mb-4">
                      {product.name.toUpperCase()}
                    </h2>
                    {product.humor && (
                      <p className="font-marker text-sm md:text-lg text-white/80 italic mb-2 md:mb-6 max-w-md mx-auto md:mx-0">
                        "{product.humor}"
                      </p>
                    )}
                    <p className="font-display text-xl md:text-3xl tracking-wider mb-3 md:mb-6">
                      ${product.price.toFixed(2)}
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <Link to={`/product/${product.id}`}>
                        <Button
                          className="h-12 px-8 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90"
                          style={{ boxShadow: "0 0 20px rgba(253,224,71,0.35)" }}
                        >
                          <span className="flex flex-col leading-tight text-left">HOOK IT UP.<span className="text-xs tracking-normal font-sans">(Not so much ice.)</span></span><ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                        </Button>
                      </Link>
                      <Link to="/shop">
                        <Button
                          variant="outline"
                          className="h-12 px-8 font-display tracking-widest bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-[#fde047] hover:border-[#fde047]/50"
                        >
                          ALL DESIGNS
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ---- Dot indicators ----
            Hovering the dots pauses the rotation so a visitor can pick the
            slide they actually want to look at. Moving away resumes auto-play. */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 px-3 py-2"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          onFocus={() => setHeroPaused(true)}
          onBlur={() => setHeroPaused(false)}
        >
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={heroIndex === i}
              className={`h-1.5 rounded-full transition-all ${
                heroIndex === i
                  ? "w-10 bg-[#fde047]"
                  : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
              style={
                heroIndex === i
                  ? { boxShadow: "0 0 10px rgba(253,224,71,0.6)" }
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Neon marquee strip */}
      <section
        aria-hidden="true"
        className="relative border-y-2 border-[#fde047]/40 bg-black py-4 overflow-hidden"
        style={{
          boxShadow:
            "inset 0 0 40px rgba(253,224,71,0.15), 0 0 20px rgba(253,224,71,0.2)",
        }}
      >
        <div
          className="flex whitespace-nowrap"
          style={{ animation: "marquee-scroll 22s linear infinite" }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((q, i) => (
            <span
              key={i}
              className="mx-10 font-marker text-sm md:text-base tracking-widest uppercase text-[#fde047]"
              style={{
                textShadow:
                  "0 0 8px rgba(253,224,71,0.8), 0 0 20px rgba(253,224,71,0.4)",
              }}
            >
              ☠ {q}
            </span>
          ))}
        </div>
      </section>

      {/* Intro / pitch band */}
      <section className="relative noise-overlay overflow-hidden">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(253,224,71,0.08), transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,23,68,0.08), transparent 50%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)",
          }}
        />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="font-marker text-sm tracking-widest text-[#fde047] mb-4 uppercase">
                Unapologetic AF
              </p>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-wider mb-4">
                SHIRTS THAT<br />
                SPEAK LOUDER<br />
                <span className="font-marker stamp-rotate inline-block text-[#ff1744]">
                  THAN TIPS.
                </span>
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                Built for the bartenders who stopped pretending. The ones who smile with their teeth, side-eye with their soul, and cut you off with their reputation. If your shift ends with a drink and a grudge — you're home.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/shop">
                  <Button className="h-12 px-8 font-display tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                    ORDER A ROUND <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="outline" className="h-12 px-8 font-display tracking-widest">
                    MY STORY
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section
        className="relative noise-overlay"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 50%, hsl(var(--background)) 100%)",
        }}
      >
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="flex items-end justify-between mb-10 md:mb-14">
            <div>
              <p className="font-marker text-xs md:text-sm tracking-widest text-[#fde047] mb-2 uppercase">
                The lineup
              </p>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-wider leading-none">
                FEATURED
              </h2>
              <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-md">
                The shirts that start conversations. And bar fights.
              </p>
            </div>
            <Link
              to="/shop"
              className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-display tracking-widest uppercase"
            >
              See the full menu <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {featured.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative"
              >
                {/* neon halo on hover */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(253,224,71,0.25), transparent 70%)",
                    filter: "blur(20px)",
                  }}
                />
                <div className="relative">
                  <ProductCard product={product} />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/shop">
              <Button
                variant="outline"
                className="h-14 px-12 font-display text-lg tracking-widest border-2 border-foreground/20 hover:bg-[#fde047] hover:text-black hover:border-[#fde047] transition-colors"
              >
                THE FULL MENU <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Rotating quote */}
      <section className="relative border-y-2 border-foreground/20 rough-border noise-overlay overflow-hidden">
        <div
          className="absolute inset-0 -z-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,23,68,0.12), transparent 60%)",
          }}
        />
        <div className="container mx-auto px-4 py-24 md:py-32 text-center relative">
          <p className="font-marker text-xs tracking-[0.3em] text-[#fde047] mb-6 uppercase">
            Bad Bartender Advice
          </p>
          <div className="relative min-h-[140px] md:min-h-[200px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={quoteIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="font-marker text-2xl md:text-4xl lg:text-5xl tracking-wider leading-tight max-w-4xl mx-auto stamp-rotate"
              >
                "{quotes[quoteIndex].toUpperCase()}"
              </motion.blockquote>
            </AnimatePresence>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-8 font-display tracking-widest uppercase">
            — Every Bartender Ever
          </p>

          {/* dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {quotes.map((_, i) => (
              <button
                key={i}
                aria-label={`Show quote ${i + 1}`}
                onClick={() => setQuoteIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === quoteIndex ? "w-8 bg-[#fde047]" : "w-1.5 bg-foreground/20 hover:bg-foreground/40"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Email Signup — full-bleed dark band */}
      <section className="relative bg-black text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(253,224,71,0.2), transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(255,23,68,0.15), transparent 50%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, #fde047 50%, transparent)",
            boxShadow: "0 0 20px rgba(253,224,71,0.6)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, #fde047 50%, transparent)",
            boxShadow: "0 0 20px rgba(253,224,71,0.6)",
          }}
        />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-xl mx-auto text-center">
            <p
              className="font-marker text-xs tracking-[0.3em] mb-3 uppercase text-[#fde047]"
              style={{
                textShadow: "0 0 10px rgba(253,224,71,0.6)",
              }}
            >
              No spam. Just shift notes.
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-4">
              JOIN THE SHIFT
            </h2>
            <p className="text-white/60 text-sm md:text-base mb-8">
              Early drops, industry humor, and discounts that actually feel like ones.
            </p>
            {subscribed ? (
              <p className="font-marker text-sm tracking-widest text-[#fde047] uppercase">
                You're on the list. Don't embarrass us.
              </p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!email.trim()) return;
                  setSubscribing(true);
                  const { error } = await supabase.from("email_subscribers").insert({ email: email.trim().toLowerCase(), source: "homepage" });
                  if (error && error.code !== "23505") {
                    toast.error("Something went wrong — try again.");
                  } else {
                    setSubscribed(true);
                    setEmail("");
                  }
                  setSubscribing(false);
                }}
                className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
              >
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#fde047]"
                />
                <Button
                  type="submit"
                  disabled={subscribing}
                  className="h-12 px-6 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90 disabled:opacity-60"
                >
                  {subscribing ? "…" : "SUBSCRIBE"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
