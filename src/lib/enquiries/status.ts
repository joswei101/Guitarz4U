import type { EnquiryStatus } from "@prisma/client";

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  MORE_INFO_REQUESTED: "More information requested",
  OFFER_MADE: "Offer made",
  COUNTER_OFFER_RECEIVED: "Counter-offer received",
  OFFER_ACCEPTED: "Offer accepted",
  OFFER_DECLINED: "Offer declined",
  DECLINED: "Declined",
  PURCHASE_COMPLETED: "Purchase completed",
  CONVERTED_TO_INVENTORY: "Added to inventory",
  WITHDRAWN: "Withdrawn",
};

export const OPEN_ENQUIRY_STATUSES: EnquiryStatus[] = ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUESTED", "OFFER_MADE", "COUNTER_OFFER_RECEIVED", "OFFER_ACCEPTED"];
const CLOSED: EnquiryStatus[] = ["DECLINED", "CONVERTED_TO_INVENTORY", "WITHDRAWN"];

export function canNegotiate(s: EnquiryStatus): boolean {
  return ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUESTED", "OFFER_MADE", "COUNTER_OFFER_RECEIVED", "OFFER_DECLINED"].includes(s);
}

export function isClosed(s: EnquiryStatus): boolean {
  return CLOSED.includes(s);
}
