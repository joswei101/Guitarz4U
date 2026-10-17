import type { DiscountCode } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { UserError } from "../errors";

export interface DiscountLine {
  categoryId: string;
  lineTotalCents: number;
}

/** Statuses that count as a "use" of a discount code (paid, or a live checkout). */
const COUNTED_STATUSES = ["AWAITING_PAYMENT", "PAYMENT_PROCESSING", "PAID", "COLLECTION_PENDING", "READY_FOR_COLLECTION", "COLLECTED", "CANCELLATION_REQUESTED"] as const;

export function computeDiscount(code: Pick<DiscountCode, "type" | "value" | "categoryId">, lines: DiscountLine[]): number {
  const eligible = lines.filter((l) => !code.categoryId || l.categoryId === code.categoryId).reduce((s, l) => s + l.lineTotalCents, 0);
  if (eligible <= 0) return 0;
  const raw = code.type === "PERCENTAGE" ? Math.floor((eligible * code.value) / 100) : code.value;
  return Math.min(raw, eligible);
}

/** Validates a code for this user and cart; throws a friendly UserError if not usable. */
export async function validateDiscount(tx: Tx | typeof prisma, rawCode: string, userId: string, lines: DiscountLine[], excludeOrderId?: string) {
  const code = await tx.discountCode.findFirst({ where: { code: { equals: rawCode.trim(), mode: "insensitive" } } });
  const now = new Date();
  if (!code || !code.isActive) throw new UserError("That discount code is not valid.");
  if (code.validFrom && code.validFrom > now) throw new UserError("That discount code is not active yet.");
  if (code.validUntil && code.validUntil < now) throw new UserError("That discount code has expired.");
  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  if (code.minOrderCents && subtotal < code.minOrderCents) throw new UserError("Your order does not meet the minimum amount for this code.");
  const baseWhere = { discountCodeId: code.id, status: { in: [...COUNTED_STATUSES] }, ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}) };
  if (code.maxUses != null) {
    const used = await tx.order.count({ where: baseWhere });
    if (used >= code.maxUses) throw new UserError("That discount code has reached its usage limit.");
  }
  if (code.maxUsesPerUser != null) {
    const usedByUser = await tx.order.count({ where: { ...baseWhere, userId } });
    if (usedByUser >= code.maxUsesPerUser) throw new UserError("You have already used this discount code.");
  }
  const amount = computeDiscount(code, lines);
  if (amount <= 0) throw new UserError("This discount code does not apply to the items in your cart.");
  return { code, amount };
}
