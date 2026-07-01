import { useState, useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, ShoppingBag, Trash2, Plus } from "lucide-react";

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

interface ShippingAddress {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  is_primary: boolean;
  last_used_at: string;
}

// Reusable branded checkbox
function Checkbox({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className={`h-4 w-4 border flex items-center justify-center transition-colors ${checked ? "border-[#fde047] bg-[#fde047]" : "border-border bg-transparent group-hover:border-[#fde047]/50"}`}>
          {checked && <svg className="h-2.5 w-2.5 text-black" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </div>
      <span className="text-xs text-muted-foreground leading-relaxed">{children}</span>
    </label>
  );
}

// Radio dot
function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "border-[#fde047]" : "border-border"}`}>
      {selected && <div className="h-2 w-2 rounded-full bg-[#fde047]" />}
    </div>
  );
}

// Saved address picker
function AddressPicker({ addresses, selectedId, onSelect, onDelete }: {
  addresses: ShippingAddress[];
  selectedId: string | "new";
  onSelect: (id: string | "new") => void;
  onDelete: (id: string) => void;
}) {
  const maxReached = addresses.length >= 5;

  return (
    <div className="space-y-2">
      {addresses.map((addr) => {
        const selected = selectedId === addr.id;
        return (
          <div
            key={addr.id}
            onClick={() => onSelect(addr.id)}
            className={`flex items-start justify-between gap-2 p-3 border cursor-pointer transition-colors ${selected ? "border-[#fde047] bg-[#fde047]/5" : "border-border hover:border-border/60"}`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <RadioDot selected={selected} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {addr.is_primary && (
                    <span className="text-[9px] font-display tracking-widest uppercase text-[#fde047] border border-[#fde047]/40 px-1.5 py-0.5 leading-none">
                      Primary
                    </span>
                  )}
                  <span className="text-sm font-medium leading-tight">{addr.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} {addr.zip} · {addr.country}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(addr.id); }}
              className="shrink-0 p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
              title="Delete this address"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {/* Add new */}
      <button
        type="button"
        onClick={() => { if (!maxReached) onSelect("new"); }}
        disabled={maxReached}
        className={`w-full flex items-center gap-2.5 p-3 border transition-colors text-left ${
          selectedId === "new" && !maxReached
            ? "border-[#fde047] bg-[#fde047]/5"
            : maxReached
            ? "border-border opacity-40 cursor-not-allowed"
            : "border-dashed border-border hover:border-[#fde047]/40"
        }`}
      >
        <RadioDot selected={selectedId === "new" && !maxReached} />
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {maxReached ? (
            "Max 5 addresses reached — delete one to add another"
          ) : (
            <><Plus className="h-3.5 w-3.5" /> Add a new address</>
          )}
        </span>
      </button>
    </div>
  );
}

// Address form fields (used for new address entry and guest checkout)
function AddressForm({ form, setForm }: {
  form: { fullName: string; address1: string; address2: string; city: string; state: string; zip: string; country: string };
  setForm: React.Dispatch<React.SetStateAction<{ fullName: string; email: string; address1: string; address2: string; city: string; state: string; zip: string; country: string }>>;
}) {
  const f = (field: "fullName" | "address1" | "address2" | "city" | "state" | "zip") =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="space-y-4">
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
    </div>
  );
}

const CheckoutForm = ({ orderId, initialEmail, serverTotal, userId }: { orderId: string; initialEmail: string; serverTotal: number; userId?: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [error, setError] = useState("");

  // Saved addresses (logged-in users)
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");

  // Account creation (guests only)
  const [wantsAccount, setWantsAccount] = useState(false);
  const [password, setPassword] = useState("");

  // Marketing optin
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

  // Fetch saved addresses for logged-in users
  useEffect(() => {
    if (!userId) return;
    setAddressesLoading(true);
    (supabase as any)
      .from("shipping_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("last_used_at", { ascending: false })
      .then(({ data }: { data: ShippingAddress[] | null }) => {
        setAddressesLoading(false);
        if (data && data.length > 0) {
          setSavedAddresses(data);
          const primary = data.find((a) => a.is_primary) ?? data[0];
          setSelectedAddressId(primary.id);
        }
      });
  }, [userId]);

  const handleDeleteAddress = (id: string) => {
    (supabase as any).from("shipping_addresses").delete().eq("id", id).then(() => {
      setSavedAddresses((prev) => {
        const remaining = prev.filter((a) => a.id !== id);
        if (selectedAddressId === id) {
          const next = remaining.find((a) => a.is_primary) ?? remaining[0];
          setSelectedAddressId(next ? next.id : "new");
        }
        return remaining;
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!form.email) {
      setError("Please enter your email address.");
      return;
    }

    const isGuest = !userId;
    const usingNewAddress = isGuest || selectedAddressId === "new";

    // Validate new address form fields when needed
    if (usingNewAddress) {
      if (!form.fullName || !form.address1 || !form.city || !form.state || !form.zip) {
        setError("Please fill in all required shipping fields.");
        return;
      }
    }

    if (wantsAccount && password.length > 0 && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setError("");

    // Resolve the address to ship to
    let shipAddr: { name: string; line1: string; line2?: string; city: string; state: string; zip: string; country: string };
    if (!isGuest && selectedAddressId !== "new") {
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (!addr) {
        setError("Please select a shipping address.");
        setSubmitting(false);
        return;
      }
      shipAddr = { name: addr.name, line1: addr.line1, line2: addr.line2 ?? undefined, city: addr.city, state: addr.state, zip: addr.zip, country: addr.country };
      // Mark as primary (fire-and-forget)
      supabase.rpc("set_primary_shipping_address" as any, { p_address_id: selectedAddressId }).then(() => {});
    } else {
      shipAddr = { name: form.fullName, line1: form.address1, line2: form.address2 || undefined, city: form.city, state: form.state, zip: form.zip, country: form.country };
    }

    let resolvedUserId: string | undefined = userId;

    // Create account if requested
    if (isGuest && wantsAccount && password.length >= 8) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password,
        options: { data: { full_name: form.fullName } },
      });
      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        setError(
          msg.includes("already registered") || msg.includes("already exists") || msg.includes("email")
            ? "An account with this email already exists. Log in first or continue as a guest."
            : signUpError.message
        );
        setSubmitting(false);
        return;
      }
      resolvedUserId = signUpData.user?.id;
    }

    // Save new address to shipping_addresses
    if (resolvedUserId && usingNewAddress) {
      if (savedAddresses.length >= 5) {
        setError("You have 5 saved addresses (the maximum). Delete one before adding another.");
        setSubmitting(false);
        return;
      }
      const { data: newAddr } = await (supabase as any)
        .from("shipping_addresses")
        .insert({
          user_id: resolvedUserId,
          name:    shipAddr.name,
          line1:   shipAddr.line1,
          line2:   shipAddr.line2 ?? null,
          city:    shipAddr.city,
          state:   shipAddr.state,
          zip:     shipAddr.zip,
          country: shipAddr.country,
        })
        .select("id")
        .single();
      if (newAddr?.id) {
        supabase.rpc("set_primary_shipping_address" as any, { p_address_id: newAddr.id }).then(() => {});
      }
    }

    // Email subscribers optin (fire-and-forget)
    if (emailOptin && form.email) {
      (supabase as any)
        .from("email_subscribers")
        .upsert({ email: form.email.trim().toLowerCase(), source: "checkout" }, { onConflict: "email" })
        .then(() => {});
    }

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/return?order=${orderId}&amount=${serverTotal.toFixed(2)}`,
        shipping: {
          name: shipAddr.name,
          address: {
            line1:       shipAddr.line1,
            line2:       shipAddr.line2,
            city:        shipAddr.city,
            state:       shipAddr.state,
            postal_code: shipAddr.zip,
            country:     shipAddr.country,
          },
        },
        receipt_email: form.email,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    }
  };

  const isGuest = !userId;
  const showAddressForm = isGuest || selectedAddressId === "new";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Contact */}
      <section className="space-y-4">
        <h2 className="font-display text-xs tracking-[0.25em] uppercase text-[#fde047]">Contact</h2>
        <Field label="Email" id="email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required autoComplete="email" />
      </section>

      {/* Account creation — guests only */}
      {isGuest && (
        <section className="space-y-4 border border-border/50 rounded p-4 bg-white/[0.02]">
          <Checkbox id="wants-account" checked={wantsAccount} onChange={setWantsAccount}>
            <span>
              <span className="text-foreground font-medium">Save my info & track my order</span>
              {" — "}create a free account. Never re-enter your address.
            </span>
          </Checkbox>

          {wantsAccount && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="password" className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                Password <span className="text-muted-foreground/60 normal-case tracking-normal">(min 8 characters)</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                className="bg-[#0a0a0a] border-[rgba(253,224,71,0.2)] focus:border-[rgba(253,224,71,0.5)] focus-visible:ring-0"
              />
            </div>
          )}

          <Checkbox id="email-optin" checked={emailOptin} onChange={setEmailOptin}>
            Email me about new drops, bar industry news, and the occasional deal. No spam. Unsubscribe any time.
          </Checkbox>
        </section>
      )}

      {/* Email optin for logged-in users */}
      {!isGuest && (
        <Checkbox id="email-optin-auth" checked={emailOptin} onChange={setEmailOptin}>
          Email me about new drops, bar industry news, and the occasional deal.
        </Checkbox>
      )}

      {/* Shipping */}
      <section className="space-y-4">
        <h2 className="font-display text-xs tracking-[0.25em] uppercase text-[#fde047]">Shipping</h2>

        {/* Saved address picker for logged-in users */}
        {!isGuest && (
          addressesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading saved addresses…
            </div>
          ) : (
            <AddressPicker
              addresses={savedAddresses}
              selectedId={selectedAddressId}
              onSelect={setSelectedAddressId}
              onDelete={handleDeleteAddress}
            />
          )
        )}

        {/* New address form (always shown for guests; shown when "Add new" selected for auth users) */}
        {showAddressForm && (
          <div className={!isGuest ? "pt-2 border-t border-border/30" : ""}>
            <AddressForm form={form} setForm={setForm} />
          </div>
        )}
      </section>

      {/* Payment */}
      <section className="space-y-4">
        <h2 className="font-display text-xs tracking-[0.25em] uppercase text-[#fde047]">Payment</h2>
        <PaymentElement options={{ layout: "tabs" }} onReady={() => setElementReady(true)} />
      </section>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || !elementReady || submitting}
        className="w-full h-14 bg-[#fde047] text-black hover:bg-[#fde047]/90 font-display tracking-widest text-base disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ boxShadow: "0 0 20px rgba(253,224,71,0.3)" }}
      >
        {submitting
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />PROCESSING…</>
          : !elementReady
          ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />LOADING…</>
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
  const { user } = useAuth();

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
            <CheckoutForm orderId={state.orderId} initialEmail={state.email ?? ""} serverTotal={serverTotal} userId={user?.id} />
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
