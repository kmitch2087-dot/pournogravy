import SEO from "@/components/SEO";
import { useSiteContent } from "@/context/SiteContentContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { RichText } from "@/components/RichText";

const Thanks = () => {
  const { getValue, getPublished } = useSiteContent();

  const heroVisible  = getPublished("thanks", "hero");
  const introVisible = getPublished("thanks", "intro");
  const crewVisible  = getPublished("thanks", "crew");

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <SEO
        title="Thank You"
        description="The people who poured into Pournogravy — friends, family, regulars, and everyone who had a hand in building this. A round on the house."
        url="https://pournogravy.com/thank-you"
        imageAlt="Pournogravy — the people who poured into this"
      />

      {/* Hero band */}
      {heroVisible && (
        <section className="relative bg-black text-white overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse at 20% 30%, rgba(253,224,71,0.18), transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(255,23,68,0.15), transparent 50%)",
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
                className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-4"
                style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
              >
                <RichText html={getValue("thanks", "hero", "eyebrow", "A round on the house")} />
              </p>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-wider leading-[0.95]">
                <RichText html={getValue("thanks", "hero", "headline", "The People Who Poured Into This")} />
              </h1>
            </motion.div>
          </div>
        </section>
      )}

      {/* Body */}
      <section className="relative noise-overlay">
        <div className="container mx-auto px-4 max-w-3xl py-16 md:py-24 space-y-14">
          {/* Intro */}
          {introVisible && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-muted-foreground text-base md:text-lg leading-relaxed"
            >
              <RichText
                html={getValue(
                  "thanks",
                  "intro",
                  "body",
                  "<p>Nobody builds this alone. This page is my bar tab, paid back in thank-yous. Pull up a stool — this round's on me.</p>"
                )}
              />
            </motion.div>
          )}

          {/* Shout-outs */}
          {crewVisible && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-4 mb-6">
                <h2 className="font-display text-2xl md:text-3xl tracking-wider text-foreground whitespace-nowrap">
                  <RichText html={getValue("thanks", "crew", "heading", "The Crew Behind the Bar")} />
                </h2>
                <span aria-hidden="true" className="h-px flex-1 bg-[#fde047]/40" />
              </div>
              <div className="text-muted-foreground text-base leading-relaxed space-y-3 border-l-4 border-[#fde047] pl-6 md:pl-8">
                <RichText
                  html={getValue(
                    "thanks",
                    "crew",
                    "body",
                    "<p><strong>The regulars</strong> — you know who you are. Couldn't have done it without you.</p>"
                  )}
                />
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <div className="text-center pt-2">
            <Link to="/shop">
              <Button className="h-14 px-10 font-display text-lg tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                GRAB A SHIRT <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Thanks;
