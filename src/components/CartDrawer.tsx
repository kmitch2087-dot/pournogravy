import { useCart } from "@/context/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

const CartDrawer = () => {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, totalItems } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="flex w-full flex-col bg-background sm:max-w-md border-l border-[#fde047]/20 p-0">
        {/* Header with neon accent */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent, #fde047 50%, transparent)",
              boxShadow: "0 0 12px rgba(253,224,71,0.5)",
            }}
          />
          <SheetHeader>
            <SheetTitle className="font-display text-2xl tracking-widest text-foreground flex items-center justify-between">
              <span>YOUR BAG</span>
              {totalItems > 0 && (
                <span className="font-marker text-xs tracking-[0.3em] text-[#fde047] uppercase">
                  {totalItems} item{totalItems === 1 ? "" : "s"}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-marker text-sm tracking-wider text-muted-foreground uppercase">
                Empty. Like your customer's tip jar.
              </p>
              <Link to="/shop" onClick={closeCart}>
                <Button className="h-11 px-8 mt-2 font-display tracking-widest bg-[#fde047] text-black hover:bg-[#fde047]/90">
                  START SHOPPING
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => {
                // Look up fit + color on the line item so we can show
                // the right thumbnail and label combo.
                const variant = item.variantId
                  ? item.product.variants?.find((v) => v.id === item.variantId)
                  : undefined;
                const color = item.colorId
                  ? item.product.colors?.find((c) => c.id === item.colorId)
                  : undefined;
                // Same fallback chain as the product page gallery.
                const thumbnail =
                  (color?.imagesByFit?.[item.variantId ?? ""]?.[0]) ??
                  color?.images?.[0] ??
                  variant?.images?.[0] ??
                  item.product.image ??
                  item.product.images?.[0];
                return (
                  <div
                    key={`${item.product.id}-${item.variantId ?? "novariant"}-${item.colorId ?? "nocolor"}-${item.size}`}
                    className="flex gap-4 pb-4 border-b border-border last:border-b-0"
                  >
                    {/* Thumbnail */}
                    <div className="h-20 w-20 bg-muted flex-shrink-0 overflow-hidden border border-border/60 relative">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-marker text-xs tracking-wider text-muted-foreground">
                            PNG
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm tracking-wider uppercase leading-tight">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {variant && (
                          <>
                            <span className="text-foreground">{variant.label}</span>
                            <span className="mx-1.5">·</span>
                          </>
                        )}
                        {color && (
                          <>
                            <span className="text-foreground">{color.label}</span>
                            <span className="mx-1.5">·</span>
                          </>
                        )}
                        Size <span className="text-foreground">{item.size}</span>
                      </p>
                      <p className="text-sm font-display tracking-wider mt-1">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>

                      {/* Qty + remove */}
                      <div className="flex items-center gap-1 mt-3">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.size, item.quantity - 1, item.variantId, item.colorId)
                          }
                          aria-label="Decrease quantity"
                          className="h-7 w-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm w-8 text-center font-display">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.size, item.quantity + 1, item.variantId, item.colorId)
                          }
                          aria-label="Increase quantity"
                          className="h-7 w-7 flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.product.id, item.size, item.variantId, item.colorId)}
                          aria-label="Remove item"
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / checkout */}
            <div className="border-t border-border px-6 py-5 space-y-4 bg-muted/30">
              <div className="flex justify-between items-baseline font-display text-base tracking-widest">
                <span className="text-muted-foreground">SUBTOTAL</span>
                <span className="text-xl">${totalPrice.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Shipping and taxes calculated at checkout.
              </p>
              <Button
                className="w-full h-12 font-display tracking-widest text-base bg-[#fde047] text-black hover:bg-[#fde047]/90"
                style={{ boxShadow: "0 0 20px rgba(253,224,71,0.3)" }}
              >
                CHECKOUT
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Checkout is a demo — no real charges will be made.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
