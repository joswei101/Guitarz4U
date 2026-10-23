"use client";

import { createClient } from "@/lib/supabase/client";

export type TrackedEvent =
  | "product_view"
  | "cart_add"
  | "wishlist_add"
  | "purchase_request"
  | "reservation_request"
  | "seller_submission"
  | "repair_booking"
  | "enquiry"
  | "whatsapp_click"
  | "share";

/**
 * Privacy-friendly first-party analytics: records only the event name, the
 * product (if any) and the page path. No cookies, IP addresses or user IDs.
 * Respects the browser's Do Not Track / Global Privacy Control signals.
 */
export function trackEvent(name: TrackedEvent, productId?: string) {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    void createClient()
      .rpc("track_event", { p_event_name: name, p_product_id: productId ?? null, p_path: window.location.pathname })
      .then(() => undefined);
  } catch {
    // Never let analytics break the page.
  }
}
