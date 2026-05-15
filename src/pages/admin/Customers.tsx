import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, User, Package, Star, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CustomerProfile {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  currency: string;
}

interface LoyaltyAccount {
  points_balance: number;
  lifetime_points: number;
}

interface CustomerData {
  profile: CustomerProfile;
  orders: Order[];
  loyalty: LoyaltyAccount | null;
  wishlistCount: number;
}

const fmt = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

const Customers = () => {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerProfile[]>([]);
  const [selected, setSelected] = useState<CustomerData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(true);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSelected(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, is_admin, created_at")
      .ilike("email", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) toast.error("Search failed");
    else setResults(data ?? []);
    setSearching(false);
  }, [query]);

  const loadCustomer = async (profile: CustomerProfile) => {
    setLoadingDetail(true);
    setSelected(null);
    setOrdersOpen(true);

    const [{ data: orders }, { data: loyalty }, { data: wishlist }] = await Promise.all([
      supabase.from("orders").select("id, created_at, status, total_cents, currency").eq("user_id", profile.id).order("created_at", { ascending: false }),
      supabase.from("loyalty_accounts").select("points_balance, lifetime_points").eq("user_id", profile.id).maybeSingle(),
      supabase.from("wishlists").select("id").eq("user_id", profile.id),
    ]);

    setSelected({
      profile,
      orders: orders ?? [],
      loyalty: loyalty ?? null,
      wishlistCount: wishlist?.length ?? 0,
    });
    setLoadingDetail(false);
  };

  const totalSpent = selected?.orders.reduce((s, o) => s + o.total_cents, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Search bar */}
      <div className="border border-border bg-card p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search by email address…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-transparent border border-border focus:outline-none focus:border-[#fde047] transition-colors"
            />
          </div>
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            className="px-5 py-2.5 bg-[#fde047] text-black font-display tracking-widest text-xs hover:bg-[#fde047]/90 transition-colors disabled:opacity-40"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "SEARCH"}
          </button>
        </div>

        {/* Results list */}
        {results.length > 0 && !selected && (
          <div className="mt-3 divide-y divide-border border border-border">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => loadCustomer(p)}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-muted/40 transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.email}</p>
                  {p.display_name && <p className="text-xs text-muted-foreground">{p.display_name}</p>}
                </div>
                {p.is_admin && (
                  <span className="text-[10px] font-marker tracking-widest text-[#fde047] uppercase">Admin</span>
                )}
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer detail */}
      {loadingDetail && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {selected && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Header */}
          <div className="border border-[#fde047]/30 bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-marker tracking-widest text-muted-foreground uppercase mb-1">Customer</p>
                <h2 className="font-display text-2xl tracking-wider">{selected.profile.email}</h2>
                {selected.profile.display_name && (
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.profile.display_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {new Date(selected.profile.created_at).toLocaleDateString()}
                  {selected.profile.is_admin && <span className="ml-2 text-[#fde047]">· Admin</span>}
                </p>
              </div>
              <button onClick={() => { setSelected(null); setResults([]); setQuery(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ← Back to search
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <div className="bg-muted/30 p-3 rounded">
                <p className="text-[10px] text-muted-foreground font-marker tracking-widest uppercase">Orders</p>
                <p className="font-display text-2xl tracking-wider mt-1">{selected.orders.length}</p>
              </div>
              <div className="bg-muted/30 p-3 rounded">
                <p className="text-[10px] text-muted-foreground font-marker tracking-widest uppercase">Total Spent</p>
                <p className="font-display text-2xl tracking-wider mt-1">{fmt(totalSpent)}</p>
              </div>
              <div className="bg-muted/30 p-3 rounded">
                <p className="text-[10px] text-muted-foreground font-marker tracking-widest uppercase flex items-center gap-1">
                  <Star className="h-3 w-3 fill-[#fde047] text-[#fde047]" />Pour Points
                </p>
                <p className="font-display text-2xl tracking-wider text-[#fde047] mt-1">
                  {selected.loyalty?.points_balance?.toLocaleString() ?? 0}
                </p>
                {selected.loyalty && (
                  <p className="text-[10px] text-muted-foreground">{selected.loyalty.lifetime_points.toLocaleString()} lifetime</p>
                )}
              </div>
              <div className="bg-muted/30 p-3 rounded">
                <p className="text-[10px] text-muted-foreground font-marker tracking-widest uppercase flex items-center gap-1">
                  <Heart className="h-3 w-3 text-[#ff1744]" />Wishlist
                </p>
                <p className="font-display text-2xl tracking-wider mt-1">{selected.wishlistCount}</p>
              </div>
            </div>
          </div>

          {/* Order history */}
          <div className="border border-border bg-card">
            <button
              onClick={() => setOrdersOpen((o) => !o)}
              className="w-full px-5 py-4 flex items-center gap-2 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <Package className="h-4 w-4 text-[#fde047]" />
              <h3 className="font-display tracking-widest text-sm flex-1 text-left">ORDER HISTORY</h3>
              <span className="text-xs text-muted-foreground">{selected.orders.length} order{selected.orders.length !== 1 ? "s" : ""}</span>
              {ordersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            <AnimatePresence>
              {ordersOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  {selected.orders.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">No orders yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {selected.orders.map((order) => (
                        <li key={order.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-display tracking-wider text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()} · {order.status}
                            </p>
                          </div>
                          <p className="font-display tracking-wider">{fmt(order.total_cents, order.currency)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Customers;
