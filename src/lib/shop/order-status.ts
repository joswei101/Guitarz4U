import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_PROCESSING: "Payment processing",
  PAYMENT_FAILED: "Payment failed",
  EXPIRED: "Checkout expired",
  PAID: "Paid",
  COLLECTION_PENDING: "Collection arrangements pending",
  READY_FOR_COLLECTION: "Ready for collection",
  COLLECTED: "Collected",
  CANCELLATION_REQUESTED: "Cancellation requested",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
};

/**
 * Statuses staff may move an order to manually. Payment-related statuses (PAID, PAYMENT_FAILED)
 * can only be set by verified gateway notifications, and REFUNDED only by recording a
 * gateway-confirmed refund — staff can never mark an order paid by hand.
 */
export const ADMIN_ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["COLLECTION_PENDING", "READY_FOR_COLLECTION", "CANCELLED", "REFUND_PENDING"],
  COLLECTION_PENDING: ["READY_FOR_COLLECTION", "CANCELLED", "REFUND_PENDING"],
  READY_FOR_COLLECTION: ["COLLECTED", "COLLECTION_PENDING", "CANCELLED", "REFUND_PENDING"],
  CANCELLATION_REQUESTED: ["CANCELLED", "REFUND_PENDING", "COLLECTION_PENDING", "READY_FOR_COLLECTION"],
  COLLECTED: ["REFUND_PENDING"],
  AWAITING_PAYMENT: ["CANCELLED"],
  PAYMENT_FAILED: ["CANCELLED"],
  EXPIRED: ["CANCELLED"],
  CANCELLED: ["REFUND_PENDING"],
  // If a refund request is declined, the order can resume its normal flow.
  REFUND_PENDING: ["COLLECTION_PENDING", "READY_FOR_COLLECTION", "COLLECTED", "CANCELLED"],
};

export const PAID_STATUSES: OrderStatus[] = ["PAID", "COLLECTION_PENDING", "READY_FOR_COLLECTION", "COLLECTED", "CANCELLATION_REQUESTED", "REFUND_PENDING", "REFUNDED"];

export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PAID", "COLLECTION_PENDING", "READY_FOR_COLLECTION"];
