import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const useWishlist = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load wishlist whenever userId changes
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

  return { wishlist, isSaved, toggle, loading };
};
