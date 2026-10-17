import type { Payment } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { notifyAdmin, sendEmail } from "../notify";
import { REPAIR_STATUS_LABELS } from "./status";

/** Total the customer owes on a repair: accepted quote total minus payments already recorded. */
export async function repairAmountDue(tx: Tx | typeof prisma, repairId: string): Promise<{ quoteTotal: number; paid: number; due: number }> {
  const quote = await tx.repairQuote.findFirst({ where: { repairId, status: "ACCEPTED" }, orderBy: { version: "desc" } });
  const paidAgg = await tx.repairPayment.aggregate({ where: { repairId }, _sum: { amountCents: true } });
  const quoteTotal = quote?.totalCents ?? 0;
  const paid = paidAgg._sum.amountCents ?? 0;
  return { quoteTotal, paid, due: Math.max(0, quoteTotal - paid) };
}

/** Records a gateway-verified online repair payment (idempotent via unique paymentId). */
export async function applyRepairOnlinePayment(tx: Tx, repairId: string, payment: Payment): Promise<void> {
  const existing = await tx.repairPayment.findUnique({ where: { paymentId: payment.id } });
  if (existing) return;
  await tx.repairPayment.create({
    data: { repairId, amountCents: payment.amountCents, method: "CARD_ONLINE", reference: payment.providerPaymentId, paymentId: payment.id, notes: "Online card payment verified with PayFast" },
  });
  await settleIfPaid(tx, repairId, null, "Online card payment verified with the payment gateway.");
}

export async function settleIfPaid(tx: Tx, repairId: string, actorId: string | null, note: string): Promise<boolean> {
  const repair = await tx.repairRequest.findUniqueOrThrow({ where: { id: repairId } });
  const { due, quoteTotal } = await repairAmountDue(tx, repairId);
  if (quoteTotal > 0 && due === 0 && (repair.status === "PAYMENT_DUE" || repair.status === "COMPLETED")) {
    await tx.repairRequest.update({ where: { id: repairId }, data: { status: "PAID" } });
    await tx.repairStatusHistory.create({ data: { repairId, fromStatus: repair.status, toStatus: "PAID", note, actorId } });
    return true;
  }
  return false;
}

export async function sendRepairPaidNotification(repairId: string) {
  const r = await prisma.repairRequest.findUnique({ where: { id: repairId } });
  if (!r) return;
  await sendEmail("repairStatus", r.email, { name: r.name, reference: r.reference, statusLabel: REPAIR_STATUS_LABELS[r.status], message: "Thank you — your payment has been received." }, r.userId);
  await notifyAdmin("Repair payment received", [["Repair", r.reference], ["Customer", r.name]], `/admin/repairs/${r.id}`);
}
