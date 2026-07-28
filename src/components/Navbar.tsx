import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu, X, User, LayoutDashboard, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/reviews", label: "Reviews" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/thank-you", label: "Thank You" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const { toggleCart, totalItems } = useCart();
  const { user, isAdmin } = useAuth();
  const { wishlist } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-[#fde047] focus:text-black focus:px-4 focus:py-2 focus:rounded focus:font-display focus:text-sm focus:tracking-wider"
      >
        Skip to main content
      </a>
      <header>
      <nav
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-md border-b border-[#fde047]/20 shadow-[0_2px_20px_rgba(0,0,0,0.3)]"
            : "bg-background/60 backdrop-blur-sm border-b border-transparent"
        }`}
      >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20">
        {/* Logo */}
        <Link to="/" aria-label="POURnogravy — Home" className="flex items-center gap-2 group">
          <img
            src="/logo.webp"
            alt="POURnogravy"
            width="500"
            height="257"
            className="h-10 md:h-14 w-auto transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="relative font-display text-sm tracking-widest uppercase transition-colors hover:text-foreground py-2"
              >
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {link.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full"
                    style={{
                      background: "#fde047",
                      boxShadow: "0 0 8px rgba(253,224,71,0.8), 0 0 16px rgba(253,224,71,0.4)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 font-display text-xs tracking-widest uppercase text-muted-foreground hover:text-[#fde047] transition-colors"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 font-display text-xs tracking-widest uppercase text-muted-foreground hover:text-[#fde047] transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                Account
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-display text-xs tracking-widest uppercase text-muted-foreground hover:text-[#fde047] transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              Log in
            </Link>
          )}
          <Link
            to="/wishlist"
            aria-label={`Wishlist, ${wishlist.length} saved`}
            className="relative p-2 text-foreground hover:text-[#ff1744] transition-colors"
          >
            <Heart className={`h-5 w-5 ${wishlist.length > 0 ? "fill-[#ff1744] text-[#ff1744]" : ""}`} />
            {wishlist.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff1744] text-[9px] font-bold text-white">
                {wishlist.length}
              </span>
            )}
          </Link>
          <button
            onClick={toggleCart}
            aria-label={`Open cart, ${totalItems} item${totalItems === 1 ? "" : "s"}`}
            className="relative p-2 text-foreground hover:text-[#fde047] transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span
                aria-live="polite"
                aria-atomic="true"
                className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#fde047] text-[10px] font-bold text-black"
                style={{ boxShadow: "0 0 10px rgba(253,224,71,0.6)" }}
              >
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="p-2 text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#fde047]/20 bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((link) => {
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`py-3 font-display text-lg tracking-widest uppercase transition-colors border-l-2 pl-4 ${
                      active
                        ? "text-foreground border-[#fde047]"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {user ? (
                <>
                  <Link
                    to="/account"
                    className="py-3 font-display text-lg tracking-widest uppercase text-muted-foreground border-l-2 border-transparent pl-4 hover:text-[#fde047] hover:border-[#fde047]/40 transition-colors flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Account
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="py-3 font-display text-lg tracking-widest uppercase text-muted-foreground border-l-2 border-transparent pl-4 hover:text-[#fde047] hover:border-[#fde047]/40 transition-colors flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Admin
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  to="/login"
                  className="py-3 font-display text-lg tracking-widest uppercase text-muted-foreground border-l-2 border-transparent pl-4 hover:text-[#fde047] hover:border-[#fde047]/40 transition-colors flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Log in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </nav>
      </header>
    </>
  );
};

export default Navbar;
