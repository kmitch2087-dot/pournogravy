import SEO from "@/components/SEO";
import { useSiteContent } from "@/context/SiteContentContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { RichText } from "@/components/RichText";

const About = () => {
  const { getValue } = useSiteContent();

  // Hero headline is CMS-editable, but keep the signature red marker flourish on
  // the final word (e.g. "2AM"). Split off the last space-delimited word; the
  // rest keeps its author line breaks via whitespace-pre-line.
  const heroHeadline = getValue("about", "hero", "headline", "BORN BEHIND\nA BAR AT 2AM").trimEnd();
  const headlineSplit = heroHeadline.lastIndexOf(" ");
  const headlineHead = headlineSplit >= 0 ? heroHeadline.slice(0, headlineSplit) : "";
  const headlineLastWord = headlineSplit >= 0 ? heroHeadline.slice(headlineSplit + 1) : heroHeadline;

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <SEO
        title="About"
        description="Pournogravy was born behind the bar. Apparel for bartenders who've heard it all, poured it all, and survived to tell the tale. Meet the brand."
        url="https://pournogravy.com/about"
        imageAlt="POURnogravy — the brand story"
      />
      {/* Hero band */}
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
              <RichText html={getValue("about", "hero", "label", "My Story")} />
            </p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wider leading-[0.9]">
              {headlineHead && (
                <>
                  <span className="whitespace-pre-line">{headlineHead}</span>{" "}
                </>
              )}
              <span className="font-marker stamp-rotate inline-block text-[#ff1744] drop-shadow-[0_0_12px_rgba(255,23,68,0.6)]">
                {headlineLastWord}
              </span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Narrative body */}
      <section className="relative noise-overlay">
        <div className="container mx-auto px-4 max-w-3xl py-16 md:py-24">
          <div className="space-y-8 text-muted-foreground text-base leading-relaxed">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-foreground text-xl md:text-2xl font-display tracking-wider leading-relaxed"
            >
              <RichText html={getValue("about", "hero", "heading", "POURNOGRAVY WAS BORN SOMEWHERE BETWEEN A KAREN'S COMPLAINT AND A SPILLED COSMO.")} />
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <RichText html={getValue("about", "body", "p1", "We're not a corporate clothing brand with a mission statement written by an intern. We're career bartenders, servers, barbacks, and hospitality lifers who've been in the weeds more times than we can count — and we're still standing (barely).")} />
            </motion.p>

            {/* Stamp pull-quote */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="my-12 relative"
            >
              <div
                aria-hidden="true"
                className="absolute -inset-4 opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(253,224,71,0.15), transparent 60%)",
                  filter: "blur(20px)",
                }}
              />
              <blockquote className="relative border-l-4 border-[#fde047] pl-6 md:pl-8 py-2">
                <p className="font-marker text-2xl md:text-3xl stamp-rotate text-foreground leading-tight">
                  <RichText html={getValue("about", "pullquote", "text", "If you've ever been stiffed on a $200 tab — these shirts are for you.")} />
                </p>
              </blockquote>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <RichText html={getValue("about", "body", "p2", "POURnogravy is for the people who smile through gritted teeth, who master the art of the fake laugh, and who've memorized every excuse a bad tipper has ever used. We make shirts that say what you're already thinking — because you can't say it to their face (HR, liability, whatever).")} />
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <RichText html={getValue("about", "body", "p3", "Every design is born from real stories, real shifts, and real rage. If someone's ever snapped their fingers at you, called you \"sweetie\" in that voice, or explained your job to you while spilling their drink — you already know the uniform.")} />
            </motion.p>
          </div>

          {/* Closing manifesto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 relative border-2 border-[#fde047]/30 bg-black p-8 md:p-12 text-center overflow-hidden"
            style={{ boxShadow: "0 0 40px rgba(253,224,71,0.1)" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(253,224,71,0.2), transparent 70%)",
              }}
            />
            <p
              className="relative font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-4"
              style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
            >
              <RichText html={getValue("about", "manifesto", "label", "The manifesto")} />
            </p>
            <p className="relative font-display text-white text-2xl md:text-4xl tracking-wider leading-tight">
              <RichText html={getValue("about", "manifesto", "text", '"WE DON\'T JUST MAKE SHIRTS. WE MAKE UNIFORMS FOR THE UNDERAPPRECIATED."')} />
            </p>
          </motion.div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link to="/shop">
              <Button className="h-14 px-10 font-display text-lg tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
                {getValue("about", "cta", "button", "READ THE MENU")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
