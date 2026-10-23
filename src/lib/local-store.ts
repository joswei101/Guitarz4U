"use client";

// A tiny localStorage-backed store for useSyncExternalStore. Falls back to
// in-memory state when storage is unavailable (e.g. private browsing).
export function createLocalStore<T>(key: string, initial: T, sanitise: (value: unknown) => T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? sanitise(JSON.parse(raw)) : initial;
    } catch {
      cache = initial;
    }
    return cache;
  }

  function emit() {
    listeners.forEach((l) => l());
  }

  return {
    get: read,
    getServer: () => initial,
    set(update: (prev: T) => T) {
      cache = update(read());
      try {
        window.localStorage.setItem(key, JSON.stringify(cache));
      } catch {
        // ignore storage failures
      }
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache = undefined;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}
