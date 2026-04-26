import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black text-white">
      {/* ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 30% 40%, rgba(253,224,71,0.18), transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(255,23,68,0.2), transparent 50%)",
        }}
      />
      {/* subtle noise */}
      <div
        aria-hidden="true"
        className="absolute inset-0 noise-overlay opacity-50 pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center px-4 max-w-xl"
      >
        <p
          className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase mb-6"
          style={{ textShadow: "0 0 10px rgba(253,224,71,0.5)" }}
        >
          ☠ 86'd
        </p>

        <h1
          className="font-display text-[120px] md:text-[200px] leading-none tracking-wider text-white/10"
          style={{ textShadow: "0 0 40px rgba(253,224,71,0.15)" }}
        >
          404
        </h1>

        <h2 className="font-display text-3xl md:text-5xl tracking-wider leading-[0.95] -mt-4 md:-mt-8 relative">
          YOU TOOK A{" "}
          <span className="font-marker stamp-rotate inline-block text-[#ff1744] drop-shadow-[0_0_12px_rgba(255,23,68,0.6)]">
            WRONG
          </span>
          <br />
          TURN, KAREN.
        </h2>

        <p className="text-white/60 text-sm md:text-base mt-6 max-w-md mx-auto">
          This page doesn't exist. Like your understanding of happy hour pricing.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <Link to="/">
            <Button className="h-12 px-8 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90">
              <Home className="mr-2 h-4 w-4" /> HOME
            </Button>
          </Link>
          <Link to="/shop">
            <Button
              variant="outline"
              className="h-12 px-8 font-display tracking-widest border-white/20 text-white hover:bg-white/5 hover:text-[#fde047] hover:border-[#fde047]/50"
            >
              <ShoppingBag className="mr-2 h-4 w-4" /> SHOP THE LINE
            </Button>
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 mt-8 text-xs tracking-widest text-white/40 hover:text-white font-display uppercase transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Or go back
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
