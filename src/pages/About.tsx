import { motion } from "framer-motion";

const About = () => {
  return (
    <div className="min-h-screen pt-24 md:pt-28">
      <div className="container mx-auto px-4 max-w-3xl pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider mb-8">ABOUT</h1>

          <div className="space-y-6 text-muted-foreground text-sm leading-relaxed">
            <p className="text-foreground text-lg font-display tracking-wider leading-relaxed">
              POURnogravy WAS BORN BEHIND A BAR AT 2AM ON A SATURDAY, SOMEWHERE BETWEEN A KAREN'S COMPLAINT AND A SPILLED COSMO.
            </p>

            <p>
              We're not a corporate clothing brand with a mission statement written by an intern. We're career bartenders, 
              servers, barbacks, and hospitality lifers who've been in the weeds more times than we can count — and we're 
              still standing (barely).
            </p>

            <p>
              POURnogravy is for the people who smile through gritted teeth, who master the art of the fake laugh, 
              and who've memorized every excuse a bad tipper has ever used. We make shirts that say what you're already 
              thinking — because you can't say it to their face (HR, liability, whatever).
            </p>

            <p>
              Every design is born from real stories, real shifts, and real rage. If you've ever been stiffed on a $200 tab, 
              had someone snap their fingers at you, or been told "the customer is always right" by someone who's never worked 
              a double — these shirts are for you.
            </p>

            <div className="border border-border p-8 mt-12">
              <p className="font-display text-foreground text-2xl tracking-wider leading-tight text-center">
                "WE DON'T JUST MAKE SHIRTS.<br />
                WE MAKE UNIFORMS FOR<br />
                THE UNDERAPPRECIATED."
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
