"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Privacy-friendly page-view counter: path only — no cookies, IPs or identifiers are stored. */
export function PageViewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    try {
      navigator.sendBeacon?.("/api/pv", new Blob([JSON.stringify({ path: pathname })], { type: "application/json" }));
    } catch {
      /* ignore */
    }
  }, [pathname]);
  return null;
}
