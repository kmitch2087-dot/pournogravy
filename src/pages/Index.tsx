import React from "react";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import { quotes } from "@/data/products";
import { useMergedProducts } from "@/lib/productSource";
import { DropHeroBanner } from "@/components/DropHeroBanner";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSiteContent } from "@/context/SiteContentContext";
import { RichText } from "@/components/RichText";

const TICKER_PHRASE = "Drink more, Bitch less, Tip big, Stay moist!";
// 10 copies total (5 per half) — the CSS animation translates -50%, so both halves
// must be identical. 5 copies per half ensures the strip is wider than any viewport.
const TICKER_ITEMS = Array(10).fill(TICKER_PHRASE);

// Fallback product IDs when no active merch drop has products assigned.
const HERO_PRODUCT_IDS = [
  "well-it-ain-t-gonna-lick-itself-tee",
  "last-call-for-karen-tee",
  "the-finger-tee",
  "service-bartender-do-not-approach-tee",
];

const Index = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0); // ALWAYS starts at 0 on mount
  const { getValue } = useSiteContent();
  const { data: allProducts = [] } = useMergedProducts();
  const activeQuotes = quotes.map((fallback, i) => getValue("home", "quotes", `q_${i + 1}`, fallback));
  const [heroPaused, setHeroPaused] = useState(false);
  const heroPauseResumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [glassVisible, setGlassVisible] = useState(false);
  const [slideVisible, setSlideVisible] = useState(false);
  const slidePhase = useRef<'in' | 'out' | 'hidden'>('hidden');
  const logoRef = useRef<HTMLImageElement>(null);

  // Fetch products from the most recent active/scheduled merch drop.
  const { data: dropProductRows } = useQuery({
    queryKey: ["hero-drop-products"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data: drops } = await supabase
        .from("merch_drops")
        .select("id")
        .in("status", ["active", "scheduled"])
        .lte("ad_launch_at", now)
        .order("scheduled_drop_at", { ascending: true })
        .limit(1);
      if (!drops?.length) return [];
      const { data: rows } = await supabase
        .from("merch_drop_products")
        .select("display_order, products(id, slug, is_active)")
        .eq("drop_id", drops[0].id)
        .order("display_order", { ascending: true });
      return ((rows ?? []) as Array<{ display_order: number; products: { id: string; slug: string; is_active: boolean } | null }>)
        .filter(r => r.products?.is_active);
    },
    staleTime: 1000 * 60 * 5,
  });
  const { data: reviews } = useQuery({
    queryKey: ["home-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, product_slug, rating, body")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []) as Array<{ id: string; reviewer_name: string; product_slug: string; rating: number; body: string | null }>;
    },
    staleTime: 1000 * 60 * 10,
  });

  // Featured row only shows published products.
  const featured = allProducts
    .filter((p) => p.published === true && p.featured)
    .slice(0, 6);

  // Hero products: use active drop's product slugs mapped to DB products, else fall back.
  const dropProducts = (dropProductRows ?? [])
    .map(r => allProducts.find(p => p.id === r.products?.slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.published === true);

  const heroProducts = dropProducts.length > 0
    ? dropProducts
    : HERO_PRODUCT_IDS
        .map((id) => allProducts.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.published === true);

  type HeroSlide = { type: "product"; product: typeof heroProducts[number] };
  const heroSlides: HeroSlide[] = heroProducts.map((p) => ({ type: "product" as const, product: p }));
  if (heroSlides.length === 0) {
    const first = allProducts.find(p => p.published);
    if (first) heroSlides.push({ type: "product", product: first });
  }
  const totalSlides = heroSlides.length;

  // Rotate quote every 6s, respect prefers-reduced-motion
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % activeQuotes.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Hero slide orchestrator — inline style transitions on logoRef, no CSS keyframes.
  useEffect(() => {
    if (heroPaused) return;

    const setLogoOpacity = (opacity: number, glowStrength: number, duration: number) => {
      if (!logoRef.current) return;
      logoRef.current.style.transition = `opacity ${duration}ms ease-in-out, filter ${duration}ms ease-in-out`;
      logoRef.current.style.opacity = String(opacity);
      logoRef.current.style.filter = glowStrength > 0
        ? `drop-shadow(0 0 ${glowStrength}px #cddc39) drop-shadow(0 0 ${glowStrength * 2}px rgba(205,220,57,0.35))`
        : 'none';
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGlassVisible(true);
      setSlideVisible(true);
      setLogoOpacity(0.08, 0, 0);
      slidePhase.current = 'in';
      return;
    }

    const HOLD       = 5000;
    const TRANSITION = 1000;
    const GAP        = 3000;

    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let t4: ReturnType<typeof setTimeout>;

    function cycle() {
      // Slides exit + logo rises (1s)
      setGlassVisible(false);
      setSlideVisible(false);
      slidePhase.current = 'out';
      setLogoOpacity(0.5, 14, TRANSITION);

      // After slide-out: hold logo at peak for first half of gap
      t1 = setTimeout(() => {
        slidePhase.current = 'hidden';

        // Mid-gap: logo descends over second half of gap
        t2 = setTimeout(() => {
          setLogoOpacity(0.08, 0, TRANSITION);
          setHeroIndex((prev: number) => (prev + 1) % totalSlides);

          // After descent: slides enter
          t3 = setTimeout(() => {
            setGlassVisible(true);
            setSlideVisible(true);
            slidePhase.current = 'in';

            // Hold, then repeat
            t4 = setTimeout(cycle, HOLD);
          }, TRANSITION);
        }, GAP / 2);
      }, TRANSITION);
    }

    // Initial load: dim logo, brief glow peek, then first slide in
    setLogoOpacity(0.08, 0, 0);
    t1 = setTimeout(() => {
      setLogoOpacity(0.5, 14, 800);
      t2 = setTimeout(() => {
        setLogoOpacity(0.08, 0, 800);
        t3 = setTimeout(() => {
          setGlassVisible(true);
          setSlideVisible(true);
          slidePhase.current = 'in';
          t4 = setTimeout(cycle, HOLD);
        }, 900);
      }, 900);
    }, 300);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      if (logoRef.current) {
        logoRef.current.style.transition = '';
        logoRef.current.style.opacity = '';
        logoRef.current.style.filter = '';
      }
    };
  }, [heroPaused, totalSlides]);

  const handleDotClick = (i: number) => {
    setHeroIndex(i);
    setHeroPaused(true);
    if (heroPauseResumeTimer.current) clearTimeout(heroPauseResumeTimer.current);
    heroPauseResumeTimer.current = setTimeout(() => setHeroPaused(false), 8000);
  };

  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <SEO
        title="Bartender Apparel"
        description="Saving my bar from the socially stupid, one Karen at a time. Mildly offensive bartender t-shirts for service industry survivors."
        url="https://pournogravy.com"
        imageAlt="POURnogravy bartender apparel brand"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "POURnogravy",
            "url": "https://pournogravy.com",
            "logo": "https://pournogravy.com/logo.webp",
            "description": "Mildly offensive bartender apparel for service industry survivors.",
            "sameAs": [
              "https://www.instagram.com/pournogravy",
              "https://www.facebook.com/pournogravy",
              "https://www.tiktok.com/@pournogravy",
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "POURnogravy",
            "url": "https://pournogravy.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://pournogravy.com/shop?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      {/* Drop Hero Banner — shown above carousel when a drop is live */}
      <DropHeroBanner />

      {/* Hero carousel — product slides only. Glass headline lives as a
          persistent top-left overlay so it never competes with the logo. */}
      <section
        className="relative flex flex-col md:block md:min-h-[70vh] overflow-hidden noise-overlay bg-black"
        aria-roledescription="carousel"
        aria-label="Pournogravy hero"
      >
        {/* Persistent dimmed logo background */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            ref={logoRef}
            src="/hero-bg-transparent.webp"
            alt=""
            className="w-full h-full object-contain object-center"
            style={{ opacity: 0.08, filter: 'none' }}
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Glass headline — mobile: stacks below image (order-2, no glass card); desktop: absolute top-left overlay */}
        <div
          className={[
            'relative order-2 w-full px-4 py-4',
            'md:absolute md:top-6 md:left-6 md:w-auto md:max-w-[320px] lg:max-w-[360px]',
            'md:bg-primary/20 md:backdrop-blur-md md:rounded-2xl md:px-7 md:py-6 z-20',
            glassVisible
              ? '[animation:slideInLeft_1s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]'
              : slidePhase.current === 'out'
                ? '[animation:slideOutLeft_1s_cubic-bezier(0.55,0,1,0.45)_forwards]'
                : '-translate-x-[110%]',
          ].join(' ')}
        >
          <h1 className="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl leading-[1] tracking-wider mb-0 text-white md:text-primary-foreground">
            MILDLY OFFENSIVE<br />
            BARTENDER APPAREL<br />
            FOR THE{" "}
            <span className="font-marker stamp-rotate inline-block text-[#ff1744] drop-shadow-[0_0_12px_rgba(255,23,68,0.8)] drop-shadow-[0_0_40px_rgba(255,23,68,0.4)]">MILDLY</span><br />
            OFFENSIVE BARTENDER.
          </h1>
          {/* CTA button: desktop only — mobile CTA lives in its own section below */}
          <Link to="/shop" className="mt-3 hidden md:inline-block">
            <Button className="h-10 px-6 font-display text-sm tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
              {getValue("home", "hero", "cta_text", "OH, YOU KNOW THE OWNER TOO?")} <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* ---- Product slides ---- */}
        <div className="relative order-1 h-[55vw] md:h-auto md:absolute md:inset-0">
        {heroSlides.map((slide, slideIdx) => {
          const active = heroIndex === slideIdx;
          const { product } = slide;
          return (
            <div
              key={`product-${slideIdx}-${product.id}`}
              className={[
                'absolute inset-0 will-change-transform',
                active
                  ? slideVisible
                    ? '[animation:slideInRight_1s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]'
                    : slidePhase.current === 'out'
                      ? '[animation:slideOutRight_1s_cubic-bezier(0.55,0,1,0.45)_forwards]'
                      : 'translate-x-[110%] opacity-0'
                  : 'translate-x-[110%] opacity-0 pointer-events-none',
              ].join(' ')}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIdx + 1} of ${totalSlides}: ${product.name}`}
              aria-hidden={!active}
              {...(!active ? { inert: '' } : {})}
            >

              {/* Mobile layout: full-width shirt image + bottom overlay with featured drop + product name */}
              <div className="block md:hidden absolute inset-0">
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    loading={slideIdx === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3">
                  <p className="font-marker text-[10px] tracking-[0.3em] text-[#fde047] uppercase animate-pulse">
                    ☠ Featured drop
                  </p>
                  <Link to={`/product/${product.id}`}>
                    <h2 className="font-display text-base tracking-wider leading-[0.95] text-white hover:underline underline-offset-2">
                      {product.name.toUpperCase()} <span className="text-xs">→</span>
                    </h2>
                  </Link>
                </div>
                {product.badge && (
                  <div
                    className="absolute top-2 right-2 bg-[#fde047] text-black px-2 py-0.5 font-marker text-[10px] tracking-widest uppercase stamp-rotate"
                    style={{ boxShadow: "0 0 20px rgba(253,224,71,0.5)" }}
                  >
                    {product.badge}
                  </div>
                )}
              </div>

              {/* Desktop layout: photo centered on page, copy anchored right */}
              <div className="hidden md:block absolute inset-0 z-10">
                {/* Polaroid — truly centered on the full viewport */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[320px] lg:w-[390px] xl:w-[440px] -rotate-2">
                    <div
                      className="relative aspect-square bg-black border-[6px] border-white/80 shadow-2xl overflow-hidden"
                      style={{
                        boxShadow:
                          "0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(253,224,71,0.15)",
                      }}
                    >
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain"
                          loading={slideIdx === 0 ? "eager" : "lazy"}
                          decoding="async"
                        />
                      )}
                    </div>
                    {product.badge && (
                      <div
                        className="absolute -top-3 -right-3 bg-[#fde047] text-black px-3 py-1 font-marker text-xs tracking-widest uppercase stamp-rotate"
                        style={{ boxShadow: "0 0 20px rgba(253,224,71,0.5)" }}
                      >
                        {product.badge}
                      </div>
                    )}
                  </div>
                </div>

                {/* Copy — absolutely positioned right; photo centering is independent */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-[280px] lg:w-[320px] xl:w-[360px] flex items-center pr-8 lg:pr-10 xl:pr-14 text-white"
                >
                  <div>
                    <p
                      className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-3"
                      style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
                    >
                      ☠ Featured drop
                    </p>
                    <h2 className="font-display text-4xl lg:text-5xl xl:text-6xl tracking-wider leading-[0.95] mb-3">
                      {product.name.toUpperCase()}
                    </h2>
                    {product.humor && (
                      <p className="font-marker text-sm lg:text-base text-white italic mb-4">
                        "{product.humor}"
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Link to={`/product/${product.id}`}>
                        <Button
                          className="h-11 px-6 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90"
                          style={{ boxShadow: "0 0 20px rgba(253,224,71,0.35)" }}
                        >
                          <span className="flex flex-col leading-tight text-left">HOOK IT UP.<span className="text-xs tracking-normal font-sans">(Not so much ice.)</span></span><ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        </div>

        {/* Mobile CTA buttons — secondary (current product) only — hidden on desktop */}
        <div className="order-3 flex flex-col gap-3 px-4 pb-4 pt-2 md:hidden">
          {heroSlides[heroIndex] && (
            <Link to={`/product/${heroSlides[heroIndex].product.id}`} className="w-full">
              <Button
                variant="outline"
                className="w-full h-11 font-display tracking-widest border-[#fde047] text-[#fde047] bg-transparent hover:bg-[#fde047]/10"
              >
                <span className="flex flex-col leading-tight text-left">HOOK IT UP.<span className="text-xs tracking-normal font-sans text-[#fde047]/70">(Not so much ice.)</span></span><ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </Link>
          )}
        </div>

        {/* Dot indicators — mobile: in-flow below CTAs; desktop: absolute bottom center */}
        <div
          className="relative order-4 z-20 flex gap-1 px-3 py-2 justify-center md:absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          onFocus={() => setHeroPaused(true)}
          onBlur={() => setHeroPaused(false)}
        >
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={heroIndex === i}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] focus:outline-none"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
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
            </button>
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
          style={{ animation: "marquee-scroll 14s linear infinite", willChange: 'transform' }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
        >
          {TICKER_ITEMS.map((q, i) => (
            <React.Fragment key={i}>
              <span
                className="inline-flex items-center font-marker text-sm md:text-base tracking-widest uppercase text-[#fde047]"
                style={{ textShadow: '0 0 8px rgba(253,224,71,0.8), 0 0 20px rgba(253,224,71,0.4)' }}
              >
                {q}
              </span>
              <img
                src="/karen_ticker.webp"
                alt=""
                aria-hidden="true"
                width="40"
                height="40"
                className="inline-block w-8 h-8 md:w-10 md:h-10 object-contain opacity-90 align-middle mx-10"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Super Powers section — Opie's original Shopify copy */}
      <section className="relative noise-overlay overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 800px' }}>
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(253,224,71,0.08), transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,23,68,0.08), transparent 50%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)",
          }}
        />
        <div className="container mx-auto px-4 py-20 md:py-28 relative max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-10"
          >
            {/* Super Powers block */}
            <div>
              <p
                className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-5"
                style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
              >
                <RichText html={getValue("home", "superpowers", "label", "Super Powers include:")} />
              </p>
              <ul className="space-y-3">
                {([
                  "Offend a Karen without having to open your mouth.",
                  "Go out and show fellow bartenders that you're a bartender too without having to verbally announce it (You entitled freak!).",
                  "Call out the general public on certain undesirable behaviors.",
                ] as const).map((fallback, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 text-base md:text-lg text-white leading-relaxed"
                  >
                    <span className="text-[#fde047] font-marker mt-0.5 shrink-0">☠</span>
                    <RichText html={getValue("home", "superpowers", `item_${i + 1}`, fallback)} />
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* BUT WAIT THERE'S MORE block */}
            <div
              className="border-2 border-[#fde047]/40 bg-black/40 p-6 md:p-8"
              style={{ boxShadow: "0 0 30px rgba(253,224,71,0.1)" }}
            >
              <p
                className="font-display text-xl md:text-2xl tracking-wider text-[#fde047] mb-1"
                style={{ textShadow: "0 0 10px rgba(253,224,71,0.4)" }}
              >
                <RichText html={getValue("home", "extras", "heading", "BUT WAIT, THERE'S MORE:")} />
              </p>
              <p
                className="font-marker text-xs tracking-[0.3em] text-white/75 uppercase mb-5"
              >
                <RichText html={getValue("home", "extras", "label", "Also included:")} />
              </p>
              <ul className="space-y-3">
                {([
                  "Eye rolls.",
                  "Your parents refusing to be seen out with you while you're wearing that.",
                  "Receive looks of disgust from pretentious bartenders who still thinks the customer is always right (THEY'RE NOT CUSTOMERS! THEY'RE GUESTS!...OH, SHUT UP!!!).",
                ] as const).map((fallback, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 text-base md:text-lg text-white/90 leading-relaxed"
                  >
                    <span className="text-[#ff1744] font-marker mt-0.5 shrink-0">★</span>
                    <RichText html={getValue("home", "extras", `item_${i + 1}`, fallback)} />
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Closing manifesto */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-marker text-lg md:text-xl text-center text-white italic tracking-wider"
            >
              <RichText html={getValue("home", "manifesto", "text", "Made by a dark humored, sarcastic bartender, for a dark humored, sarcastic bartender!")} />
            </motion.p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link to="/shop">
                <Button className="h-12 px-8 font-display tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                  {getValue("home", "cta", "primary_button", "ORDER A ROUND")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" className="h-12 px-8 font-display tracking-widest">
                  {getValue("home", "cta", "secondary_button", "MY STORY")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section
        className="relative noise-overlay"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 50%, hsl(var(--background)) 100%)",
          contentVisibility: 'auto',
          containIntrinsicSize: '0 600px',
        }}
      >
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="flex items-end justify-between mb-10 md:mb-14">
            <div>
              <p className="font-marker text-xs md:text-sm tracking-widest text-[#fde047] mb-2 uppercase">
                <RichText html={getValue("home", "featured", "label", "The lineup")} />
              </p>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-wider leading-none">
                <RichText html={getValue("home", "featured", "heading", "FEATURED")} />
              </h2>
              <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-md">
                <RichText html={getValue("home", "featured", "subheading", "The shirts that start conversations. And bar fights.")} />
              </p>
            </div>
            <Link
              to="/shop"
              className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-display tracking-widest uppercase"
            >
              {getValue("home", "featured", "link_text", "See the full menu")} <ArrowRight className="h-4 w-4" />
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
                {getValue("home", "featured", "button", "THE FULL MENU")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What The Bar Says — customer reviews */}
      {reviews && reviews.length > 0 && (
        <section
          className="relative noise-overlay"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)",
          }}
        >
          <div className="container mx-auto px-4 py-20 md:py-24">
            <div className="text-center mb-12">
              <p className="font-marker text-xs md:text-sm tracking-widest text-[#fde047] mb-2 uppercase">
                Verified humans
              </p>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-wider leading-none">
                WHAT THE BAR SAYS
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((review, i) => {
                const productName = allProducts.find((p) => p.id === review.product_slug)?.name ?? review.product_slug;
                const snippet = review.body && review.body.length > 120
                  ? review.body.slice(0, 120) + "…"
                  : review.body ?? "";
                return (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    className="border border-border bg-card p-5 space-y-3 hover:border-[#fde047]/40 transition-colors"
                  >
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star
                          key={si}
                          className={`h-3.5 w-3.5 ${si < review.rating ? "text-[#fde047] fill-[#fde047]" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <p className="text-base text-white leading-relaxed italic">"{snippet}"</p>
                    <div className="pt-1 border-t border-border/50">
                      <p className="font-marker text-xs tracking-widest text-foreground">{review.reviewer_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{productName}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}


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
            <RichText html={getValue("home", "quotes", "label", "Bad Bartender Advice")} />
          </p>
          <div className="relative min-h-[140px] md:min-h-[200px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={quoteIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="font-marker text-2xl md:text-4xl lg:text-5xl tracking-wider leading-tight max-w-4xl mx-auto stamp-rotate uppercase"
              >
                "<RichText html={activeQuotes[quoteIndex]} />"
              </motion.blockquote>
            </AnimatePresence>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-8 font-display tracking-widest uppercase">
            <RichText html={getValue("home", "quotes", "attribution", "— Every Bartender Ever")} />
          </p>

          {/* dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {activeQuotes.map((_, i) => (
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
              <RichText html={getValue("home", "newsletter", "disclaimer", "No spam. Just shift notes.")} />
            </p>
            <h2 className="font-display text-4xl md:text-5xl tracking-wider mb-4">
              <RichText html={getValue("home", "newsletter", "heading", "JOIN THE SHIFT")} />
            </h2>
            <p className="text-white/60 text-sm md:text-base mb-8">
              <RichText html={getValue("home", "newsletter", "subheading", "Early drops, industry humor, and discounts that actually feel like ones.")} />
            </p>
            {subscribed ? (
              <p className="font-marker text-sm tracking-widest text-[#fde047] uppercase">
                <RichText html={getValue("home", "newsletter", "success", "You're on the list. Don't embarrass us.")} />
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
                  id="subscribe-email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
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
