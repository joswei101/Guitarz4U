import type { EnquiryStatus, OrderStatus, RepairStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/shop/order-status";
import { REPAIR_STATUS_LABELS } from "@/lib/repairs/status";
import { ENQUIRY_STATUS_LABELS } from "@/lib/enquiries/status";
import { Badge } from "./ui/misc";

type Tone = "neutral" | "amp" | "ok" | "warn" | "danger" | "info";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone: Tone = ["PAID", "COLLECTED", "READY_FOR_COLLECTION"].includes(status) ? "ok" : ["PAYMENT_FAILED", "CANCELLED", "EXPIRED"].includes(status) ? "danger" : ["CANCELLATION_REQUESTED", "REFUND_PENDING", "AWAITING_PAYMENT", "PAYMENT_PROCESSING"].includes(status) ? "warn" : "info";
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  const tone: Tone = ["COLLECTED", "PAID", "READY_FOR_COLLECTION", "COMPLETED", "QUOTE_ACCEPTED"].includes(status) ? "ok" : ["DECLINED", "CANCELLED"].includes(status) ? "danger" : ["AWAITING_CUSTOMER_APPROVAL", "PAYMENT_DUE"].includes(status) ? "amp" : "info";
  return <Badge tone={tone}>{REPAIR_STATUS_LABELS[status]}</Badge>;
}

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const tone: Tone = ["OFFER_ACCEPTED", "PURCHASE_COMPLETED", "CONVERTED_TO_INVENTORY"].includes(status) ? "ok" : ["DECLINED", "OFFER_DECLINED", "WITHDRAWN"].includes(status) ? "danger" : ["OFFER_MADE", "MORE_INFO_REQUESTED", "COUNTER_OFFER_RECEIVED"].includes(status) ? "amp" : "info";
  return <Badge tone={tone}>{ENQUIRY_STATUS_LABELS[status]}</Badge>;
}

export function fmtDate(d: Date | null | undefined, withTime = false): string {
  if (!d) return "—";
  return d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "short", day: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
}
