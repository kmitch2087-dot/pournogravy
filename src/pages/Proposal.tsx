import { motion } from "framer-motion";
import { Check, Monitor, ShoppingCart, Palette, Zap, Shield, Megaphone, ArrowRight } from "lucide-react";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const sections = [
  {
    title: "PROJECT OVERVIEW",
    content: `POURnogravy is a custom-built e-commerce storefront for a service-industry apparel brand targeting bartenders, servers, and hospitality workers. The brand voice is bold, irreverent, and unapologetically niche — blending dive-bar culture with premium streetwear presentation.

This proposal outlines the full scope of work for a production-ready custom site vs. a templated Shopify build.`,
  },
];

const sitePages = [
  { name: "Homepage", desc: "Animated hero, featured products grid, scrolling quote marquee, email signup" },
  { name: "Shop", desc: "Full product catalog with collection filtering, grid layout, badge system" },
  { name: "Collections", desc: "Curated category pages with product counts and themed descriptions" },
  { name: "Product Detail", desc: "Size selector, image gallery, add-to-cart, humor-driven copy" },
  { name: "About", desc: "Brand story page with editorial layout and pull quotes" },
  { name: "FAQ", desc: "Accordion-style FAQ with on-brand humor in every answer" },
  { name: "Contact", desc: "Validated contact form with submission confirmation" },
  { name: "Cart System", desc: "Slide-out drawer cart with quantity controls, running total, and checkout CTA" },
];

const designFeatures = [
  "Sin City noir aesthetic — high-contrast B&W with selective color accents",
  "Custom noise/grit texture overlays via CSS SVG filters",
  "Bebas Neue display + Permanent Marker hand-drawn typography pairing",
  "Rough-border & stamp-rotate decorative CSS treatments",
  "Framer Motion entrance animations & page transitions",
  "Fully responsive — mobile-first grid system",
  "Dark-mode-native design system with semantic HSL tokens",
  "Custom-generated AI imagery (selective-color photography, bartender POV)",
];

const techStack = [
  { name: "React 18", desc: "Component architecture & state management" },
  { name: "TypeScript", desc: "Type-safe development across all components" },
  { name: "Tailwind CSS", desc: "Utility-first styling with custom design tokens" },
  { name: "Framer Motion", desc: "Production-grade animations & transitions" },
  { name: "Vite", desc: "Lightning-fast dev server & optimized builds" },
  { name: "shadcn/ui", desc: "Accessible, customizable component primitives" },
  { name: "React Router", desc: "Client-side routing with 7 distinct pages" },
  { name: "Context API", desc: "Global cart state management" },
];

const customVsShopify = [
  {
    feature: "Design Freedom",
    custom: "Unlimited — pixel-perfect to brand vision",
    shopify: "Limited to theme constraints & Liquid templating",
  },
  {
    feature: "Performance",
    custom: "Sub-second loads, no bloat, code-split bundles",
    shopify: "Theme-dependent, plugin bloat common",
  },
  {
    feature: "Brand Identity",
    custom: "100% unique — Sin City aesthetic impossible in templates",
    shopify: "Recognizable Shopify look without heavy customization",
  },
  {
    feature: "Monthly Costs",
    custom: "Hosting only (~$0-20/mo)",
    shopify: "Basic plan $39/mo + apps + transaction fees",
  },
  {
    feature: "Scalability",
    custom: "Add any feature without plugin dependency",
    shopify: "App ecosystem — powerful but adds cost & complexity",
  },
  {
    feature: "SEO Control",
    custom: "Full control: meta, schema, sitemap, performance",
    shopify: "Good baseline, limited deep customization",
  },
  {
    feature: "Checkout & Payments",
    custom: "Requires integration (Stripe, etc.)",
    shopify: "Built-in — strongest advantage",
  },
  {
    feature: "Content Management",
    custom: "Headless CMS integration (Sanity, Contentful, etc.)",
    shopify: "Built-in admin panel — easy for non-technical users",
  },
];

const packages = [
  {
    name: "CUSTOM BUILD",
    subtitle: "What you're looking at right now",
    tag: "RECOMMENDED",
    features: [
      "7-page custom React storefront",
      "Bespoke Sin City design system",
      "AI-generated brand photography",
      "Framer Motion animations throughout",
      "Cart system with backend integration",
      "Stripe checkout integration",
      "Email signup / newsletter integration",
      "SEO optimization & meta tags",
      "Mobile-responsive across all breakpoints",
      "Hosting setup & deployment",
      "30 days post-launch support",
    ],
    price: "$$$$",
    note: "One-time build cost. You own everything.",
  },
  {
    name: "SHOPIFY BUILD",
    subtitle: "Template-based alternative",
    tag: null,
    features: [
      "Premium theme purchase & customization",
      "Brand colors, fonts, logo integration",
      "Product catalog setup (all SKUs)",
      "Collection pages configured",
      "Basic About, FAQ, Contact pages",
      "Shopify Payments / checkout configured",
      "Basic SEO setup",
      "Mobile responsive (theme-dependent)",
      "Staff training on Shopify admin",
      "30 days post-launch support",
    ],
    price: "$$",
    note: "Lower upfront, but recurring Shopify fees + limited design control.",
  },
];

const nextSteps = [
  "Approve direction & select package",
  "Finalize product catalog & copy",
  "Payment processing setup (Stripe or Shopify Payments)",
  "Backend integration (database, auth, order management)",
  "Domain configuration & DNS",
  "Launch & go-live",
];

