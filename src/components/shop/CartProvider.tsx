"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/local-store";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  image: string;
  condition?: string;
};

// The request cart lives in the visitor's browser (no account needed to browse).
// It is NOT an order: the server re-checks availability when a purchase
// request is submitted.
const cartStore = createLocalStore<CartItem[]>("g4u-request-cart", [], (value) =>
  Array.isArray(value) ? value.filter((i) => i && typeof i.id === "string").slice(0, 10) : [],
);

export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.getServer);
  const ready = useSyncExternalStore(cartStore.subscribe, () => true, () => false);

  const add = useCallback((item: CartItem) => {
    cartStore.set((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item].slice(0, 10)));
  }, []);
  const remove = useCallback((id: string) => cartStore.set((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => cartStore.set(() => []), []);
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return { items, ready, add, remove, clear, has };
}
