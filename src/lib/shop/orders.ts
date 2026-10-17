import type { Order, OrderStatus, Payment, Prisma } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { humanReference } from "../crypto";
import { UserError } from "../errors";
import { effectivePrice } from "../money";
import { logger } from "../logger";
import { sendEmail, notifyAdmin } from "../notify";
import { availableQuantity, expireStaleReservations, lockProducts, releaseOrderReservations, RESERVATION_MINUTES } from "./inventory";
import { validateDiscount } from "./discounts";
import { ORDER_STATUS_LABELS } from "./order-status";

export const MIN_PAYMENT_CENTS = 500; // PayFast minimum transaction amount (R5.00)

export interface CheckoutInput {
  userId: string;
  discountCode?: string | null;
  customerNotes?: string | null;
  phone?: string | null;
  acceptTerms: boolean;
}

async function uniqueRef(prefix: string, exists: (ref: string) => Promise<boolean>): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const ref = humanReference(prefix, 7);
    if (!(await exists(ref))) return ref;
  }
  throw new Error("Could not allocate a unique reference");
}

/**
 * Turns the customer's cart into an order with time-limited stock reservations.
 * Prices are always read from the database (never from the browser), and product rows are
 * locked so two customers can never reserve the same unique item.
 */
export async function createOrderFromCart(input: CheckoutInput): Promise<{ order: Order; payment: Payment }> {
  if (!input.acceptTerms) throw new UserError("Please accept the terms and conditions and the collection-only policy.");
  await expireStaleReservations();

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.status !== "ACTIVE") throw new UserError("Your account cannot place orders at the moment.");
  if (!user.emailVerifiedAt) throw new UserError("Please verify your email address before checking out.");

  const orderNumber = await uniqueRef("G4U", async (r) => Boolean(await prisma.order.findUnique({ where: { orderNumber: r } })));
  const paymentRef = await uniqueRef("PAY", async (r) => Boolean(await prisma.payment.findUnique({ where: { reference: r } })));

  return prisma.$transaction(
    async (tx) => {
      // Abandon this customer's previous unpaid checkouts so their reservations do not block themselves.
      const previous = await tx.order.findMany({ where: { userId: user.id, status: "AWAITING_PAYMENT" }, select: { id: true } });
      for (const p of previous) {
        await releaseOrderReservations(tx, p.id);
        await tx.order.update({ where: { id: p.id }, data: { status: "CANCELLED", cancellationReason: "Replaced by a newer checkout" } });
        await tx.orderStatusHistory.create({ data: { orderId: p.id, fromStatus: "AWAITING_PAYMENT", toStatus: "CANCELLED", note: "Replaced by a newer checkout." } });
        await tx.payment.updateMany({ where: { orderId: p.id, status: "PENDING" }, data: { status: "CANCELLED" } });
      }

      const cart = await tx.cartItem.findMany({ where: { userId: user.id }, orderBy: { productId: "asc" } });
      if (cart.length === 0) throw new UserError("Your cart is empty.");
      await lockProducts(tx, cart.map((c) => c.productId));
      const products = await tx.product.findMany({ where: { id: { in: cart.map((c) => c.productId) } } });

      const lines: { productId: string; categoryId: string; title: string; sku: string; unitPriceCents: number; quantity: number; lineTotalCents: number }[] = [];
      for (const item of cart) {
        const p = products.find((x) => x.id === item.productId);
        if (!p || p.status !== "AVAILABLE" || !p.publishedAt) throw new UserError(`"${p?.title ?? "An item"}" is no longer available. Please remove it from your cart.`);
        const qty = p.quantity > 1 ? item.quantity : 1;
        const available = await availableQuantity(tx, p.id);
        if (available < qty) throw new UserError(`"${p.title}" is currently reserved in another customer's checkout or sold out. Please try again later.`);
        const unit = effectivePrice(p);
        lines.push({ productId: p.id, categoryId: p.categoryId, title: p.title, sku: p.sku, unitPriceCents: unit, quantity: qty, lineTotalCents: unit * qty });
      }

      const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
      let discountCents = 0;
      let discountCodeId: string | null = null;
      if (input.discountCode?.trim()) {
        const d = await validateDiscount(tx, input.discountCode, user.id, lines);
        discountCents = d.amount;
        discountCodeId = d.code.id;
      }
      const total = subtotal - discountCents;
      if (total < MIN_PAYMENT_CENTS) throw new UserError("The order total must be at least R5.00 for card payment.");

      const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: "AWAITING_PAYMENT",
          subtotalCents: subtotal,
          discountCents,
          totalCents: total,
          discountCodeId,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: input.phone?.trim() || user.phone,
          customerNotes: input.customerNotes?.trim().slice(0, 1000) || null,
          termsAcceptedAt: new Date(),
          reservationExpiresAt: expiresAt,
          items: { create: lines.map(({ categoryId: _c, ...l }) => l) },
          reservations: { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, expiresAt })) },
          statusHistory: { create: { toStatus: "AWAITING_PAYMENT", note: "Checkout started; stock reserved." } },
        },
      });
      const payment = await tx.payment.create({ data: { reference: paymentRef, purpose: "ORDER", orderId: order.id, amountCents: total } });
      return { order, payment };
    },
    { isolationLevel: "ReadCommitted", timeout: 15_000 },
  );
}

