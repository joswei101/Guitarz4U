"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/** Records a page view (path only) on navigation. Admin pages are excluded. */
export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/shop/")) return; // product pages track product_view
    track("page_view");
  }, [pathname]);
  return null;
}
