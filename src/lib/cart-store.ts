"use client";
// Request cart and recently viewed items live in the browser (localStorage).
// Availability is ALWAYS re-checked on the server when a request is submitted.
import { useSyncExternalStore } from "react";

const CART_KEY = "g4u_request_cart";
const RECENT_KEY = "g4u_recently_viewed";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
const cache: Record<string, { raw: string | null; value: string[] }> = {};

function read(key: string): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return EMPTY;
  }
  if (cache[key]?.raw === raw) return cache[key].value;
  let value: string[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, 30) : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache[key] = { raw, value };
  return value;
}
function write(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* storage unavailable (private mode) — cart works for this page only */
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = () => l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  get: () => read(CART_KEY),
  add: (id: string) => {
    const ids = read(CART_KEY);
    if (!ids.includes(id)) write(CART_KEY, [...ids, id].slice(0, 10));
  },
  remove: (id: string) => write(CART_KEY, read(CART_KEY).filter((x) => x !== id)),
  set: (ids: string[]) => write(CART_KEY, ids),
  clear: () => write(CART_KEY, []),
};

export const recentlyViewed = {
  get: () => read(RECENT_KEY),
  push: (id: string) => write(RECENT_KEY, [id, ...read(RECENT_KEY).filter((x) => x !== id)].slice(0, 8)),
};

export function useCart(): string[] {
  return useSyncExternalStore(subscribe, () => read(CART_KEY), () => EMPTY);
}
export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, () => read(RECENT_KEY), () => EMPTY);
}
