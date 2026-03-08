import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "How long does shipping take?",
    a: "3-7 business days domestically. Faster than your manager responding to your schedule request, slower than a Karen finding something to complain about."
  },
  {
    q: "What's your return policy?",
    a: "30 days, unworn, with tags. We're more lenient than your bar manager but less lenient than your ex."
  },
  {
    q: "Do you ship internationally?",
    a: "Not yet. Turns out dealing with customs is like dealing with a bachelorette party — complicated and expensive."
  },
  {
    q: "What sizes do you carry?",
    a: "S through 2XL. Unisex fit. Looks great on bartenders, servers, and anyone who's ever fantasized about quitting mid-shift."
  },
  {
    q: "Can I suggest a shirt design?",
    a: "Absolutely. Hit us up on the Contact page. If your idea is funny enough, we might actually make it. If it's terrible, we'll roast you."
  },
  {
    q: "Do you offer bulk/wholesale pricing?",
    a: "For bars, restaurants, and teams — yes. Contact us and we'll work something out. Staff uniforms with attitude? We're in."
  },
  {
    q: "Are your shirts good quality?",
    a: "Premium cotton, pre-shrunk, built to survive doubles, spills, and the occasional cry in the walk-in cooler."
  },
];

const FAQ = () => {
  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <div className="container mx-auto px-4 max-w-2xl pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider mb-4">FAQ</h1>
          <p className="text-muted-foreground text-sm mb-12">
            Questions we get asked more often than "Can I get one more drink after last call?"
          </p>

          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border px-4">
                <AccordionTrigger className="font-display text-sm tracking-wider text-left hover:no-underline">
                  {faq.q.toUpperCase()}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQ;
