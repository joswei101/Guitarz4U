"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  image: string | null;
  quantity: number;
  maxQuantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "g4u-request-cart-v1";

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.id === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

/** The request cart lives in the browser until the visitor submits an enquiry. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once on mount
    setItems(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable (private mode) — cart still works for this visit */
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      add: (item, quantity = 1) => {
        const existing = items.find((i) => i.id === item.id);
        if (existing) {
          persist(
            items.map((i) =>
              i.id === item.id ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, item.maxQuantity) } : i,
            ),
          );
        } else if (items.length < 20) {
          persist([...items, { ...item, quantity: Math.min(quantity, item.maxQuantity) }]);
        }
      },
      remove: (id) => persist(items.filter((i) => i.id !== id)),
      setQuantity: (id, quantity) =>
        persist(items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxQuantity)) } : i))),
      replace: (next) => persist(next),
      clear: () => persist([]),
      has: (id) => items.some((i) => i.id === id),
    }),
    [items, ready, persist],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
