"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { randToCents } from "@/lib/money";
import { UserError, type ActionResult } from "@/lib/errors";
import { sendEmail, sendWhatsAppUpdate } from "@/lib/notify";
import { ADMIN_ORDER_TRANSITIONS, ORDER_STATUS_LABELS } from "@/lib/shop/order-status";
import { setOrderStatus } from "@/lib/shop/orders";
import { releaseOrderReservations } from "@/lib/shop/inventory";

export async function updateOrderStatusAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("orders:manage");
    const id = z.string().parse(form.get("id"));
    const to = z.string().parse(form.get("status")) as OrderStatus;
    const note = String(form.get("note") ?? "").trim().slice(0, 1000) || undefined;
    const restock = form.get("restock") === "on";
    const notify = form.get("notify") === "on";
    const order = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
      const o = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      if (!(ADMIN_ORDER_TRANSITIONS[o.status] ?? []).includes(to)) throw new UserError(`An order cannot move from "${ORDER_STATUS_LABELS[o.status]}" to "${ORDER_STATUS_LABELS[to]}".`);
      if (["AWAITING_PAYMENT", "PAYMENT_FAILED", "EXPIRED"].includes(o.status)) {
        await releaseOrderReservations(tx, o.id);
        await tx.payment.updateMany({ where: { orderId: o.id, status: "PENDING" }, data: { status: "CANCELLED" } });
      }
      if (to === "COLLECTED") await tx.order.update({ where: { id }, data: { collectedAt: new Date() } });
      if (to === "CANCELLED" || to === "REFUND_PENDING") {
        if (note) await tx.order.update({ where: { id }, data: { cancellationReason: note } });
        // Optionally put the items back on sale (e.g. cancelled before collection).
        if (restock && o.paidAt) {
          for (const item of o.items) {
            const p = await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
            if (p.status === "SOLD") await tx.product.update({ where: { id: p.id }, data: { status: "AVAILABLE", soldAt: null } });
          }
        }
      }
      await setOrderStatus(tx, o, to, note, user.id);
      await audit({ actorId: user.id, action: "order.status_changed", entityType: "Order", entityId: id, details: { from: o.status, to, restock } }, tx);
      return o;
    });
    if (notify) {
      await sendEmail("orderStatus", order.customerEmail, { name: order.customerName, orderNumber: order.orderNumber, statusLabel: ORDER_STATUS_LABELS[to], message: note }, order.userId);
      await sendWhatsAppUpdate(order.userId, order.customerPhone, "order_status_update", [order.customerName, order.orderNumber, ORDER_STATUS_LABELS[to]]);
    }
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: `Order moved to ${ORDER_STATUS_LABELS[to]}${notify ? " and the customer was notified" : ""}.` };
  });
}

export async function saveCollectionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("orders:manage");
    const id = z.string().parse(form.get("id"));
    const details = z.string().trim().max(2000).parse(form.get("collectionDetails") ?? "");
    const when = String(form.get("collectionScheduledFor") ?? "");
    const order = await prisma.order.update({ where: { id }, data: { collectionDetails: details || null, collectionScheduledFor: when ? new Date(`${when}:00+02:00`) : null } });
    await audit({ actorId: user.id, action: "order.collection_details_saved", entityType: "Order", entityId: id });
    if (form.get("notify") === "on" && details) {
      await sendEmail("orderStatus", order.customerEmail, { name: order.customerName, orderNumber: order.orderNumber, statusLabel: "Collection arranged", message: "Your private collection details are now available in your account under this order." }, order.userId);
    }
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: "Collection details saved. They are visible only to this customer in their account." };
  });
}

