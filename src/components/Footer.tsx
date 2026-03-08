import { Link } from "react-router-dom";
import { Instagram, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <img src="/logo.webp" alt="POURnogravy" className="h-12 w-auto mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Saving my bar from the socially stupid, one Karen at a time.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest mb-4">SHOP</h4>
            <div className="flex flex-col gap-2">
              <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">All Products</Link>
              <Link to="/collections" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Collections</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest mb-4">INFO</h4>
            <div className="flex flex-col gap-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest mb-4">FOLLOW THE CHAOS</h4>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} POURnogravy. All rights reserved. Don't steal our stuff.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
