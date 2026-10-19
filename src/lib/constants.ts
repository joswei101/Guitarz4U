import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];
export type ProductStatus = Enums["product_status"];
export type ProductCondition = Enums["product_condition"];
export type FunctionalStatus = Enums["functional_status"];
export type PurchaseStatus = Enums["purchase_status"];
export type ReservationStatus = Enums["reservation_status"];
export type SellerStatus = Enums["seller_status"];
export type RepairStatus = Enums["repair_status"];
export type ReviewStatus = Enums["review_status"];
export type ContactMethod = Enums["contact_method"];
export type WorkingState = Enums["working_state"];

export const BUSINESS = {
  name: "Guitarz4U",
  tagline: "Second-hand equipment, first-hand service.",
  locality: "Sandringham",
  city: "Johannesburg",
  region: "Gauteng",
  country: "South Africa",
} as const;

// Shown wherever a purchase or reservation can be requested.
export const PAYMENT_NOTICE =
  "Guitarz4U does not process online payments. If your purchase request is approved, payment will be arranged privately by EFT with the owner. Please wait for confirmation before making payment. Your order is not confirmed until Guitarz4U has approved it and confirmed the arrangements.";

export const PURCHASE_SUCCESS_MESSAGE =
  "Your purchase request has been submitted successfully. Guitarz4U will review your request and contact you to confirm availability and arrange payment privately by EFT. No payment has been taken, and your purchase is not confirmed yet.";

export const SECOND_HAND_NOTICE =
  "This is a second-hand instrument. It may show signs of wear consistent with previous use, and any known defects are disclosed in the listing. Please read the description and defects carefully and ask us if anything is unclear.";

export const COLLECTION_PRIVACY_NOTICE =
  "Our exact collection address is shared privately only after a purchase has been approved and collection arrangements have been confirmed.";

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  mint: "Mint / as new",
  excellent: "Excellent",
  very_good: "Very good",
  good: "Good",
  fair: "Fair",
  project: "Project / needs repair",
};

export const CONDITION_DESCRIPTIONS: Record<ProductCondition, string> = {
  mint: "Little or no visible wear. Plays and looks virtually new.",
  excellent: "Light signs of use only. Fully functional.",
  very_good: "Some cosmetic wear such as light scratches or buckle rash. Plays well.",
  good: "Noticeable cosmetic wear, dings or scratches. Still a solid player.",
  fair: "Heavy wear and/or minor functional issues, clearly disclosed.",
  project: "Broken, incomplete or not working. Sold as-is for repair or restoration.",
};

export const FUNCTIONAL_LABELS: Record<FunctionalStatus, string> = {
  fully_working: "Fully working",
  minor_issues: "Working, with minor issues",
  needs_repair: "Needs repair",
  not_working: "Not working / incomplete",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Available",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
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
};

export const PURCHASE_STATUS_ORDER: PurchaseStatus[] = [
  "submitted",
  "under_review",
  "awaiting_customer",
  "approved",
  "awaiting_eft",
  "payment_confirmed",
  "ready_for_collection",
  "completed",
  "declined",
  "cancelled",
];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  requested: "Awaiting approval",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
  fulfilled: "Fulfilled",
};

export const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  more_info_requested: "More information requested",
  offer_made: "Offer made",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  approved: "Approved",
  rejected: "Not accepted",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  submitted: "Submitted",
  awaiting_review: "Awaiting review",
  awaiting_info: "Awaiting more information",
  quote_provided: "Quote provided",
  approved: "Approved",
  in_progress: "In progress",
  awaiting_collection: "Awaiting collection",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Awaiting moderation",
  approved: "Published",
  rejected: "Rejected",
  removed: "Removed",
};

export const WORKING_LABELS: Record<WorkingState, string> = {
  yes: "Yes, it works",
  partially: "Partially",
  no: "No, it does not work",
  unsure: "Not sure",
};

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone call",
};

export const REPAIR_SERVICES = [
  { id: "strings", name: "String replacement", description: "Fresh strings fitted, stretched and tuned to your preferred gauge." },
  { id: "setup", name: "Guitar setup and adjustments", description: "Neck relief, action, intonation and general playability adjustments." },
  { id: "electronics", name: "Electronics repairs", description: "Crackly pots, faulty jacks and switches, wiring and pickup issues." },
  { id: "body", name: "Body repairs", description: "Cracks, dings, finish touch-ups and structural body issues, where feasible." },
  { id: "hardware", name: "Hardware repairs", description: "Tuners, bridges, saddles, nuts, strap buttons and other hardware." },
  { id: "fretwork", name: "Fretwork", description: "Fret levelling, crowning, polishing and assessment of worn frets." },
  { id: "other", name: "Other guitar repairs", description: "Something else? Describe the problem and we will assess it." },
] as const;

export type RepairServiceId = (typeof REPAIR_SERVICES)[number]["id"];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export const PAGE_SIZE = 12;

// Status badge tones
export function statusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (["completed", "payment_confirmed", "approved", "published", "fulfilled", "offer_accepted"].includes(status)) return "success";
  if (["declined", "cancelled", "rejected", "expired", "removed", "withdrawn", "offer_declined", "sold", "archived"].includes(status)) return "danger";
  if (["awaiting_customer", "awaiting_eft", "more_info_requested", "awaiting_info", "quote_provided", "offer_made", "reserved", "pending", "requested", "ready_for_collection", "awaiting_collection"].includes(status)) return "warning";
  if (["under_review", "in_progress", "awaiting_review"].includes(status)) return "info";
  return "neutral";
}
