import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useLoyalty } from "@/hooks/useLoyalty";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CheckoutReturn = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const revenue = parseFloat(searchParams.get("amount") ?? "0") || 0;
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { trackPurchase } = useAnalytics();
  const { programEnabled } = useLoyalty();

  const pointsEarned = Math.floor(revenue);

  const { data: pendingReviews = [] } = useQuery<{ id: string; review_token: string }[]>({
    queryKey: ["checkout-pending-reviews", user?.id],
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, review_token")
        .eq("user_id", user!.id)
        .in("status", ["shipped", "delivered"])
        .is("review_submitted_at", null)
        .not("review_token", "is", null)
        .neq("id", orderId ?? "")
        .limit(3);
      return (data ?? []) as { id: string; review_token: string }[];
    },
  });

  useEffect(() => {
    clearCart();
    if (orderId) trackPurchase(orderId, revenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mx-auto h-16 w-16 rounded-full bg-[#fde047]/10 border border-[#fde047]/30 flex items-center justify-center"
        >
          <CheckCircle2 className="h-8 w-8 text-[#fde047]" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
          <h1 className="font-display text-3xl tracking-widest">ORDER CONFIRMED</h1>
          <p className="font-marker text-sm tracking-wider text-muted-foreground uppercase">
            You're officially part of the movement.
          </p>
        </motion.div>

        {/* Pour Points earned (auth users only, program enabled) */}
        {user && pointsEarned > 0 && programEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-[#fde047]/30 bg-[#fde047]/5 rounded p-4 flex items-center gap-3"
          >
            <Star className="h-5 w-5 text-[#fde047] fill-[#fde047] shrink-0" />
            <div className="text-left">
              <p className="text-sm font-display tracking-wider">
                +{pointsEarned} <span className="text-[#fde047]">Pour Points</span> earned
              </p>
              <p className="text-[10px] text-muted-foreground">View your balance in your account</p>
            </div>
          </motion.div>
        )}

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-sm text-muted-foreground">
          We'll send a confirmation email when your order ships.
          {orderId && (
            <span className="block mt-1 text-xs font-mono text-muted-foreground/60">
              Order #{orderId.slice(0, 8).toUpperCase()}
            </span>
          )}
        </motion.p>

        {/* Pending reviews nudge — unreviewed past orders (not this one) */}
        {user && pendingReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="border border-[#fde047]/30 bg-[#fde047]/5 p-4 text-left space-y-2"
          >
            <div className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-[#fde047] fill-[#fde047] shrink-0" />
              <p className="text-xs font-display tracking-widest text-[#fde047]">
                REVIEWS WAITING
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              You have {pendingReviews.length} past order{pendingReviews.length !== 1 ? "s" : ""} without a review. Takes 60 seconds.
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingReviews.map((o, i) => (
                <Link key={o.id} to={`/review?token=${o.review_token}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs font-display tracking-widest gap-1 border-[#fde047]/30 text-[#fde047] hover:bg-[#fde047]/10">
                    <Star className="h-3 w-3 fill-[#fde047]" />
                    REVIEW ORDER {i + 1}
                  </Button>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col sm:flex-row gap-3 justify-center">
          {user && (
            <Button asChild variant="outline" className="font-display tracking-widest h-12 px-8">
              <Link to="/account">VIEW ACCOUNT</Link>
            </Button>
          )}
          <Button asChild className="bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest h-12 px-10">
            <Link to="/shop">KEEP SHOPPING</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default CheckoutReturn;
