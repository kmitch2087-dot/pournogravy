import { useState, useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ShoppingBag } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#fde047",
    colorBackground: "#111111",
    colorText: "#fafafa",
    colorTextSecondary: "#71717a",
    colorDanger: "#ef4444",
    borderRadius: "2px",
    fontSizeBase: "14px",
    spacingUnit: "5px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(253,224,71,0.2)",
      boxShadow: "none",
      backgroundColor: "#0a0a0a",
    },
    ".Input:focus": {
      border: "1px solid rgba(253,224,71,0.5)",
      boxShadow: "none",
    },
    ".Label": {
      fontSize: "10px",
      letterSpacing: "0.15em",
      textTransform: "uppercase" as const,
      color: "#71717a",
      marginBottom: "6px",
    },
    ".Tab": {
      border: "1px solid rgba(253,224,71,0.15)",
      backgroundColor: "#0a0a0a",
    },
    ".Tab:hover": {
      border: "1px solid rgba(253,224,71,0.4)",
    },
    ".Tab--selected": {
      border: "1px solid #fde047",
      backgroundColor: "#0a0a0a",
    },
    ".TabIcon--selected": {
      fill: "#fde047",
    },
    ".TabLabel--selected": {
      color: "#fde047",
    },
  },
};

const Field = ({
  label, id, required, ...props
}: { label: string; id: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
      {label}{required && " *"}
    </Label>
    <Input id={id} {...props} className="bg-[#0a0a0a] border-[rgba(253,224,71,0.2)] focus:border-[rgba(253,224,71,0.5)] focus-visible:ring-0" />
  </div>
);

const CheckoutForm = ({ orderId, initialEmail, serverTotal }: { orderId: string; initialEmail: string; serverTotal: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailOptin, setEmailOptin] = useState(true);

  const [form, setForm] = useState({
    fullName: "",
    email: initialEmail,
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!form.fullName || !form.email || !form.address1 || !form.city || !form.state || !form.zip) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/return?order=${orderId}&amount=${serverTotal.toFixed(2)}`,
        shipping: {
          name: form.fullName,
          address: {
            line1: form.address1,
            line2: form.address2 || undefined,
            city: form.city,
            state: form.state,
            postal_code: form.zip,
            country: form.country,
          },
        },
        receipt_email: form.email,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    }
    // On success Stripe redirects to return_url automatically
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Contact */}
      <section className="space-y-4">
        <h2 className="font-display text-xs tracking-[0.25em] uppercase text-[#fde047]">Contact</h2>
        <Field label="Email" id="email" type="email" value={form.email} onChange={f("email")} required autoComplete="email" />
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={emailOptin}
              onChange={(e) => setEmailOptin(e.target.checked)}
            />
            <div className={`h-4 w-4 border flex items-center justify-center transition-colors ${emailOptin ? "border-[#fde047] bg-[#fde047]" : "border-border bg-transparent"}`}>
              {emailOptin && <svg className="h-2.5 w-2.5 text-black" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">
            Notify me about new drops and deals. We won't spam you like your wounded ex, or sell your info.
          </span>
        </label>
      </section>

      {/* Shipping */}
      <section className="space-y-4">
        <h2 className="font-display text-xs tracking-[0.25em] uppercase text-[#fde047]">Shipping</h2>
        <Field label="Full name" id="fullName" value={form.fullName} onChange={f("fullName")} required autoComplete="name" />
        <Field label="Address" id="address1" value={form.address1} onChange={f("address1")} required autoComplete="address-line1" />
        <Field label="Apartment, suite, etc." id="address2" value={form.address2} onChange={f("address2")} autoComplete="address-line2" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" id="city" value={form.city} onChange={f("city")} required autoComplete="address-level2" />
          <Field label="State / Province" id="state" value={form.state} onChange={f("state")} required autoComplete="address-level1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ZIP / Postal code" id="zip" value={form.zip} onChange={f("zip")} required autoComplete="postal-code" />
          <div className="space-y-1.5">
            <Label htmlFor="country" className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Country *</Label>
            <select
              id="country"
              value={form.country}
              onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
              className="w-full h-10 rounded-none border border-[rgba(253,224,71,0.2)] bg-[#0a0a0a] px-3 text-sm text-foreground focus:outline-none focus:border-[rgba(253,224,71,0.5)]"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="space-y-4">
        <h2 className="font-display text-xs tracking-[0.25em] uppercase text-[#fde047]">Payment</h2>
        <PaymentElement options={{ layout: "tabs" }} />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full h-14 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest text-base disabled:opacity-50"
        style={{ boxShadow: "0 0 20px rgba(253,224,71,0.3)" }}
      >
        {submitting
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />PROCESSING…</>
          : `PAY $${serverTotal.toFixed(2)}`}
      </Button>
    </form>
  );
};

const Checkout = () => {
  const { state } = useLocation() as {
    state: { clientSecret?: string; orderId?: string; email?: string; shippingCents?: number; totalCents?: number } | null;
  };
  const navigate = useNavigate();
  const { items, totalPrice, appliedDiscount, discountedTotal } = useCart();

  const { trackCheckoutStart } = useAnalytics();

  // Fire checkout_start once per checkout session (when we have a valid client secret)
  useEffect(() => {
    if (state?.clientSecret) trackCheckoutStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state?.clientSecret || !state.orderId) {
    navigate("/shop", { replace: true });
    return null;
  }

  const subtotalDisplay = appliedDiscount ? discountedTotal : totalPrice;
  const shippingCents = state.shippingCents ?? 599;
  const serverTotal = state.totalCents != null ? state.totalCents / 100 : subtotalDisplay + shippingCents / 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/shop" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-display tracking-wider">BACK TO SHOP</span>
        </Link>
        <span className="font-display text-xl tracking-widest text-[#fde047]">POURNOGRAVY</span>
        <div className="w-24" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 lg:grid lg:grid-cols-[1fr_380px] lg:gap-12">
        {/* Left: form */}
        <div>
          <h1 className="font-display text-2xl tracking-widest mb-8">CHECKOUT</h1>
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: state.clientSecret, appearance: stripeAppearance }}
          >
            <CheckoutForm orderId={state.orderId} initialEmail={state.email ?? ""} serverTotal={serverTotal} />
          </Elements>
        </div>

        {/* Right: order summary */}
        <aside className="mt-10 lg:mt-0">
          <div className="lg:sticky lg:top-8 border border-border bg-muted/20 p-6 space-y-4">
            <h2 className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground">Your Order</h2>
            <div className="space-y-3">
              {items.map((item) => {
                const thumbnail = item.product.image ?? item.product.images?.[0];
                return (
                  <div key={`${item.product.id}-${item.size}-${item.variantId}-${item.colorId}`} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 bg-muted border border-border overflow-hidden">
                      {thumbnail && <img src={thumbnail} alt={item.product.name} className="h-full w-full object-cover" />}
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#fde047] text-black text-[10px] font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display tracking-wider leading-tight truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Size {item.size}</p>
                    </div>
                    <p className="text-sm font-display tracking-wider shrink-0">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              {appliedDiscount && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="line-through text-muted-foreground">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#fde047]">
                    <span>{appliedDiscount.code}</span>
                    <span>−${(appliedDiscount.discountCents / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className={shippingCents === 0 ? "text-green-400 font-display tracking-wider" : ""}>
                  {shippingCents === 0 ? "FREE" : `$${(shippingCents / 100).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between font-display tracking-wider border-t border-border pt-2">
                <span>Total</span>
                <span className="text-lg">${serverTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