/** Customer returned from the gateway via "cancel": release their hold immediately. */
export async function cancelCheckout(orderId: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const order = await tx.order.findFirst({ where: { id: orderId, userId } });
    if (!order || order.status !== "AWAITING_PAYMENT") return;
    await releaseOrderReservations(tx, order.id);
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancellationReason: "Checkout cancelled by customer" } });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: "CANCELLED", note: "Customer cancelled at the payment page." } });
    await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  });
}

export async function setOrderStatus(tx: Tx, order: Pick<Order, "id" | "status">, to: OrderStatus, note?: string, actorId?: string) {
  await tx.order.update({ where: { id: order.id }, data: { status: to } });
  await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: to, note, actorId } });
}

/**
 * Applies a verified payment to an order: converts reservations into sold stock.
 * If stock could not be secured (e.g. the reservation expired and someone else bought the item),
 * the order is flagged for the owner and a refund request is opened — never silently dropped.
 */
export async function fulfilOrder(tx: Tx, orderId: string, payment: Payment): Promise<{ conflict: boolean }> {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, reservations: true } });
  const payable: OrderStatus[] = ["AWAITING_PAYMENT", "PAYMENT_PROCESSING", "PAYMENT_FAILED", "EXPIRED", "CANCELLED"];
  if (!payable.includes(order.status)) {
    // Already paid (duplicate) or in a later state — nothing to fulfil.
    return { conflict: false };
  }
  await lockProducts(tx, order.items.map((i) => i.productId));

  const unavailable: string[] = [];
  for (const item of order.items) {
    const held = order.reservations.find((r) => r.productId === item.productId && r.status === "ACTIVE");
    if (held) continue;
    const available = await availableQuantity(tx, item.productId, order.id);
    if (available < item.quantity) unavailable.push(item.title);
  }

  if (unavailable.length > 0) {
    await releaseOrderReservations(tx, order.id);
    await tx.order.update({
      where: { id: order.id },
      data: { paidAt: new Date(), requiresAttention: true, attentionReason: `Payment verified but stock could not be secured for: ${unavailable.join(", ")}. A refund is required.` },
    });
    await setOrderStatus(tx, order, "REFUND_PENDING", "Payment received after the item(s) were no longer available. Refund required.");
    await tx.refund.create({ data: { orderId: order.id, paymentId: payment.id, amountCents: payment.amountCents, reason: "Stock unavailable when late payment arrived", status: "APPROVED" } });
    return { conflict: true };
  }

  for (const item of order.items) {
    const updated = await tx.product.update({ where: { id: item.productId }, data: { quantity: { decrement: item.quantity } } });
    if (updated.quantity === 0) await tx.product.update({ where: { id: item.productId }, data: { status: "SOLD", soldAt: new Date() } });
  }
  await tx.stockReservation.updateMany({ where: { orderId: order.id, status: { in: ["ACTIVE", "EXPIRED", "RELEASED"] } }, data: { status: "CONVERTED" } });
  await tx.order.update({ where: { id: order.id }, data: { paidAt: new Date(), reservationExpiresAt: null } });
  await setOrderStatus(tx, order, "PAID", "Card payment verified with the payment gateway.");
  if (order.discountCodeId) {
    await tx.discountRedemption.create({ data: { discountCodeId: order.discountCodeId, orderId: order.id, userId: order.userId } });
    await tx.discountCode.update({ where: { id: order.discountCodeId }, data: { usedCount: { increment: 1 } } });
  }
  await tx.cartItem.deleteMany({ where: { userId: order.userId, productId: { in: order.items.map((i) => i.productId) } } });
  return { conflict: false };
}

export async function sendOrderConfirmation(orderId: string, conflict: boolean) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  try {
    if (conflict) {
      await sendEmail("orderStatus", order.customerEmail, {
        name: order.customerName,
        orderNumber: order.orderNumber,
        statusLabel: ORDER_STATUS_LABELS.REFUND_PENDING,
        message: "Your payment was received, but unfortunately the item was no longer available by the time the payment was confirmed. The owner has been alerted and will process a full refund to your card. We apologise for the inconvenience.",
      }, order.userId);
      await notifyAdmin("Late payment for unavailable stock — refund required", [["Order", order.orderNumber], ["Customer", order.customerEmail]], `/admin/orders/${order.id}`);
    } else {
      await sendEmail("orderConfirmation", order.customerEmail, { name: order.customerName, orderNumber: order.orderNumber, totalCents: order.totalCents, items: order.items.map((i) => i.title) }, order.userId);
      await notifyAdmin("New paid order", [["Order", order.orderNumber], ["Customer", `${order.customerName} <${order.customerEmail}>`], ["Items", order.items.map((i) => i.title).join(", ")]], `/admin/orders/${order.id}`);
    }
  } catch (err) {
    logger.error("Order confirmation notification failed", { err, orderId });
  }
}

export type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;
