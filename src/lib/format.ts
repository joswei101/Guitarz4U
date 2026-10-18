// Display helpers and human-readable labels (South African English).

const randFormatter = new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 1234500 cents → "R12 345" */
export function formatRand(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return "R" + randFormatter.format(cents / 100).replace(/,/g, " ").replace(/ /g, " ");
}

/** Parses "12 345,50", "R12345.50" or "12345" into cents. Returns null if invalid. */
export function parseRandToCents(input: string): number | null {
  const cleaned = input.replace(/[R\s]/gi, "").replace(",", ".");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

const dateFmt = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });
const dateTimeFmt = new Intl.DateTimeFormat("en-ZA", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg",
});

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateTimeFmt.format(new Date(d));
}

export const CONDITIONS = {
  excellent: { label: "Excellent", help: "Minimal signs of use. Plays and sounds as it should." },
  very_good: { label: "Very good", help: "Light wear consistent with careful use. Fully working." },
  good: { label: "Good", help: "Visible wear such as scratches or dings. Fully working." },
  fair: { label: "Fair", help: "Noticeable wear or minor issues, all disclosed in the listing." },
  poor: { label: "Poor", help: "Heavy wear and/or problems, all disclosed in the listing." },
  for_repair: { label: "Needs repair", help: "Not fully working or incomplete. Sold as a project instrument." },
} as const;
export type Condition = keyof typeof CONDITIONS;
export const conditionLabel = (c: string) => CONDITIONS[c as Condition]?.label ?? c;

export const PRODUCT_STATUSES = {
  draft: "Draft (hidden)",
  published: "Available",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived (hidden)",
} as const;

export const PURCHASE_STATUSES = {
  submitted: "Request submitted",
  under_review: "Under review",
  awaiting_customer: "Awaiting customer response",
  approved: "Purchase approved",
  awaiting_eft: "Awaiting private EFT payment",
  payment_confirmed: "Payment confirmed by administrator",
  ready_for_collection: "Ready for collection",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
} as const;
export type PurchaseStatus = keyof typeof PURCHASE_STATUSES;

export const RESERVATION_STATUSES = {
  requested: "Reservation requested — awaiting confirmation",
  approved: "Reservation approved",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
  converted: "Converted to purchase",
} as const;

export const SELLER_STATUSES = {
  submitted: "Submitted",
  under_review: "Under review",
  more_info_requested: "More information requested",
  approved: "Approved for inspection",
  offer_made: "Offer made",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  purchased: "Purchased by Guitarz4U",
  rejected: "Not accepted",
  withdrawn: "Withdrawn",
} as const;

export const REPAIR_STATUSES = {
  submitted: "Submitted",
  awaiting_review: "Awaiting review",
  awaiting_info: "Awaiting more information",
  quote_provided: "Quote provided",
  approved: "Approved",
  in_progress: "In progress",
  awaiting_collection: "Awaiting collection",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export const REPAIR_SERVICES = {
  strings: "String replacement",
  setup: "Guitar setup and adjustments",
  electronics: "Electronics repairs",
  body: "Body repairs",
  hardware: "Hardware repairs",
  fretwork: "Fretwork",
  other: "Other guitar repairs",
} as const;

export const WORKS_OPTIONS = {
  yes: "Yes, fully working",
  partly: "Partly working",
  no: "Not working",
  unsure: "Not sure",
} as const;

export const CONTACT_METHODS = { whatsapp: "WhatsApp", email: "Email", phone: "Phone call" } as const;

export function statusTone(status: string): "neutral" | "good" | "warn" | "bad" | "info" {
  if (["completed", "payment_confirmed", "approved", "published", "offer_accepted", "purchased", "ready_for_collection", "awaiting_collection"].includes(status)) return "good";
  if (["declined", "cancelled", "rejected", "expired", "withdrawn", "offer_declined", "sold", "removed"].includes(status)) return "bad";
  if (["awaiting_customer", "awaiting_eft", "more_info_requested", "awaiting_info", "quote_provided", "offer_made", "reserved", "pending"].includes(status)) return "warn";
  if (["in_progress", "under_review", "awaiting_review"].includes(status)) return "info";
  return "neutral";
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
