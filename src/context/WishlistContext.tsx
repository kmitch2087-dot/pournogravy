import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WishlistContextValue {
  wishlist: string[];
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const GUEST_KEY = "pournogravy:wishlist";

const loadGuestWishlist = (): string[] => {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveGuestWishlist = (ids: string[]) => {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(ids));
  } catch { /* noop */ }
};

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (userId) {
      supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", userId)
        .then(({ data }) => {
          if (cancelled) return;
          setWishlist(data?.map((r) => r.product_id) ?? []);
          setLoading(false);
        });
    } else {
      setWishlist(loadGuestWishlist());
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [userId]);

  const isSaved = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const toggle = useCallback(async (productId: string) => {
    const saved = wishlist.includes(productId);
    if (userId) {
      if (saved) {
        await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId);
        setWishlist((prev) => prev.filter((id) => id !== productId));
      } else {
        await supabase.from("wishlists").insert({ user_id: userId, product_id: productId });
        setWishlist((prev) => [...prev, productId]);
      }
    } else {
      const next = saved
        ? wishlist.filter((id) => id !== productId)
        : [...wishlist, productId];
      saveGuestWishlist(next);
      setWishlist(next);
    }
  }, [userId, wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, isSaved, toggle, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
};
