import { useCart } from "@/context/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";

const CartDrawer = () => {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="flex w-full flex-col bg-background sm:max-w-md border-l border-border">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl tracking-widest text-foreground">YOUR BAG</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground font-body">Empty. Like your customer's tip jar.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item) => (
                <div
                  key={`${item.product.id}-${item.size}`}
                  className="flex gap-4 border-b border-border pb-4"
                >
                  <div className="h-20 w-20 bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-xs text-muted-foreground">PNG</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm tracking-wider truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Size: {item.size}</p>
                    <p className="text-sm font-semibold mt-1">${item.product.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id, item.size)}
                        className="p-1 text-muted-foreground hover:text-destructive ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex justify-between font-display text-lg tracking-wider">
                <span>TOTAL</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <Button className="w-full h-12 font-display tracking-widest text-lg bg-primary text-primary-foreground hover:bg-primary/90">
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
