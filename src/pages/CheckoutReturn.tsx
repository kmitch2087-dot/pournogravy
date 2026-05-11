import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CheckoutReturn = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const revenue = parseFloat(searchParams.get("amount") ?? "0") || 0;
  const { clearCart } = useCart();
  const { trackPurchase } = useAnalytics();

  useEffect(() => {
    clearCart();
    if (orderId) trackPurchase(orderId, revenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-[#fde047]/10 border border-[#fde047]/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-[#fde047]" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl tracking-widest">ORDER CONFIRMED</h1>
          <p className="font-marker text-sm tracking-wider text-muted-foreground uppercase">
            You're officially part of the movement.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          We'll send a confirmation email when your order ships.
          {orderId && (
            <span className="block mt-1 text-xs font-mono text-muted-foreground/60">
              Order #{orderId.slice(0, 8).toUpperCase()}
            </span>
          )}
        </p>
        <Button asChild className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest h-12 px-10">
          <Link to="/shop">KEEP SHOPPING</Link>
        </Button>
      </div>
    </div>
  );
};

export default CheckoutReturn;
