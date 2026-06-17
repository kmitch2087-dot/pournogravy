import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Tag, X, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const TAB_BG = "#faf8f0";
const TAB_DASHED = "2px dashed rgba(120, 70, 20, 0.25)";
const RING_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 24,
  width: 68,
  height: 68,
  borderRadius: "50%",
  border: "9px solid rgba(150, 90, 20, 0.09)",
  boxShadow: "inset 0 0 14px rgba(150, 90, 20, 0.07), 0 0 6px rgba(150, 90, 20, 0.05)",
  transform: "rotate(-11deg)",
  pointerEvents: "none",
  zIndex: 0,
};

const CartDrawer = () => {
  const {
    items, isOpen, closeCart, removeItem, updateQuantity,
    totalPrice, totalItems, appliedDiscount, applyDiscount, clearDiscount, discountedTotal,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const { data: shippingSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("shipping_standard_cents, free_shipping_threshold_cents")
        .eq("id", 1)
        .maybeSingle();
      return data as { shipping_standard_cents: number | null; free_shipping_threshold_cents: number | null } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const standardCents = shippingSettings?.shipping_standard_cents ?? 799;
  const thresholdCents = shippingSettings?.free_shipping_threshold_cents ?? 7500;
  const subtotalCents = Math.round((appliedDiscount ? discountedTotal : totalPrice) * 100);
  const shippingFree = subtotalCents >= thresholdCents;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError("");
    setPromoLoading(true);
    const result = await applyDiscount(promoInput.trim());
    setPromoLoading(false);
    if (!result.valid) setPromoError(result.message);
    else setPromoInput("");
  };

  const startCheckout = async (email: string) => {
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const lineItems = items.map((item) => {
        const variant = item.variantId
          ? item.product.variants?.find((v) => v.id === item.variantId)
          : undefined;
        const color = item.colorId
          ? item.product.colors?.find((c) => c.id === item.colorId)
          : undefined;
        const thumbnail =
          (color?.imagesByFit?.[item.variantId ?? ""]?.[0]) ??
          color?.images?.[0] ??
          variant?.images?.[0] ??
          item.product.image ??
          item.product.images?.[0];
        const absoluteImage = thumbnail
          ? thumbnail.startsWith("http") ? thumbnail : `${window.location.origin}${thumbnail}`
          : undefined;
        return {
          slug: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_price_cents: Math.round(item.product.price * 100),
          size: item.size,
          ...(variant ? { variant: variant.label } : {}),
          ...(color ? { color: color.label } : {}),
          ...(absoluteImage ? { image: absoluteImage } : {}),
        };
      });

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          items: lineItems,
          email,
          ...(appliedDiscount ? { discount_code: appliedDiscount.code } : {}),
        },
      });

      if (error || !data?.clientSecret) {
        let msg = data?.error ?? "Checkout failed. Please try again.";
        if (error) {
          try {
            const body = await (error as any).context?.json?.();
            msg = body?.error ?? error.message ?? msg;
          } catch {
            msg = error.message ?? msg;
          }
        }
        setCheckoutError(msg);
        return;
      }

      closeCart();
      navigate("/checkout", { state: { clientSecret: data.clientSecret, orderId: data.orderId, email, shippingCents: data.shippingCents, totalCents: data.totalCents } });
    } catch (err) {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckout = () => {
    setCheckoutError("");
    if (user?.email) {
      startCheckout(user.email);
    } else {
      setShowEmailPrompt(true);
    }
  };

  const handleGuestCheckout = () => {
    if (!guestEmail.trim() || !guestEmail.includes("@")) {
      setCheckoutError("Please enter a valid email address.");
      return;
    }
    startCheckout(guestEmail.trim());
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        className="flex w-full flex-col sm:max-w-md p-0 overflow-hidden"
        style={{ background: TAB_BG, border: "none" }}
      >
        {/* Beer ring stain — CSS-only decoration */}
        <div aria-hidden="true" style={RING_STYLE} />

        {/* Header */}
        <div
          className="relative px-6 pt-6 pb-4 z-10"
          style={{ borderBottom: TAB_DASHED }}
        >
          <SheetHeader>
            <SheetTitle
              className="font-marker text-3xl flex items-center justify-between"
              style={{ color: "#2d1a08" }}
            >
              <span>YOUR TAB</span>
              {totalItems > 0 && (
                <span className="font-marker text-xs tracking-[0.2em] uppercase" style={{ color: "#7a4f1a" }}>
                  {totalItems} item{totalItems === 1 ? "" : "s"}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="text-center space-y-4">
              <div
                className="mx-auto h-16 w-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(120,70,20,0.08)" }}
              >
                <ShoppingBag className="h-7 w-7" style={{ color: "#9a6030" }} />
              </div>
              <p className="font-marker text-sm tracking-wider uppercase" style={{ color: "#7a5020" }}>
                Empty. Like your customer's tip jar.
              </p>
              <Link to="/shop" onClick={closeCart}>
                <Button
                  className="h-11 px-8 mt-2 font-marker tracking-widest"
                  style={{ background: "#fde047", color: "#000", border: "none" }}
                >
                  START SHOPPING
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Line items — text only, receipt style */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {items.map((item) => {
                const variant = item.variantId
                  ? item.product.variants?.find((v) => v.id === item.variantId)
                  : undefined;
                const color = item.colorId
                  ? item.product.colors?.find((c) => c.id === item.colorId)
                  : undefined;

                const label = [
                  item.product.name.toUpperCase(),
                  variant ? variant.label : null,
                  color ? color.label : null,
                  item.size,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div
                    key={`${item.product.id}-${item.variantId ?? "novariant"}-${item.colorId ?? "nocolor"}-${item.size}`}
                    className="space-y-1.5"
                  >
                    {/* Receipt row: NAME · SIZE ............ $55.98 */}
                    <div
                      className="flex items-baseline gap-0 font-mono text-sm"
                      style={{ color: "#2d1a08" }}
                    >
                      <span className="font-bold leading-snug" style={{ maxWidth: "55%", wordBreak: "break-word" }}>
                        {label}
                      </span>
                      <span
                        className="flex-1 overflow-hidden mx-1 leading-snug"
                        style={{ color: "rgba(80,45,10,0.35)", letterSpacing: "2px", minWidth: 8 }}
                        aria-hidden="true"
                      >
                        {'..........................................................'}
                      </span>
                      <span className="font-bold flex-shrink-0 leading-snug">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    {/* Qty controls + remove (compact, below the receipt row) */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono mr-1" style={{ color: "#7a5020" }}>
                        ×{item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.size, item.quantity - 1, item.variantId, item.colorId)
                        }
                        aria-label="Decrease quantity"
                        className="h-6 w-6 flex items-center justify-center transition-opacity hover:opacity-60"
                        style={{ border: "1px solid rgba(120,70,20,0.3)", color: "#5a3010", borderRadius: 2 }}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.size, item.quantity + 1, item.variantId, item.colorId)
                        }
                        aria-label="Increase quantity"
                        className="h-6 w-6 flex items-center justify-center transition-opacity hover:opacity-60"
                        style={{ border: "1px solid rgba(120,70,20,0.3)", color: "#5a3010", borderRadius: 2 }}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id, item.size, item.variantId, item.colorId)}
                        aria-label="Remove item"
                        className="ml-auto p-1 transition-opacity hover:opacity-60"
                        style={{ color: "#b04020" }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dashed separator between items and totals */}
            <div className="mx-6" style={{ borderTop: TAB_DASHED }} />

            {/* Footer / totals + checkout */}
            <div className="px-6 py-5 space-y-3" style={{ background: "rgba(210,185,140,0.12)" }}>
              {/* Promo code */}
              {appliedDiscount ? (
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ background: "rgba(253,224,71,0.15)", border: "1px solid rgba(253,224,71,0.5)", borderRadius: 2 }}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-3.5 w-3.5" style={{ color: "#9a7000" }} />
                    <span className="font-mono font-bold tracking-wider" style={{ color: "#7a5800" }}>
                      {appliedDiscount.code}
                    </span>
                    <span className="text-xs" style={{ color: "#7a5020" }}>
                      {appliedDiscount.message}
                    </span>
                  </div>
                  <button onClick={clearDiscount} style={{ color: "#7a5020" }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                      className="flex-1 px-3 py-2 text-sm focus:outline-none font-mono uppercase placeholder:normal-case placeholder:tracking-normal"
                      style={{
                        background: "rgba(255,252,240,0.8)",
                        border: "1px solid rgba(120,70,20,0.3)",
                        color: "#2d1a08",
                        borderRadius: 2,
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoInput.trim()}
                      className="shrink-0 font-mono"
                      style={{ border: "1px solid rgba(120,70,20,0.4)", color: "#5a3010", background: "transparent" }}
                    >
                      {promoLoading ? "…" : "Apply"}
                    </Button>
                  </div>
                  {promoError && <p className="text-xs font-mono" style={{ color: "#b04020" }}>{promoError}</p>}
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between items-baseline font-mono text-sm" style={{ color: "#5a3a10" }}>
                <span>SUBTOTAL</span>
                <span className={appliedDiscount ? "line-through opacity-50" : ""}>
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
              {appliedDiscount && (
                <div className="flex justify-between items-baseline font-mono text-sm" style={{ color: "#7a5800" }}>
                  <span>DISCOUNT ({appliedDiscount.code})</span>
                  <span>-${(appliedDiscount.discountCents / 100).toFixed(2)}</span>
                </div>
              )}

              {/* Gratuity line */}
              <p className="text-xs italic" style={{ color: "#7a5020" }}>
                GRATUITY NOT INCLUDED (but karma is)
              </p>

              {/* Total */}
              <div
                className="flex justify-between items-baseline font-mono font-bold pt-2"
                style={{ borderTop: TAB_DASHED, color: "#2d1a08", fontSize: "1rem" }}
              >
                <span>TOTAL</span>
                <span>${discountedTotal.toFixed(2)}</span>
              </div>

              <p className="text-[11px] font-mono" style={{ color: "#9a7050" }}>
                Shipping + tax calculated at checkout.
              </p>

              {/* Guest email prompt */}
              {showEmailPrompt && !user && (
                <div className="space-y-2">
                  <p className="text-xs font-mono" style={{ color: "#5a3a10" }}>Enter your email to continue:</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={guestEmail}
                      onChange={(e) => { setGuestEmail(e.target.value); setCheckoutError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleGuestCheckout()}
                      autoFocus
                      className="flex-1 px-3 py-2 text-sm focus:outline-none font-mono"
                      style={{
                        background: "rgba(255,252,240,0.8)",
                        border: "1px solid rgba(120,70,20,0.3)",
                        color: "#2d1a08",
                        borderRadius: 2,
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleGuestCheckout}
                      disabled={checkoutLoading}
                      className="shrink-0 font-marker"
                      style={{ background: "#fde047", color: "#000", border: "none" }}
                    >
                      {checkoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Go"}
                    </Button>
                  </div>
                </div>
              )}

              {checkoutError && (
                <p className="text-xs font-mono" style={{ color: "#b04020" }}>{checkoutError}</p>
              )}

              {(!showEmailPrompt || user) && (
                <Button
                  className="w-full h-12 font-marker tracking-widest text-base disabled:opacity-60"
                  style={{
                    background: "#fde047",
                    color: "#000",
                    border: "none",
                    boxShadow: "0 2px 12px rgba(253,224,71,0.35)",
                    fontSize: "1.1rem",
                    letterSpacing: "0.15em",
                  }}
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />RUNNING YOUR TAB...</>
                    : "CLOSE OUT"
                  }
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
