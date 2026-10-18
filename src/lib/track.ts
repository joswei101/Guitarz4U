"use client";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

type EventType = "page_view" | "product_view" | "wishlist_add" | "whatsapp_click" | "share";

/**
 * First-party, cookie-free analytics. Only the event type, product and page
 * path are stored — no IP address, no user id, no tracking cookies.
 * Respects the browser's "Do Not Track" / Global Privacy Control setting.
 */
export function track(type: EventType, productId?: string) {
  try {
    if (!isSupabaseConfigured) return;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    void createClient().rpc("track_event", {
      p_type: type,
      p_product_id: productId ?? undefined,
      p_path: window.location.pathname,
    });
  } catch {
    /* analytics must never break the page */
  }
}
