import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, Instagram, MessageCircle, Check } from "lucide-react";

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <SEO
        title="Contact"
        description="Reach out to Pournogravy — questions, custom orders, wholesale inquiries, or just need to vent about a bad tipper. We're listening."
        url="https://pournogravy.com/contact"
      />
      {/* Hero band */}
      <section className="relative bg-black text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 80% 30%, rgba(253,224,71,0.2), transparent 50%), radial-gradient(ellipse at 20% 70%, rgba(255,23,68,0.15), transparent 50%)",
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
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p
              className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-3"
              style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
            >
              We're listening
            </p>
            <h1 className="font-display text-5xl md:text-7xl tracking-wider leading-none">
              CONTACT
            </h1>
            <p className="text-white/70 text-sm md:text-base mt-3 max-w-lg">
              Got a question, complaint, or a good bartender horror story? Slide it over.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form + info */}
      <section className="relative noise-overlay">
        <div className="container mx-auto px-4 max-w-5xl py-16 md:py-20">
          <div className="grid md:grid-cols-[1fr_auto] gap-12 md:gap-16">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border-2 border-[#fde047]/40 bg-muted/30 p-10 text-center"
                  style={{ boxShadow: "0 0 40px rgba(253,224,71,0.15)" }}
                >
                  <div className="h-14 w-14 mx-auto rounded-full bg-[#fde047] flex items-center justify-center mb-4">
                    <Check className="h-7 w-7 text-black" />
                  </div>
                  <p className="font-display text-2xl md:text-3xl tracking-wider mb-2">
                    MESSAGE RECEIVED.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    We'll get back to you faster than we cut off a bad tipper.
                  </p>
                </motion.div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label
                      htmlFor="name"
                      className="text-xs font-display tracking-widest uppercase block mb-2 text-muted-foreground"
                    >
                      Name
                    </label>
                    <Input
                      id="name"
                      className="h-12 bg-muted/50 border-border focus-visible:ring-[#fde047] focus-visible:border-[#fde047]"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="text-xs font-display tracking-widest uppercase block mb-2 text-muted-foreground"
                    >
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      className="h-12 bg-muted/50 border-border focus-visible:ring-[#fde047] focus-visible:border-[#fde047]"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="text-xs font-display tracking-widest uppercase block mb-2 text-muted-foreground"
                    >
                      Message
                    </label>
                    <Textarea
                      id="message"
                      className="min-h-[160px] bg-muted/50 border-border resize-none focus-visible:ring-[#fde047] focus-visible:border-[#fde047]"
                      placeholder="What the hell do you want?"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 font-display tracking-widest text-base bg-[#fde047] text-black hover:bg-[#fde047]/90"
                    style={{ boxShadow: "0 0 20px rgba(253,224,71,0.3)" }}
                  >
                    SEND IT
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    No spam. No bullshit. Just human replies.
                  </p>
                </form>
              )}
            </motion.div>

            {/* Contact methods sidebar */}
            <aside className="md:w-64 space-y-6">
              <div>
                <p
                  className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-4"
                  style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
                >
                  Other ways
                </p>
                <div className="space-y-4">
                  <ContactCard
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value="Opie@pournogravy.com"
                    href="mailto:Opie@pournogravy.com"
                  />
                  <ContactCard
                    icon={<Instagram className="h-4 w-4" />}
                    label="Instagram"
                    value="@pournogravy"
                    href="#"
                  />
                  <ContactCard
                    icon={<MessageCircle className="h-4 w-4" />}
                    label="DMs open"
                    value="For horror stories"
                    href="#"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <p className="font-marker text-xs tracking-[0.3em] text-muted-foreground uppercase mb-2">
                  Response time
                </p>
                <p className="text-sm text-foreground">24–48 hrs on weekdays.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Weekends we're usually working doubles.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

const ContactCard = ({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) => (
  <a
    href={href}
    className="group flex items-center gap-3 p-3 border border-border hover:border-[#fde047]/50 transition-colors"
  >
    <div className="h-9 w-9 flex items-center justify-center bg-muted group-hover:bg-[#fde047] group-hover:text-black transition-colors">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-display tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm text-foreground truncate">{value}</p>
    </div>
  </a>
);

export default Contact;
