import { query } from "./db";

export type AnalyticsEvent =
  | "page_view" | "product_view" | "purchase_request" | "reservation_request"
  | "seller_submission" | "repair_booking" | "whatsapp_click";

/**
 * First-party, cookie-free analytics. Stores only the event name, an optional
 * product id and the page path — no IP address, user id or device fingerprint.
 */
export async function track(event: AnalyticsEvent, opts: { productId?: string | null; path?: string } = {}) {
  try {
    await query("insert into analytics_events (event, product_id, path) values ($1,$2,$3)", [
      event,
      opts.productId ?? null,
      (opts.path ?? "").slice(0, 300),
    ]);
  } catch (err) {
    console.error("[analytics]", err);
  }
}
