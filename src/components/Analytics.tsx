"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Cookie-free page-view counter. Sends only the path. Admin and account pages are skipped.
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/account")) return;
    const body = JSON.stringify({ event: "page_view", path: pathname });
    try {
      navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" })) ||
        fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    } catch {}
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("[data-track]") as HTMLElement | null;
      if (!a) return;
      const body = JSON.stringify({ event: a.dataset.track, path: location.pathname, productId: a.dataset.product });
      try { navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" })); } catch {}
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
