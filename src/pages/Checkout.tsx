import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Checkout = () => {
  const { state } = useLocation() as { state: { clientSecret?: string; orderId?: string } | null };
  const navigate = useNavigate();

  useEffect(() => {
    if (!state?.clientSecret) navigate("/shop", { replace: true });
  }, [state, navigate]);

  if (!state?.clientSecret) return null;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl tracking-widest mb-6 text-center">CHECKOUT</h1>
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret: state.clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
};

export default Checkout;
