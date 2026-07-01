import SEO from "@/components/SEO";
import { useSiteContent } from "@/context/SiteContentContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const PLACEMENTS = [
  {
    key: "shop_banner",
    label: "Shop Banner",
    format: "Banner",
    description: "Full-width banner above the product grid on the shop page. High visibility — every visitor sees it before they browse.",
  },
  {
    key: "home_banner",
    label: "Home Banner",
    format: "Banner",
    description: "Full-width banner on the homepage between sections. Reaches every site visitor, not just shoppers.",
  },
  {
    key: "between_products",
    label: "Between Products",
    format: "Inline Card",
    description: "Inline card inserted between product rows in the shop grid. Native-feeling placement that doesn't interrupt the browse experience.",
  },
  {
    key: "product_detail",
    label: "Product Detail",
    format: "Sidebar / Below Fold",
    description: "Placement on individual product pages — shoppers who reach this page are high-intent buyers.",
  },
  {
    key: "footer_strip",
    label: "Footer Strip",
    format: "Banner",
    description: "Full-width strip just above the site footer. Persistent brand presence on every page of the site.",
  },
  {
    key: "shop_sidebar",
    label: "Logo Strip",
    format: "Logo Strip",
    description: "Your brand logo in a horizontal sponsor strip. Clean, low-profile, always visible. Great for long-term brand recognition.",
  },
];

const Advertise = () => {
  const { getValue } = useSiteContent();

  const heading      = getValue("advertise", "hero",       "heading",       "ADVERTISE WITH US");
  const subheading   = getValue("advertise", "hero",       "subheading",    "Put your brand in front of the people who pour the drinks.");
  const audHeading   = getValue("advertise", "audience",   "heading",       "WHO'S WATCHING");
  const audBody      = getValue("advertise", "audience",   "body",          "POURnogravy reaches bartenders, servers, barbacks, and hospitality workers — the people who recommend what their customers drink every single night. This is a direct line to the industry, not a general audience.");
  const stat1Num     = getValue("advertise", "audience",   "stat_1_number", "—");
  const stat1Label   = getValue("advertise", "audience",   "stat_1_label",  "Monthly Visitors");
  const stat2Num     = getValue("advertise", "audience",   "stat_2_number", "—");
  const stat2Label   = getValue("advertise", "audience",   "stat_2_label",  "Email Subscribers");
  const stat3Num     = getValue("advertise", "audience",   "stat_3_number", "—");
  const stat3Label   = getValue("advertise", "audience",   "stat_3_label",  "Orders Fulfilled");
  const placeHeading = getValue("advertise", "placements", "heading",       "PLACEMENT OPTIONS");
  const placeBody    = getValue("advertise", "placements", "body",          "Banner ads, logo strips, inline cards, and sponsored sections. All placements are brand-approved — no auto-served garbage.");
  const ctaHeading   = getValue("advertise", "contact",    "heading",       "LET'S TALK");
  const ctaBody      = getValue("advertise", "contact",    "body",          "Reach out with your brand, budget, and what you're trying to accomplish. We'll let you know if it's a fit.");
  const ctaButton    = getValue("advertise", "contact",    "button_text",   "GET IN TOUCH");
  const ctaEmail     = getValue("advertise", "contact",    "email",         "ads@pournogravy.com");

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 md:pt-28">
      <SEO
        title="Advertise With Us"
        description="Put your brand in front of the hospitality industry. POURnogravy reaches bartenders, servers, and bar staff — the people who recommend what their customers drink."
        url="https://pournogravy.com/advertise"
        imageAlt="Advertise with POURnogravy"
      />

      {/* Hero */}
      <section className="relative bg-black text-white overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(253,224,71,0.06) 40px, rgba(253,224,71,0.06) 41px)",
          }}
        />
        <div className="container mx-auto px-4 py-20 md:py-28 relative text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-marker text-xs tracking-[0.3em] mb-4 uppercase text-[#fde047]"
            style={{ textShadow: "0 0 10px rgba(253,224,71,0.6)" }}
          >
            For brands + partners
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl tracking-wider mb-6"
          >
            {heading}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-white/60 text-lg md:text-xl max-w-xl mx-auto"
          >
            {subheading}
          </motion.p>
        </div>
      </section>

      {/* Audience stats */}
      <section className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            {[
              { num: stat1Num, label: stat1Label },
              { num: stat2Num, label: stat2Label },
              { num: stat3Num, label: stat3Label },
            ].map(({ num, label }) => (
              <div key={label}>
                <p className="font-display text-4xl md:text-5xl text-[#fde047] tracking-wider">{num}</p>
                <p className="text-xs text-white/50 uppercase tracking-widest mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience description */}
      <section className="border-b border-white/10">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-display text-3xl md:text-4xl tracking-wider mb-6"
          >
            {audHeading}
          </motion.h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">{audBody}</p>
        </div>
      </section>

      {/* Placement options */}
      <section className="border-b border-white/10">
        <div className="container mx-auto px-4 py-16">
          <motion.h2
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-display text-3xl md:text-4xl tracking-wider mb-3"
          >
            {placeHeading}
          </motion.h2>
          <p className="text-muted-foreground text-sm mb-10 max-w-2xl">{placeBody}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLACEMENTS.map((p, i) => (
              <motion.div
                key={p.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="border border-border bg-card rounded-lg p-5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display tracking-wider text-sm text-foreground">{p.label}</p>
                  <span className="text-[10px] uppercase tracking-widest text-[#fde047]/70 border border-[#fde047]/30 rounded px-1.5 py-0.5 shrink-0">
                    {p.format}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-black text-white">
        <div className="container mx-auto px-4 py-20 text-center max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl md:text-5xl tracking-wider mb-4"
          >
            {ctaHeading}
          </motion.h2>
          <p className="text-white/60 text-base md:text-lg mb-8 leading-relaxed">{ctaBody}</p>
          <a
            href={`mailto:${ctaEmail}?subject=${encodeURIComponent("Advertising Inquiry — POURnogravy")}`}
            className="inline-block font-display tracking-widest text-sm bg-[#fde047] text-black px-8 py-4 hover:bg-[#fde047]/90 transition-colors"
          >
            {ctaButton}
          </a>
          <p className="text-white/30 text-xs mt-4">{ctaEmail}</p>
        </div>
      </section>
    </div>
  );
};

export default Advertise;
