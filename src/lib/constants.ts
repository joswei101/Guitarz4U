export const BUSINESS = {
  name: "Guitarz4U",
  tagline: "Second-hand equipment, first-hand service.",
  location: "Sandringham, Johannesburg",
  region: "Gauteng",
  country: "South Africa",
  whatsapp: "0648567019",
  email: "Joshuaweinfas@gmail.com",
  socialHandle: "Shuaweinfas",
  closedNotice: "Closed on Saturdays.",
} as const;

export const CONDITIONS = [
  { value: "mint", label: "Mint", description: "As new. No visible wear; plays perfectly." },
  { value: "excellent", label: "Excellent", description: "Very light signs of use. Plays perfectly." },
  { value: "very_good", label: "Very good", description: "Minor cosmetic wear such as light scratches. Plays well." },
  { value: "good", label: "Good", description: "Noticeable cosmetic wear (dings, scratches, fading). Fully functional." },
  { value: "fair", label: "Fair", description: "Heavy wear or minor functional issues, all disclosed in the listing." },
  {
    value: "needs_repair",
    label: "Needs repair",
    description: "Sold as-is for repair or restoration. Defects are described in the listing.",
  },
] as const;
export type Condition = (typeof CONDITIONS)[number]["value"];
export const conditionLabel = (c: string) => CONDITIONS.find((x) => x.value === c)?.label ?? c;

export const PRODUCT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
] as const;
export const productStatusLabel = (s: string) => PRODUCT_STATUSES.find((x) => x.value === s)?.label ?? s;

export const PURCHASE_REQUEST_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "reviewing", label: "Being reviewed" },
  { value: "accepted", label: "Accepted" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const RESERVATION_STATUSES = [
  { value: "requested", label: "Requested (not confirmed)" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Completed (purchased)" },
] as const;

export const SELLER_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "more_info_requested", label: "More information requested" },
  { value: "approved", label: "Approved for inspection" },
  { value: "offer_made", label: "Offer made" },
  { value: "offer_accepted", label: "Offer accepted" },
  { value: "offer_declined", label: "Offer declined" },
  { value: "rejected", label: "Not accepted" },
  { value: "purchased", label: "Purchased" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export const REPAIR_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "awaiting_review", label: "Awaiting review" },
  { value: "awaiting_customer", label: "Awaiting customer response" },
  { value: "quote_provided", label: "Quote provided" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In progress" },
  { value: "awaiting_collection", label: "Awaiting collection" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "declined", label: "Declined" },
] as const;

export const REVIEW_STATUSES = [
  { value: "pending", label: "Awaiting approval" },
  { value: "approved", label: "Published" },
  { value: "rejected", label: "Not approved" },
  { value: "removed", label: "Removed" },
] as const;

export const REPAIR_SERVICES = [
  { value: "strings", label: "String replacement", description: "Fresh strings fitted, stretched and tuned." },
  {
    value: "setup",
    label: "Guitar setup",
    description: "Action, relief, intonation and playability adjusted to suit you.",
  },
  {
    value: "electronics",
    label: "Electronics repairs",
    description: "Scratchy pots, dead jacks, switches, wiring and pickups.",
  },
  { value: "body", label: "Body repairs", description: "Cracks, dings, finish touch-ups and structural issues." },
  { value: "hardware", label: "Hardware repairs", description: "Tuners, bridges, nuts, saddles and strap buttons." },
  { value: "fretwork", label: "Fretwork", description: "Fret levelling, crowning, polishing and fret ends." },
  { value: "other", label: "Other guitar repairs", description: "Something else? Describe it and we will assess it." },
] as const;
export const repairServiceLabel = (s: string) => REPAIR_SERVICES.find((x) => x.value === s)?.label ?? s;

export const GUITAR_TYPES = [
  { value: "electric", label: "Electric guitar" },
  { value: "bass", label: "Bass guitar" },
  { value: "acoustic", label: "Acoustic guitar" },
  { value: "classical", label: "Classical guitar" },
  { value: "other", label: "Other" },
] as const;

export const CONTACT_METHODS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
] as const;

export function statusLabel(list: readonly { value: string; label: string }[], value: string) {
  return list.find((s) => s.value === value)?.label ?? value;
}

/** Tone used for coloured status badges */
export function statusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (["completed", "approved", "accepted", "offer_accepted", "published", "purchased", "converted"].includes(status))
    return "success";
  if (["declined", "rejected", "cancelled", "removed", "withdrawn", "expired", "offer_declined", "sold"].includes(status))
    return "danger";
  if (
    ["more_info_requested", "awaiting_customer", "quote_provided", "offer_made", "awaiting_payment", "reserved",
      "awaiting_collection", "pending", "requested"].includes(status)
  )
    return "warning";
  if (["in_progress", "reviewing", "under_review", "awaiting_review"].includes(status)) return "info";
  return "neutral";
}

export const MAX_UPLOAD_PHOTOS = 12;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
