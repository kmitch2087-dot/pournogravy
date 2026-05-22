import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative bg-black text-white overflow-hidden">
      {/* neon top border */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent, #fde047 50%, transparent)",
          boxShadow: "0 0 20px rgba(253,224,71,0.5)",
        }}
      />
      {/* subtle vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(253,224,71,0.15), transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(255,23,68,0.1), transparent 50%)",
        }}
      />

      <div className="container mx-auto px-4 py-16 relative">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <img src="/logo.webp" alt="POURnogravy" className="h-12 w-auto mb-4" />
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Saving my bar from the socially stupid, one Karen at a time.
            </p>
          </div>

          <div>
            <h4
              className="font-marker text-xs tracking-[0.3em] mb-4 uppercase text-[#fde047]"
              style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
            >
              Shop
            </h4>
            <div className="flex flex-col gap-2">
              <Link to="/shop" className="text-sm text-white/70 hover:text-[#fde047] transition-colors">
                All Products
              </Link>
              <Link to="/merch-drops" className="text-sm text-white/70 hover:text-[#fde047] transition-colors">
                Merch Drops
              </Link>
            </div>
          </div>

          <div>
            <h4
              className="font-marker text-xs tracking-[0.3em] mb-4 uppercase text-[#fde047]"
              style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
            >
              Info
            </h4>
            <div className="flex flex-col gap-2">
              <Link to="/about" className="text-sm text-white/70 hover:text-[#fde047] transition-colors">
                My Story
              </Link>
              <Link to="/faq" className="text-sm text-white/70 hover:text-[#fde047] transition-colors">
                FAQ
              </Link>
              <Link to="/contact" className="text-sm text-white/70 hover:text-[#fde047] transition-colors">
                Contact
              </Link>
              <Link to="/terms" className="text-sm text-white/70 hover:text-[#fde047] transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-sm text-white/70 hover:text-[#fde047] transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>

          <div>
            <h4
              className="font-marker text-xs tracking-[0.3em] mb-4 uppercase text-[#fde047]"
              style={{ textShadow: "0 0 8px rgba(253,224,71,0.5)" }}
            >
              Follow the Chaos
            </h4>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/pournogravy/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pournogravy on Instagram"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:text-[#fde047] hover:border-[#fde047]/60 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61570796850901"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pournogravy on Facebook"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:text-[#fde047] hover:border-[#fde047]/60 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} POURnogravy. All rights reserved. Don't steal our stuff.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-xs text-white/30 hover:text-[#fde047] transition-colors">
                Terms of Service
              </Link>
              <span className="text-white/20 text-xs">|</span>
              <Link to="/privacy" className="text-xs text-white/30 hover:text-[#fde047] transition-colors">
                Privacy Policy
              </Link>
            </div>
            <p className="font-marker text-xs tracking-[0.3em] text-white/30 uppercase">
              ☠ Drink responsibly. Clock out loudly.
            </p>
          </div>

          {/* Aethyx credit */}
          <div className="text-center">
            <a
              href="https://aethyx.space"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/20 hover:text-[#fde047] transition-colors font-marker tracking-widest"
            >
              ⚡ Built by Aethyx — We make the internet weird, on purpose.
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
