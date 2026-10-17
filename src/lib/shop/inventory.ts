import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../db";

export const RESERVATION_MINUTES = 20;

/** Public visibility rule: customers only ever see these statuses. Sold/unavailable/draft stay private. */
export const PUBLIC_STATUSES = ["AVAILABLE", "RESERVED"] as const;

export const publicProductWhere: Prisma.ProductWhereInput = { status: { in: [...PUBLIC_STATUSES] }, publishedAt: { not: null } };

/** Locks product rows (in a consistent order to avoid deadlocks) for the rest of the transaction. */
export async function lockProducts(tx: Tx, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const sorted = [...new Set(ids)].sort();
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ANY(${sorted}::text[]) ORDER BY "id" FOR UPDATE`;
}

/** Units of a product that can be reserved right now (stock minus live checkout reservations). */
export async function availableQuantity(tx: Tx | typeof prisma, productId: string, excludeOrderId?: string): Promise<number> {
  const product = await tx.product.findUnique({ where: { id: productId }, select: { quantity: true, status: true } });
  if (!product || product.status !== "AVAILABLE") return 0;
  const reserved = await tx.stockReservation.aggregate({
    where: { productId, status: "ACTIVE", expiresAt: { gt: new Date() }, ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}) },
    _sum: { quantity: true },
  });
  return Math.max(0, product.quantity - (reserved._sum.quantity ?? 0));
}

/** Map of productId -> units currently held in other customers' live checkouts. */
export async function reservedCounts(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.stockReservation.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, status: "ACTIVE", expiresAt: { gt: new Date() } },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
}

/**
 * Marks timed-out reservations as EXPIRED and moves their unpaid orders to EXPIRED.
 * Safe to call often (checkout, cron). A late but verified payment is still handled by
 * fulfilOrder(), which re-checks stock.
 */
export async function expireStaleReservations(now = new Date()): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const stale = await tx.stockReservation.findMany({
      where: { status: "ACTIVE", expiresAt: { lte: now } },
      select: { id: true, orderId: true },
    });
    if (stale.length === 0) return 0;
    await tx.stockReservation.updateMany({ where: { id: { in: stale.map((s) => s.id) }, status: "ACTIVE" }, data: { status: "EXPIRED" } });
    const orderIds = [...new Set(stale.map((s) => s.orderId))];
    const orders = await tx.order.findMany({ where: { id: { in: orderIds }, status: { in: ["AWAITING_PAYMENT", "PAYMENT_PROCESSING"] } }, select: { id: true, status: true } });
    for (const o of orders) {
      await tx.order.update({ where: { id: o.id }, data: { status: "EXPIRED" } });
      await tx.orderStatusHistory.create({ data: { orderId: o.id, fromStatus: o.status, toStatus: "EXPIRED", note: "Checkout reservation expired before payment was confirmed." } });
    }
    return stale.length;
  });
}

/** Releases an order's live reservations (payment failed or customer cancelled checkout). */
export async function releaseOrderReservations(tx: Tx, orderId: string): Promise<void> {
  await tx.stockReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "RELEASED" } });
}
