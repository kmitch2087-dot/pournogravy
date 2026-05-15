import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Product, products } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
  variantId?: string;
  colorId?: string;
}

export interface AppliedDiscount {
  code: string;
  discountCents: number;
  message: string;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, size: string, variantId?: string, colorId?: string) => void;
  removeItem: (productId: string, size: string, variantId?: string, colorId?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, variantId?: string, colorId?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
  totalItems: number;
  totalPrice: number;
  sessionId: string;
  appliedDiscount: AppliedDiscount | null;
  applyDiscount: (code: string) => Promise<{ valid: boolean; message: string }>;
  clearDiscount: () => void;
  discountedTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ---------- localStorage helpers ----------
const CART_STORAGE_KEY = "pournogravy:cart:v3";
const LEGACY_CART_KEYS = ["pournogravy:cart:v1", "pournogravy:cart:v2"];
const SESSION_ID_KEY = "pournogravy:session_id";

type StoredCartItem = {
  productId: string;
  size: string;
  quantity: number;
  variantId?: string;
  colorId?: string;
};

const sameLine = (
  a: { product: Product; size: string; variantId?: string; colorId?: string },
  productId: string,
  size: string,
  variantId?: string,
  colorId?: string,
) =>
  a.product.id === productId &&
  a.size === size &&
  (a.variantId ?? null) === (variantId ?? null) &&
  (a.colorId ?? null) === (colorId ?? null);

const isBrowser = typeof window !== "undefined";

const loadSessionId = (): string => {
  if (!isBrowser) return "";
  try {
    const existing = window.localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
};

const loadCart = (): CartItem[] => {
  if (!isBrowser) return [];
  try {
    for (const k of LEGACY_CART_KEYS) {
      try { window.localStorage.removeItem(k); } catch { /* noop */ }
    }
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredCartItem[];
    if (!Array.isArray(stored)) return [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    return stored
      .filter((s): s is StoredCartItem =>
        typeof s?.productId === "string" &&
        typeof s?.size === "string" &&
        typeof s?.quantity === "number" &&
        s.quantity > 0,
      )
      .map((s) => {
        const product = productMap.get(s.productId);
        if (!product) return null;
        if (!product.sizes.includes(s.size)) return null;
        let variantId: string | undefined;
        if (product.variants && product.variants.length > 0) {
          const match = product.variants.find((v) => v.id === s.variantId);
          if (!match) return null;
          variantId = match.id;
        }
        let colorId: string | undefined;
        if (product.colors && product.colors.length > 0) {
          const match = product.colors.find((c) => c.id === s.colorId);
          if (!match) return null;
          colorId = match.id;
        }
        return {
          product,
          size: s.size,
          quantity: s.quantity,
          ...(variantId ? { variantId } : {}),
          ...(colorId ? { colorId } : {}),
        } satisfies CartItem;
      })
      .filter((i): i is CartItem => i !== null);
  } catch {
    return [];
  }
};

const saveCart = (items: CartItem[]) => {
  if (!isBrowser) return;
  try {
    const slim: StoredCartItem[] = items.map((i) => ({
      productId: i.product.id,
      size: i.size,
      quantity: i.quantity,
      ...(i.variantId ? { variantId: i.variantId } : {}),
      ...(i.colorId ? { colorId: i.colorId } : {}),
    }));
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Quota exceeded or storage blocked
  }
};

// ---------- DB sync helpers ----------

type DbCartRow = {
  product_slug: string;
  size: string;
  variant_id: string | null;
  color_id: string | null;
  quantity: number;
};

/** Merge DB rows into current cart. DB items fill gaps; local items win on conflict. */
const mergeDbIntoLocal = (local: CartItem[], rows: DbCartRow[]): CartItem[] => {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const merged = [...local];
  for (const row of rows) {
    if (!row.product_slug) continue;
    const product = productMap.get(row.product_slug);
    if (!product) continue;
    if (!product.sizes.includes(row.size)) continue;
    const variantId = row.variant_id ?? undefined;
    const colorId = row.color_id ?? undefined;
    const idx = merged.findIndex((i) =>
      sameLine(i, row.product_slug, row.size, variantId, colorId),
    );
    if (idx >= 0) {
      // Local wins — keep local quantity
    } else {
      merged.push({ product, size: row.size, quantity: row.quantity, ...(variantId ? { variantId } : {}), ...(colorId ? { colorId } : {}) });
    }
  }
  return merged;
};

/** Write current cart to DB for a logged-in user (delete + insert). */
const syncCartToDb = async (userId: string, items: CartItem[]) => {
  await supabase.from("cart_items").delete().eq("user_id", userId);
  if (items.length === 0) return;
  await supabase.from("cart_items").insert(
    items.map((item) => ({
      user_id: userId,
      product_slug: item.product.id,
      size: item.size,
      variant_id: item.variantId ?? null,
      color_id: item.colorId ?? null,
      quantity: item.quantity,
    })),
  );
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const hydrated = useRef(false);
  const mergedForUser = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init: load localStorage, then merge any existing DB cart ──────────────
  useEffect(() => {
    const local = loadCart();
    setItems(local);
    setSessionId(loadSessionId());
    hydrated.current = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const userId = session.user.id;
      currentUserIdRef.current = userId;
      if (mergedForUser.current === userId) return;
      mergedForUser.current = userId;
      await doMerge(userId, local);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth state changes: handle actual login / logout ──────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") return; // per auth race condition fix

        if (event === "SIGNED_IN" && session?.user) {
          const userId = session.user.id;
          currentUserIdRef.current = userId;
          if (mergedForUser.current === userId) return;
          mergedForUser.current = userId;
          // Capture current items at the time of login
          setItems((prev) => {
            doMerge(userId, prev);
            return prev; // unchanged until doMerge resolves
          });
        }

        if (event === "SIGNED_OUT") {
          currentUserIdRef.current = null;
          mergedForUser.current = null;
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Persist to localStorage + debounced DB sync when logged in ───────────
  useEffect(() => {
    if (!hydrated.current) return;
    saveCart(items);

    const userId = currentUserIdRef.current;
    if (!userId) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => syncCartToDb(userId, items), 1000);
  }, [items]);

  // ── Merge helper: fetch DB cart, merge into local, write back ────────────
  const doMerge = async (userId: string, localItems: CartItem[]) => {
    const { data: saved } = await supabase
      .from("cart_items")
      .select("product_slug, size, variant_id, color_id, quantity")
      .eq("user_id", userId);

    const merged = saved?.length
      ? mergeDbIntoLocal(localItems, saved as DbCartRow[])
      : localItems;

    setItems(merged);
    saveCart(merged);
    // Write merged cart back so cross-device is up to date
    await syncCartToDb(userId, merged);

    // Clean up any stale session-based rows from the old guest session
    const sid = loadSessionId();
    if (sid) {
      await supabase.from("cart_items").delete().eq("session_id", sid);
    }
  };

  const addItem = useCallback(
    (product: Product, size: string, variantId?: string, colorId?: string) => {
      setItems((prev) => {
        const existing = prev.find((i) => sameLine(i, product.id, size, variantId, colorId));
        if (existing) {
          return prev.map((i) =>
            sameLine(i, product.id, size, variantId, colorId)
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          );
        }
        return [
          ...prev,
          {
            product,
            size,
            quantity: 1,
            ...(variantId ? { variantId } : {}),
            ...(colorId ? { colorId } : {}),
          },
        ];
      });
      setIsOpen(true);
    },
    [],
  );

  const removeItem = useCallback(
    (productId: string, size: string, variantId?: string, colorId?: string) => {
      setItems((prev) => prev.filter((i) => !sameLine(i, productId, size, variantId, colorId)));
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, size: string, quantity: number, variantId?: string, colorId?: string) => {
      if (quantity <= 0) {
        removeItem(productId, size, variantId, colorId);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          sameLine(i, productId, size, variantId, colorId) ? { ...i, quantity } : i,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedDiscount(null);
  }, []);

  const clearDiscount = useCallback(() => setAppliedDiscount(null), []);

  const applyDiscount = useCallback(async (code: string): Promise<{ valid: boolean; message: string }> => {
    const cartTotalCents = Math.round(
      items.reduce((s, i) => s + i.product.price * i.quantity, 0) * 100,
    );
    const { data, error } = await supabase.functions.invoke("validate-discount", {
      body: { code, cart_total_cents: cartTotalCents },
    });
    if (error || !data) return { valid: false, message: "Could not validate code." };
    if (data.valid) {
      setAppliedDiscount({ code: code.toUpperCase(), discountCents: data.discount_cents, message: data.message });
    }
    return { valid: data.valid, message: data.message };
  }, [items]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const discountedTotal = Math.max(0, totalPrice - (appliedDiscount?.discountCents ?? 0) / 100);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        toggleCart: () => setIsOpen((o) => !o),
        closeCart: () => setIsOpen(false),
        totalItems,
        totalPrice,
        sessionId,
        appliedDiscount,
        applyDiscount,
        clearDiscount,
        discountedTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
