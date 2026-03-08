import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useState } from "react";

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <div className="container mx-auto px-4 max-w-xl pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider mb-4">CONTACT</h1>
          <p className="text-muted-foreground text-sm mb-12">
            Got a question, complaint, or a good bartender horror story? We're listening.
          </p>

          {submitted ? (
            <div className="border border-border p-8 text-center">
              <p className="font-display text-2xl tracking-wider mb-2">MESSAGE RECEIVED.</p>
              <p className="text-muted-foreground text-sm">We'll get back to you faster than we cut off a bad tipper.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-display tracking-widest block mb-2">NAME</label>
                <Input className="h-12 bg-muted border-border" placeholder="Your name" required />
              </div>
              <div>
                <label className="text-xs font-display tracking-widest block mb-2">EMAIL</label>
                <Input type="email" className="h-12 bg-muted border-border" placeholder="your@email.com" required />
              </div>
              <div>
                <label className="text-xs font-display tracking-widest block mb-2">MESSAGE</label>
                <Textarea className="min-h-[150px] bg-muted border-border resize-none" placeholder="What's on your mind?" required />
              </div>
              <Button type="submit" className="w-full h-12 font-display tracking-widest text-lg bg-primary text-primary-foreground">
                SEND IT
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