export async function createRefundAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("refunds:manage");
    const orderId = z.string().parse(form.get("orderId"));
    const amount = randToCents(z.string().min(1).parse(form.get("amount")));
    const reason = z.string().trim().min(3).max(1000).parse(form.get("reason"));
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: { where: { status: "COMPLETE" } }, refunds: { where: { status: { notIn: ["DECLINED", "FAILED"] } } } } });
    const paid = order.payments.reduce((s, p) => s + p.amountCents, 0);
    const already = order.refunds.reduce((s, r) => s + r.amountCents, 0);
    if (paid === 0) throw new UserError("There is no verified payment on this order to refund.");
    if (amount <= 0 || amount + already > paid) throw new UserError(`Refund amount must be between R0.01 and the refundable balance (${((paid - already) / 100).toFixed(2)}).`);
    const refund = await prisma.refund.create({ data: { orderId, paymentId: order.payments[0]?.id, amountCents: amount, reason, status: "APPROVED", decidedById: user.id, decidedAt: new Date(), decisionNote: "Approved by owner" } });
    if (order.status !== "REFUND_PENDING") await prisma.$transaction((tx) => setOrderStatus(tx, order, "REFUND_PENDING", `Refund of R${(amount / 100).toFixed(2)} approved: ${reason}`, user.id));
    await audit({ actorId: user.id, action: "refund.approved", entityType: "Refund", entityId: refund.id, details: { amount, orderId } });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "Refund decision recorded. Process the refund in your PayFast dashboard, then record the gateway reference below to mark it complete." };
  });
}

export async function updateRefundAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("refunds:manage");
    const id = z.string().parse(form.get("id"));
    const status = z.enum(["PROCESSING", "COMPLETED", "FAILED", "DECLINED"]).parse(form.get("status"));
    const gatewayReference = String(form.get("gatewayReference") ?? "").trim().slice(0, 120);
    const note = String(form.get("note") ?? "").trim().slice(0, 1000) || undefined;
    if (status === "COMPLETED" && (!gatewayReference || form.get("confirmed") !== "on")) throw new UserError("To mark a refund complete, enter the payment gateway's refund reference and confirm the gateway shows it as completed.");
    const refund = await prisma.$transaction(async (tx) => {
      const r = await tx.refund.update({
        where: { id },
        data: { status, gatewayReference: gatewayReference || undefined, gatewayConfirmedAt: status === "COMPLETED" ? new Date() : undefined, decisionNote: note, decidedById: user.id, decidedAt: new Date() },
        include: { order: { include: { payments: { where: { status: "COMPLETE" } }, refunds: true } } },
      });
      if (status === "COMPLETED") {
        const paid = r.order.payments.reduce((s, p) => s + p.amountCents, 0);
        const refunded = r.order.refunds.filter((x) => x.status === "COMPLETED").reduce((s, x) => s + x.amountCents, 0);
        if (refunded >= paid && r.order.status !== "REFUNDED") {
          await setOrderStatus(tx, r.order, "REFUNDED", `Refund confirmed by gateway (ref ${gatewayReference}).`, user.id);
          await tx.order.update({ where: { id: r.orderId }, data: { requiresAttention: false } });
        }
      }
      await audit({ actorId: user.id, action: `refund.${status.toLowerCase()}`, entityType: "Refund", entityId: id, details: { gatewayReference } }, tx);
      return r;
    });
    if (status === "COMPLETED") await sendEmail("orderStatus", refund.order.customerEmail, { name: refund.order.customerName, orderNumber: refund.order.orderNumber, statusLabel: "Refund processed", message: `A refund of R${(refund.amountCents / 100).toFixed(2)} has been processed to your card (reference ${gatewayReference}). Bank processing times vary.` }, refund.order.userId);
    revalidatePath(`/admin/orders/${refund.orderId}`);
    return { ok: true, message: "Refund updated." };
  });
}

export async function saveOrderNotesAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("orders:manage");
    const id = z.string().parse(form.get("id"));
    await prisma.order.update({ where: { id }, data: { adminNotes: String(form.get("adminNotes") ?? "").slice(0, 4000), requiresAttention: form.get("requiresAttention") === "on" } });
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: "Saved." };
  });
}
