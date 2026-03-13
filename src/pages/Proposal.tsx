import { motion } from "framer-motion";
import { Check, ArrowRight, ShoppingCart, Truck, CreditCard, Mail, TrendingUp, Users, Sparkles, Package } from "lucide-react";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const Proposal = () => {
  return (
    <div className="min-h-screen pt-24 md:pt-28 theme-inverted bg-background text-foreground">
      <div className="container mx-auto px-4 max-w-4xl pb-20">

        {/* ── HEADER ── */}
        <motion.div {...fade} className="mb-20">
          <p className="font-marker text-xs text-muted-foreground stamp-rotate inline-block mb-4">
            ☠ FOUNDING PARTNER DEVELOPMENT AGREEMENT
          </p>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-[0.9] mb-4">
            POURnogravy<br />
            <span className="text-muted-foreground text-3xl md:text-5xl">ECOMMERCE DEVELOPMENT PROPOSAL<br />& BRAND LAUNCH STRATEGY</span>
          </h1>
          <div className="flex flex-wrap gap-4 mt-6 text-xs text-muted-foreground font-display tracking-widest">
            <span>PREPARED BY: VIBE SHIFT STUDIOS</span>
            <span>•</span>
            <span>DATE: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
            <span>•</span>
            <span>STATUS: FOUNDING PARTNER AGREEMENT</span>
          </div>
        </motion.div>

        {/* ── 01 EXECUTIVE SUMMARY ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="01" title="EXECUTIVE SUMMARY" />
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Pournogravy is a niche apparel brand designed specifically for bartenders and service industry workers who share a common culture built around late nights, high-stress shifts, difficult customers, and the humor that develops from those shared experiences.
            </p>
            <p>
              The purpose of this proposal is not only to outline the development of an ecommerce website, but to provide a strategic foundation for launching and operating the brand in a way that generates long-term, repeatable revenue. This document serves as both a development proposal and an operational playbook.
            </p>
            <p>
              The website will serve as the digital headquarters for the Pournogravy brand — allowing customers to browse products, purchase apparel, share designs with coworkers, and engage with the brand identity. The system will also automate the operational workflow between the website, payment processing, and the partnered screen-printing boutique responsible for producing and fulfilling orders.
            </p>
          </div>
        </motion.section>

        {/* ── 02 BRAND POSITIONING ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="02" title="BRAND POSITIONING & IDENTITY" />
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Pournogravy is positioned as a humor-driven apparel brand rooted in bartender culture. Rather than functioning as a generic merchandise store, the brand succeeds by creating a strong identity that resonates with a specific community: hospitality workers who experience the realities of service industry life every day.
            </p>
            <p>
              Successful niche apparel brands rarely succeed because of the clothing itself. They succeed because the clothing represents a shared identity among the people wearing it. In this case, that identity revolves around bartenders and hospitality workers who understand the humor and frustration that comes from dealing with the public, navigating busy shifts, and surviving weekend nights behind the bar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            {[
              { label: "TAGLINE", value: "Saving My Bar From the Socially Stupid, One Karen at a Time." },
              { label: "AUDIENCE", value: "Bartenders, servers, barbacks, and hospitality workers." },
              { label: "BRAND VOICE", value: "Bold, sarcastic, blunt, humorous, and unapologetic." },
              { label: "VISUAL DIRECTION", value: "High-contrast B&W aesthetic inspired by dive bar culture." },
            ].map((item, i) => (
              <div key={i} className="p-4 border border-border">
                <p className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">{item.label}</p>
                <p className="text-sm text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── 03 ECOMMERCE ARCHITECTURE ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="03" title="ECOMMERCE SYSTEM ARCHITECTURE" />
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            The website will function as a fully integrated ecommerce platform designed to automate the process of selling apparel online. The system connects the customer purchasing experience with payment processing and order fulfillment so that the brand owner can focus on marketing, community building, and product development.
          </p>
          <div className="space-y-3">
            {[
              { icon: Users, step: "01", text: "Customer visits the website and browses apparel by themed collections." },
              { icon: ShoppingCart, step: "02", text: "Customer selects a shirt design, chooses size, and adds to cart." },
              { icon: CreditCard, step: "03", text: "Customer completes checkout via secure Stripe payment processing." },
              { icon: Package, step: "04", text: "Order details automatically route to the partnered screen-printing boutique." },
              { icon: Truck, step: "05", text: "Printer produces the shirt and ships directly to the customer." },
              { icon: Mail, step: "06", text: "Customer receives confirmation and is added to the brand's email list." },
            ].map(({ icon: Icon, step, text }) => (
              <div key={step} className="flex items-center gap-4 p-4 border border-border">
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="font-display text-lg text-muted-foreground w-8">{step}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            This automated workflow ensures that the brand owner does not need to manually process orders or coordinate fulfillment. The website acts as a bridge between customers and the printing partner.
          </p>
        </motion.section>

        {/* ── 04 SITE STRUCTURE ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="04" title="WEBSITE STRUCTURE & FEATURES" />
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            The site follows best-practice apparel website structure, optimized for conversions and brand storytelling.
          </p>
          <div className="grid gap-3">
            {[
              { name: "Homepage", desc: "Brand messaging, animated hero, 6-8 featured products, scrolling quote marquee, email signup with discount incentive." },
              { name: "Shop Page", desc: "Full product catalog organized by themed collections with filtering, grid layout, and badge system (Best Seller, New, Limited)." },
              { name: "Collections", desc: "Curated category pages — Salty Bartender, Industry Truths, Customer Horror Stories — with product counts and themed descriptions." },
              { name: "Product Pages", desc: "Storytelling descriptions with humor, size selector, image gallery, add-to-cart, and social sharing options." },
              { name: "About Page", desc: "Brand story and service industry identity — who we are, why we exist, and what we stand for." },
              { name: "Drop Page", desc: "Highlights newest product releases with limited-run messaging to create urgency." },
              { name: "FAQ Page", desc: "Accordion-style FAQ with on-brand humor woven into every answer." },
              { name: "Contact Page", desc: "Validated contact form with submission confirmation for customer inquiries and wholesale requests." },
              { name: "Cart System", desc: "Slide-out drawer cart with quantity controls, running total, and checkout CTA integrated with Stripe." },
            ].map((page, i) => (
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

        {/* ── 05 DESIGN SYSTEM ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="05" title="DESIGN & VISUAL IDENTITY" />
          <div className="grid gap-2">
            {[
              "Sin City noir aesthetic — high-contrast B&W with selective color accents (red lipstick, neon green drinks)",
              "Custom noise/grit texture overlays via CSS SVG filters for authentic dive-bar feel",
              "Bebas Neue display font + Permanent Marker hand-drawn typography pairing",
              "Rough-border & stamp-rotate decorative CSS treatments throughout",
              "Framer Motion entrance animations & page transitions",
              "Fully responsive mobile-first design across all breakpoints",
              "Dark-mode-native design system with semantic HSL color tokens",
              "AI-generated selective-color photography — bartender POV noir imagery",
              "Skull iconography (☠), ink-splatter backgrounds, and textured overlays",
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{feat}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-6 border border-border noise-overlay">
            <p className="font-marker text-lg text-center stamp-rotate relative z-10">
              "This aesthetic cannot be replicated with a template."
            </p>
          </div>
        </motion.section>

        {/* ── 06 TECH STACK ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="06" title="TECHNOLOGY STACK" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "React 18", desc: "Component architecture & state management" },
              { name: "TypeScript", desc: "Type-safe development across all components" },
              { name: "Tailwind CSS", desc: "Utility-first styling with custom design tokens" },
              { name: "Framer Motion", desc: "Production-grade animations & transitions" },
              { name: "Vite", desc: "Lightning-fast dev server & optimized builds" },
              { name: "shadcn/ui", desc: "Accessible, customizable component primitives" },
              { name: "Stripe", desc: "Secure payment processing & checkout" },
              { name: "React Router", desc: "Client-side routing with 8+ pages" },
            ].map((tech, i) => (
              <div key={i} className="p-4 border border-border text-center">
                <p className="font-display text-sm tracking-wider">{tech.name}</p>
                <p className="text-muted-foreground text-[10px] mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── 07 LAUNCH STRATEGY ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="07" title="LAUNCH STRATEGY FOR INITIAL 30 DESIGNS" />
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Although the brand currently has approximately thirty shirt concepts prepared, launching all designs simultaneously is not recommended. Successful apparel brands release products in stages to maintain excitement and encourage repeat visits.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {[
              { num: "01", title: "LAUNCH DAY", desc: "Launch website with 12–15 designs available for immediate purchase." },
              { num: "02", title: "SCHEDULED DROPS", desc: "Reserve remaining designs for weekly or bi-weekly product drops." },
              { num: "03", title: "PROMOTE", desc: "Announce each drop through social media and email marketing campaigns." },
              { num: "04", title: "COMMUNITY", desc: "Encourage bartenders to share designs with coworkers who understand the humor." },
            ].map((item) => (
              <div key={item.num} className="p-6 border border-border">
                <span className="font-display text-2xl text-muted-foreground">{item.num}</span>
                <p className="font-display tracking-wider text-sm mt-2">{item.title}</p>
                <p className="text-muted-foreground text-xs mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── 08 CONVERSION OPTIMIZATION ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="08" title="CONVERSION OPTIMIZATION STRATEGIES" />
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            To maximize conversions, the site employs proven ecommerce strategies tailored to niche apparel:
          </p>
          <div className="space-y-3">
            {[
              "Display 6-8 featured shirts on homepage to reduce decision overload.",
              "Use limited-release messaging to create urgency and drive immediate purchases.",
              "Encourage social sharing — bartenders share with coworkers who get the humor.",
              "Offer email signup incentives (small discount) to build the marketing list from day one.",
              "Embed humor and brand personality throughout every page to reinforce community connection.",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border border-border">
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── 09 PRICING MODEL ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="09" title="RECOMMENDED PRICING MODEL" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground/20">
                  <th className="text-left py-3 pr-4 font-display tracking-wider text-xs">PRODUCT</th>
                  <th className="text-left py-3 px-4 font-display tracking-wider text-xs">PRICE RANGE</th>
                  <th className="text-left py-3 pl-4 font-display tracking-wider text-xs">EST. PROFIT / UNIT</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { product: "T-Shirt", range: "$26 – $32", profit: "$16 – $22" },
                  { product: "Premium T-Shirt", range: "$32 – $38", profit: "$22 – $28" },
                  { product: "Hoodie", range: "$55 – $70", profit: "$35 – $50" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-3 pr-4 font-display tracking-wider text-xs">{row.product}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{row.range}</td>
                    <td className="py-3 pl-4 text-xs text-muted-foreground">{row.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Maintaining profit margins in this range allows the brand to reinvest in marketing, new product designs, and community engagement while still producing strong per-unit returns.
          </p>
        </motion.section>

        {/* ── 10 INDUSTRY BEST PRACTICES ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="10" title="APPAREL INDUSTRY BEST PRACTICES" />
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Most successful apparel brands operate less like traditional retail stores and more like communities built around shared identity. This is particularly important for niche brands like Pournogravy.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Build identity-driven brand messaging — not generic merchandise.",
              "Use product drops instead of releasing everything at once.",
              "Develop a strong niche community around shared experiences.",
              "Use social media storytelling related to the niche audience.",
              "Collect customer emails from day one.",
              "Analyze best-selling designs and double down on successful themes.",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-muted">
                <span className="font-display text-xs text-muted-foreground mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-xs text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── 11 DEVELOPMENT INVESTMENT ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="11" title="DEVELOPMENT INVESTMENT" />
          <div className="border-2 border-foreground p-8 md:p-12">
            <p className="text-sm text-muted-foreground mb-8">
              The discounted rate reflects a founding-partner collaboration agreement. While the standard development value for a project of this scope is approximately $3,800, the project is offered at a reduced cost in exchange for the ability to reference the website as a portfolio project and marketing case study for Vibe Shift Studios.
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-baseline border-b border-border pb-3">
                <span className="font-display tracking-wider text-sm">STANDARD CUSTOM ECOMMERCE BUILD VALUE</span>
                <span className="font-display text-lg">$3,800</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-border pb-3">
                <span className="font-display tracking-wider text-sm text-muted-foreground">FOUNDING PARTNER DISCOUNT</span>
                <span className="font-display text-lg text-muted-foreground">–$2,900</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="font-display tracking-wider text-xl">TOTAL DEVELOPMENT COST</span>
                <span className="font-display text-4xl">$900</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── 12 SUPPORT & TRAINING ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="12" title="SUPPORT, REVISIONS & TRAINING" />
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            The development agreement includes up to two years of ongoing support. During this period, the developer will assist with revisions, operational questions, and training so the client can learn to manage the site independently.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { num: "01", text: "Up to two years of reasonable revisions and improvements to the website." },
              { num: "02", text: "Training sessions to help the client learn how to manage the site independently." },
              { num: "03", text: "Guidance on ecommerce operations, product management, and marketing integrations." },
              { num: "04", text: "Assistance interpreting analytics, sales trends, and customer behavior." },
            ].map((item) => (
              <div key={item.num} className="p-6 border border-border">
                <span className="font-display text-2xl text-muted-foreground">{item.num}</span>
                <p className="text-sm text-muted-foreground mt-3">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            The goal of the support period is full operational independence for the client.
          </p>
        </motion.section>

        {/* ── 13 PHASE 2 GROWTH ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="13" title="PHASE 2 — FUTURE GROWTH OPPORTUNITIES" />
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Once the brand establishes traction with t-shirt sales, the product line and marketing strategy can expand significantly:
          </p>
          <div className="space-y-3">
            {[
              "Expand product line to hoodies, hats, stickers, and bar accessories (bar towels, coasters, etc.).",
              "Introduce limited seasonal drops to create anticipation and exclusivity.",
              "Partner with bars, restaurants, and hospitality influencers for cross-promotion.",
              "Create bartender story submissions — user-generated content for social media marketing.",
              "Develop referral or affiliate programs to reward brand ambassadors.",
              "Offer bulk/wholesale pricing for bars and restaurants wanting staff uniforms with attitude.",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-border">
                <span className="font-display text-lg text-muted-foreground w-8">{String(i + 1).padStart(2, "0")}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── 14 CURRENT CATALOG ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="14" title="CURRENT CATALOG STATUS" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-6 border border-border">
              <p className="font-display text-4xl">12</p>
              <p className="text-muted-foreground text-xs mt-1 font-display tracking-widest">PRODUCTS LIVE</p>
            </div>
            <div className="p-6 border border-border">
              <p className="font-display text-4xl">3</p>
              <p className="text-muted-foreground text-xs mt-1 font-display tracking-widest">COLLECTIONS</p>
            </div>
            <div className="p-6 border border-border">
              <p className="font-display text-4xl">~30</p>
              <p className="text-muted-foreground text-xs mt-1 font-display tracking-widest">TOTAL DESIGNS</p>
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

        {/* ── 15 PORTFOLIO RIGHTS ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="15" title="PORTFOLIO & MARKETING RIGHTS" />
          <div className="p-6 border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The developer may display the Pournogravy website within professional portfolios, marketing materials, and case studies indefinitely. A small developer credit link may remain in the website footer referencing Vibe Shift Studios.
            </p>
          </div>
        </motion.section>

        {/* ── 16 NEXT STEPS ── */}
        <motion.section {...fade} className="mb-20">
          <SectionHeader num="16" title="NEXT STEPS" />
          <div className="space-y-3">
            {[
              "Confirm acceptance of proposal and founding partner agreement.",
              "Finalize product catalog, copy, and design assets.",
              "Begin project planning and development kickoff.",
              "Configure Stripe payment processing and order routing.",
              "Connect with screen-printing partner for fulfillment integration.",
              "Domain configuration & DNS setup.",
              "QA testing — checkout, order flow, and mobile responsiveness.",
              "Launch website and begin sales.",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-border">
                <span className="font-display text-lg text-muted-foreground w-8">{String(i + 1).padStart(2, "0")}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── FOOTER ── */}
        <motion.div {...fade} className="border-t border-border pt-8 text-center">
          <p className="font-marker text-xl stamp-rotate inline-block mb-4">
            "Let's build something they'll remember."
          </p>
          <p className="text-muted-foreground text-xs font-display tracking-widest">
            POURnogravy × VIBE SHIFT STUDIOS — {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const SectionHeader = ({ num, title }: { num: string; title: string }) => (
  <h2 className="font-display text-3xl tracking-wider mb-6 border-b border-border pb-3">
    <span className="text-muted-foreground">{num}</span> — {title}
  </h2>
);

export default Proposal;
