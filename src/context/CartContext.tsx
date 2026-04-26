import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Product, products } from "@/data/products";

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
  /** Optional fit variant id ("mens" / "womens") when the product has variants */
  variantId?: string;
  /** Optional color id ("black" / "cream") when the product has colors */
  colorId?: string;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ---------- localStorage helpers ----------
// Storage format is intentionally SLIM — only productId + size + (optional) variantId/colorId + quantity.
// We re-look up the full Product on hydrate so price/description/image updates
// flow through to existing carts automatically.
// Version history:
//   v1 — productId + size only
//   v2 — added variantId (Men's / Women's / Unisex)
//   v3 — added colorId (Black / Cream)
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

/** Two line items are "the same" when product, fit variant, color, and size all match. */
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
    // localStorage blocked (private mode, etc.) — return ephemeral id
    return crypto.randomUUID();
  }
};

const loadCart = (): CartItem[] => {
  if (!isBrowser) return [];
  try {
    // Best-effort cleanup of any older versions of the cart key.
    for (const k of LEGACY_CART_KEYS) {
      try { window.localStorage.removeItem(k); } catch { /* noop */ }
    }
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as StoredCartItem[];
    if (!Array.isArray(stored)) return [];

    // Hydrate: resolve productId → full Product. Drop anything we can't find.
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
        // Drop if the saved size is no longer available for this product.
        if (!product.sizes.includes(s.size)) return null;
        // If product has variants, the saved variantId must still exist.
        let variantId: string | undefined;
        if (product.variants && product.variants.length > 0) {
          const match = product.variants.find((v) => v.id === s.variantId);
          if (!match) return null;
          variantId = match.id;
        }
        // If product has colors, the saved colorId must still exist.
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
    // Corrupt JSON — start fresh
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
    // Quota exceeded or storage blocked — nothing to do
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  // Track whether we've loaded from storage yet, so we don't overwrite it
  // with the empty initial state before hydration finishes.
  const hydrated = useRef(false);

  // Hydrate once on mount
  useEffect(() => {
    setItems(loadCart());
    setSessionId(loadSessionId());
    hydrated.current = true;
  }, []);

  // Persist on every items change (after hydration)
  useEffect(() => {
    if (!hydrated.current) return;
    saveCart(items);
  }, [items]);

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
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

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
