import type { RepairStatus } from "@prisma/client";

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  SUBMITTED: "Request submitted",
  AWAITING_REVIEW: "Awaiting owner review",
  ACCEPTED_FOR_ASSESSMENT: "Accepted for assessment",
  AWAITING_ASSESSMENT: "Awaiting assessment",
  QUOTE_PREPARED: "Quote prepared",
  AWAITING_CUSTOMER_APPROVAL: "Awaiting your approval",
  QUOTE_ACCEPTED: "Quote accepted",
  IN_PROGRESS: "Repair in progress",
  AWAITING_PARTS: "Awaiting parts",
  COMPLETED: "Repair completed",
  PAYMENT_DUE: "Payment due",
  PAID: "Paid",
  READY_FOR_COLLECTION: "Ready for collection",
  COLLECTED: "Collected",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export const REPAIR_FLOW: RepairStatus[] = [
  "SUBMITTED",
  "AWAITING_REVIEW",
  "ACCEPTED_FOR_ASSESSMENT",
  "AWAITING_ASSESSMENT",
  "QUOTE_PREPARED",
  "AWAITING_CUSTOMER_APPROVAL",
  "QUOTE_ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "PAYMENT_DUE",
  "PAID",
  "READY_FOR_COLLECTION",
  "COLLECTED",
];

/** Normal next steps staff can take. Quote sending/acceptance and payment have dedicated actions. */
export const REPAIR_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  SUBMITTED: ["AWAITING_REVIEW", "ACCEPTED_FOR_ASSESSMENT", "DECLINED"],
  AWAITING_REVIEW: ["ACCEPTED_FOR_ASSESSMENT", "DECLINED"],
  ACCEPTED_FOR_ASSESSMENT: ["AWAITING_ASSESSMENT", "DECLINED", "CANCELLED"],
  AWAITING_ASSESSMENT: ["DECLINED", "CANCELLED"],
  QUOTE_PREPARED: ["CANCELLED"],
  AWAITING_CUSTOMER_APPROVAL: ["CANCELLED"],
  QUOTE_ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_PARTS", "COMPLETED"],
  AWAITING_PARTS: ["IN_PROGRESS"],
  COMPLETED: ["PAYMENT_DUE"],
  PAYMENT_DUE: [],
  PAID: ["READY_FOR_COLLECTION"],
  READY_FOR_COLLECTION: ["COLLECTED"],
  COLLECTED: [],
  DECLINED: [],
  CANCELLED: [],
};

/** Statuses that are only valid once the customer has accepted a quote. */
export const REQUIRES_ACCEPTED_QUOTE: RepairStatus[] = ["QUOTE_ACCEPTED", "IN_PROGRESS", "AWAITING_PARTS", "COMPLETED", "PAYMENT_DUE", "PAID", "READY_FOR_COLLECTION", "COLLECTED"];

export const ACTIVE_REPAIR_STATUSES: RepairStatus[] = REPAIR_FLOW.filter((s) => s !== "COLLECTED");

export const REPAIR_SERVICES = [
  "String replacement",
  "Guitar setup and action adjustment",
  "Pickup and electronics repairs",
  "Wiring and soldering",
  "Jack socket and switch repairs",
  "Hardware replacement",
  "Intonation and tuning issues",
  "Fault diagnosis",
  "Damaged and broken guitar repairs",
  "Fretwork and fret replacement",
  "Nut and saddle replacement",
  "Pickup installation and upgrades",
  "Cleaning and maintenance",
  "Custom modifications",
  "Amplifier repair",
  "Not sure — please assess",
] as const;

export const REPAIR_INSTRUMENTS = [
  "Electric guitar",
  "Bass guitar",
  "Acoustic guitar",
  "Classical guitar",
  "Electro-acoustic guitar",
  "Guitar amplifier",
  "Other string instrument (subject to approval)",
] as const;