const Proposal = () => {
  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <div className="container mx-auto px-4 max-w-4xl pb-20">
        {/* Header */}
        <motion.div {...fade} className="mb-16">
          <p className="font-marker text-xs text-muted-foreground stamp-rotate inline-block mb-4">
            ☠ CONFIDENTIAL — CLIENT PROPOSAL
          </p>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-[0.9] mb-4">
            POURnogravy<br />
            <span className="text-muted-foreground">SITE PROPOSAL</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-4 max-w-lg">
            A comprehensive proposal for a custom e-commerce storefront — comparing a bespoke React build against a Shopify-based solution.
          </p>
          <div className="flex gap-4 mt-6 text-xs text-muted-foreground font-display tracking-widest">
            <span>DATE: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <span>•</span>
            <span>STATUS: DRAFT</span>
          </div>
        </motion.div>

        {/* Overview */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            01 — PROJECT OVERVIEW
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            POURnogravy is a niche apparel brand for service-industry workers — bartenders, servers, and hospitality lifers
            who've earned the right to wear their frustration. The brand combines dive-bar grit with a premium streetwear
            presentation, using bold humor and a distinctive Sin City noir visual identity.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mt-4">
            The current prototype demonstrates a fully functional 7-page storefront with cart functionality,
            AI-generated brand photography, custom animations, and a cohesive design system built from scratch.
          </p>
        </motion.section>

        {/* Pages Delivered */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            02 — PAGES & FEATURES
          </h2>
          <div className="grid gap-3">
            {sitePages.map((page, i) => (
              <div key={i} className="flex gap-4 p-4 border border-border">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-muted">
                  <Check className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="font-display tracking-wider text-sm">{page.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">{page.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Design System */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            03 — DESIGN & VISUAL IDENTITY
          </h2>
          <div className="grid gap-2">
            {designFeatures.map((feat, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{feat}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-6 border border-border noise-overlay">
            <p className="font-marker text-lg text-center stamp-rotate relative z-10">
              "The aesthetic can't be replicated with a Shopify template."
            </p>
          </div>
        </motion.section>

        {/* Tech Stack */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            04 — TECHNOLOGY STACK
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {techStack.map((tech, i) => (
              <div key={i} className="p-4 border border-border text-center">
                <p className="font-display text-sm tracking-wider">{tech.name}</p>
                <p className="text-muted-foreground text-[10px] mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Comparison Table */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            05 — CUSTOM vs SHOPIFY
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground/20">
                  <th className="text-left py-3 pr-4 font-display tracking-wider text-xs text-muted-foreground">FEATURE</th>
                  <th className="text-left py-3 px-4 font-display tracking-wider text-xs">CUSTOM BUILD</th>
                  <th className="text-left py-3 pl-4 font-display tracking-wider text-xs text-muted-foreground">SHOPIFY</th>
                </tr>
              </thead>
              <tbody>
                {customVsShopify.map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-3 pr-4 font-display tracking-wider text-xs">{row.feature}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{row.custom}</td>
                    <td className="py-3 pl-4 text-xs text-muted-foreground">{row.shopify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Packages */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            06 — PACKAGES
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {packages.map((pkg, i) => (
              <div
                key={i}
                className={`border p-8 relative ${
                  pkg.tag ? "border-foreground" : "border-border"
                }`}
              >
                {pkg.tag && (
                  <div className="absolute -top-3 left-6 bg-foreground text-background px-3 py-1 font-display text-[10px] tracking-widest">
                    {pkg.tag}
                  </div>
                )}
                <h3 className="font-display text-2xl tracking-wider mb-1">{pkg.name}</h3>
                <p className="text-muted-foreground text-xs mb-6">{pkg.subtitle}</p>
                <div className="space-y-2 mb-8">
                  {pkg.features.map((feat, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <Check className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                      <span className="text-xs text-muted-foreground">{feat}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4">
                  <p className="font-display text-3xl tracking-wider">{pkg.price}</p>
                  <p className="text-muted-foreground text-[10px] mt-1">{pkg.note}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Product Catalog Summary */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            07 — CURRENT CATALOG
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-6 border border-border">
              <p className="font-display text-4xl">12</p>
              <p className="text-muted-foreground text-xs mt-1 font-display tracking-widest">PRODUCTS</p>
            </div>
            <div className="p-6 border border-border">
              <p className="font-display text-4xl">3</p>
              <p className="text-muted-foreground text-xs mt-1 font-display tracking-widest">COLLECTIONS</p>
            </div>
            <div className="p-6 border border-border">
              <p className="font-display text-4xl">7</p>
              <p className="text-muted-foreground text-xs mt-1 font-display tracking-widest">PAGES</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {["Salty Bartender 🔥", "Industry Truths 🍸", "Customer Horror ☠️"].map((col, i) => (
              <div key={i} className="p-3 bg-muted text-center">
                <p className="text-xs font-display tracking-wider">{col}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* What's Needed to Go Live */}
        <motion.section {...fade} className="mb-16">
          <h2 className="font-display text-3xl tracking-wider mb-4 border-b border-border pb-3">
            08 — NEXT STEPS TO LAUNCH
          </h2>
          <div className="space-y-3">
            {nextSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-border">
                <span className="font-display text-lg text-muted-foreground w-8">{String(i + 1).padStart(2, "0")}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <motion.div {...fade} className="border-t border-border pt-8 text-center">
          <p className="font-marker text-xl stamp-rotate inline-block mb-4">
            "Let's build something they'll remember."
          </p>
          <p className="text-muted-foreground text-xs font-display tracking-widest">
            POURnogravy — SITE PROPOSAL — {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Proposal;
