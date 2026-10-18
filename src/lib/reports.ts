import { prisma } from "./db";
import { PAID_STATUSES } from "./shop/order-status";

export interface Range { from: Date; to: Date }

/**
 * Financial summary for a date range. Clearly separates:
 *  - payments actually received and refunds actually completed (gateway/recorded records),
 *  - recorded costs, and
 *  - ESTIMATED profit (depends on costs the owner has entered).
 */
export async function financialReport({ from, to }: Range) {
  const [payments, refunds, items, repairPayments, repairCosts, purchases] = await Promise.all([
    prisma.payment.findMany({ where: { status: "COMPLETE", verifiedAt: { gte: from, lte: to } }, select: { amountCents: true, feeCents: true, purpose: true } }),
    prisma.refund.findMany({ where: { status: "COMPLETED", gatewayConfirmedAt: { gte: from, lte: to } }, select: { amountCents: true } }),
    prisma.orderItem.findMany({
      where: { order: { paidAt: { gte: from, lte: to }, status: { in: PAID_STATUSES.filter((s) => s !== "REFUNDED") } } },
      select: { lineTotalCents: true, quantity: true, title: true, productId: true, product: { select: { acquisitionCostCents: true, refurbishmentCostCents: true, category: { select: { name: true } } } } },
    }),
    prisma.repairPayment.findMany({ where: { receivedAt: { gte: from, lte: to } }, select: { amountCents: true, method: true, repairId: true } }),
    prisma.repairQuoteLineItem.findMany({ where: { quote: { status: "ACCEPTED", repair: { completedAt: { gte: from, lte: to } } } }, select: { costCents: true, quantity: true } }),
    prisma.purchaseEnquiry.aggregate({ where: { purchasedAt: { gte: from, lte: to } }, _sum: { agreedPriceCents: true }, _count: true }),
  ]);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const shopReceived = sum(payments.filter((p) => p.purpose === "ORDER").map((p) => p.amountCents));
  const onlineRepairReceived = sum(payments.filter((p) => p.purpose === "REPAIR").map((p) => p.amountCents));
  const gatewayFees = sum(payments.map((p) => p.feeCents ?? 0));
  const refunded = sum(refunds.map((r) => r.amountCents));
  const goodsSales = sum(items.map((i) => i.lineTotalCents));
  const goodsCost = sum(items.map((i) => ((i.product.acquisitionCostCents ?? 0) + (i.product.refurbishmentCostCents ?? 0)) * i.quantity));
  const itemsMissingCost = items.filter((i) => i.product.acquisitionCostCents == null).length;
  const repairIncome = sum(repairPayments.map((p) => p.amountCents));
  const repairCost = sum(repairCosts.map((l) => (l.costCents ?? 0) * l.quantity));
  const byCategory = new Map<string, { count: number; sales: number }>();
  for (const i of items) {
    const k = i.product.category.name;
    const cur = byCategory.get(k) ?? { count: 0, sales: 0 };
    byCategory.set(k, { count: cur.count + i.quantity, sales: cur.sales + i.lineTotalCents });
  }
  return {
    received: { shop: shopReceived, repairsOnline: onlineRepairReceived, repairsAll: repairIncome, refunded, gatewayFees },
    goods: { sales: goodsSales, cost: goodsCost, estimatedProfit: goodsSales - goodsCost, itemsSold: items.length, itemsMissingCost },
    repairs: { income: repairIncome, recordedCost: repairCost, estimatedProfit: repairIncome - repairCost, jobsPaid: new Set(repairPayments.map((p) => p.repairId)).size },
    purchases: { count: purchases._count, spent: purchases._sum.agreedPriceCents ?? 0 },
    byCategory: [...byCategory.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sales - a.sales),
  };
}

export async function inventoryValuation() {
  const rows = await prisma.product.findMany({ where: { status: { in: ["AVAILABLE", "RESERVED", "DRAFT"] }, quantity: { gt: 0 } }, select: { status: true, quantity: true, priceCents: true, salePriceCents: true, acquisitionCostCents: true, refurbishmentCostCents: true } });
  let retail = 0;
  let cost = 0;
  let units = 0;
  for (const r of rows) {
    units += r.quantity;
    retail += (r.salePriceCents ?? r.priceCents) * r.quantity;
    cost += ((r.acquisitionCostCents ?? 0) + (r.refurbishmentCostCents ?? 0)) * r.quantity;
  }
  return { units, retail, cost, potentialMargin: retail - cost, items: rows.length };
}

export async function popularProducts(limit = 10) {
  return prisma.product.findMany({ orderBy: [{ viewCount: "desc" }], take: limit, select: { id: true, title: true, viewCount: true, status: true, _count: { select: { wishlistedBy: true, questions: true } } } });
}

export async function websiteActivity(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.pageViewDaily.groupBy({ by: ["path"], where: { day: { gte: since } }, _sum: { views: true }, orderBy: { _sum: { views: "desc" } }, take: 15 });
  const total = await prisma.pageViewDaily.aggregate({ where: { day: { gte: since } }, _sum: { views: true } });
  const signups = await prisma.user.count({ where: { createdAt: { gte: since }, role: "CUSTOMER" } });
  return { total: total._sum.views ?? 0, top: rows.map((r) => ({ path: r.path, views: r._sum.views ?? 0 })), signups };
}
