import SEO from "@/components/SEO";
import { useSiteContent } from "@/context/SiteContentContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const faqs = [
  {
    q: "How long does shipping take?",
    a: "3–7 business days domestically. Faster than your manager responding to your schedule request, slower than a Karen finding something to complain about.",
  },
  {
    q: "What's your return policy?",
    a: "30 days, unworn, with tags. We're more lenient than your bar manager but less lenient than your ex.",
  },
  {
    q: "Do you ship internationally?",
    a: "Not yet. Turns out dealing with customs is like dealing with a bachelorette party — complicated and expensive.",
  },
  {
    q: "What sizes do you carry?",
    a: "S through 2XL. Unisex fit. Looks great on bartenders, servers, and anyone who's ever fantasized about quitting mid-shift.",
  },
  {
    q: "Can I suggest a shirt design?",
    a: "Absolutely. Hit us up on the Contact page. If your idea is funny enough, we might actually make it. If it's terrible, we'll roast you.",
  },
  {
    q: "Do you offer bulk/wholesale pricing?",
    a: "For bars, restaurants, and teams — yes. Contact us and we'll work something out. Staff uniforms with attitude? We're in.",
  },
  {
    q: "Are your shirts good quality?",
    a: "Premium cotton, pre-shrunk, built to survive doubles, spills, and the occasional cry in the walk-in cooler.",
  },
];

const FAQ = () => {
  const { getValue } = useSiteContent();
  const activeFaqs = faqs.map((fallback, i) => ({
    q: getValue("faq", "items", `q${i + 1}_q`, fallback.q),
    a: getValue("faq", "items", `q${i + 1}_a`, fallback.a),
  }));
  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <SEO
        title="FAQ"
        description="Got questions about Pournogravy? Shipping, sizing, returns, custom orders — we've got answers. Probably funnier than you expected."
        url="https://pournogravy.com/faq"
      />
      {/* Hero band */}
      <section className="relative bg-black text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(253,224,71,0.18), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255,23,68,0.12), transparent 50%)",
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
        <div className="container mx-auto px-4 pt-5 pb-6 md:pt-8 md:pb-10 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p
              className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-3"
              style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
            >
              {getValue("faq", "hero", "label", 'Asked more than "one more drink?"')}
            </p>
            <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none">
              {getValue("faq", "header", "heading", "FAQ")}
            </h1>
            <p className="text-white text-sm md:text-base mt-3 max-w-md">
              {getValue("faq", "hero", "subheading", "The stuff everyone wants to know. Answered with minimal sarcasm.")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Accordion */}
      <section className="container mx-auto px-4 max-w-2xl py-16 md:py-20">
        <Accordion type="single" collapsible className="space-y-3">
          {activeFaqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <AccordionItem
                value={`faq-${i}`}
                className="border-2 border-border data-[state=open]:border-[#fde047]/60 px-4 md:px-6 transition-colors bg-muted/20"
              >
                <AccordionTrigger className="font-display text-sm md:text-base tracking-widest text-left hover:no-underline group">
                  <span className="flex items-center gap-3">
                    <span className="font-marker text-[#fde047] text-xs opacity-60 group-data-[state=open]:opacity-100 transition-opacity">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {faq.q.toUpperCase()}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pl-8 md:pl-10">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        {/* Can't find answer CTA */}
        <div className="mt-12 text-center border-t border-border pt-10">
          <p className="text-sm text-muted-foreground mb-4">
            Didn't answer your question?
          </p>
          <Link
            to="/contact"
            className="font-display text-sm tracking-widest uppercase text-[#fde047] hover:underline underline-offset-4"
          >
            Shoot us a message →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
