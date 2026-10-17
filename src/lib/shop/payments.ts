import { prisma } from "../db";
import { logger } from "../logger";
import { amountsMatch, validateItn } from "../payfast";
import { fulfilOrder, sendOrderConfirmation, setOrderStatus } from "./orders";
import { releaseOrderReservations } from "./inventory";
import { applyRepairOnlinePayment, sendRepairPaidNotification } from "../repairs/payments";

export type ItnOutcome =
  | "processed"
  | "duplicate"
  | "invalid"
  | "unknown_reference"
  | "amount_mismatch"
  | "failed_recorded"
  | "ignored";

/**
 * Handles a PayFast ITN. Steps:
 * 1. Verify signature, merchant and confirm with PayFast's server (validateItn).
 * 2. Record the event under a unique key — duplicates are acknowledged but not re-applied.
 * 3. Lock the payment row and apply the result exactly once inside a transaction.
 * Browser redirects are never used as proof of payment.
 */
export async function handlePayfastItn(rawBody: string, fetchImpl?: typeof fetch): Promise<ItnOutcome> {
  const validation = await validateItn(rawBody, fetchImpl);
  const fields = Object.fromEntries(new URLSearchParams(rawBody));
  const reference = fields.m_payment_id ?? null;
  const pfPaymentId = fields.pf_payment_id ?? "none";
  const status = (fields.payment_status ?? "UNKNOWN").toUpperCase();
  const eventKey = `payfast:${pfPaymentId}:${status}`;

  if (!validation.ok) {
    logger.warn("Rejected PayFast ITN", { reason: validation.reason, reference });
    await prisma.paymentEvent
      .create({ data: { provider: "payfast", eventKey: `${eventKey}:rejected:${Date.now()}`, reference, payload: fields, signatureValid: validation.reason !== "bad_signature", outcome: validation.reason } })
      .catch(() => undefined);
    return "invalid";
  }

  // Record-first for duplicate protection (INSERT … ON CONFLICT DO NOTHING).
  await prisma.paymentEvent.createMany({ data: [{ provider: "payfast", eventKey, reference, payload: fields, signatureValid: true }], skipDuplicates: true });
  const event = await prisma.paymentEvent.findUniqueOrThrow({ where: { eventKey } });
  if (event.processedAt) return "duplicate";

  type Followup = { kind: "order"; orderId: string; conflict: boolean } | { kind: "repair"; repairId: string };
  const after: { notify: Followup | null } = { notify: null };

  const outcome = await prisma.$transaction(
    async (tx): Promise<ItnOutcome> => {
      if (!reference) return "unknown_reference";
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Payment" WHERE "reference" = ${reference} FOR UPDATE`;
      if (locked.length === 0) return "unknown_reference";
      const payment = await tx.payment.findUniqueOrThrow({ where: { reference } });

      if (status === "COMPLETE") {
        if (payment.status === "COMPLETE") return "duplicate";
        if (!amountsMatch(fields.amount_gross, payment.amountCents)) {
          if (payment.orderId) {
            await tx.order.update({ where: { id: payment.orderId }, data: { requiresAttention: true, attentionReason: `Gateway amount ${fields.amount_gross} did not match expected amount.` } });
          }
          logger.error("PayFast amount mismatch", { reference, gross: fields.amount_gross, expected: payment.amountCents });
          return "amount_mismatch";
        }
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETE",
            rawStatus: status,
            providerPaymentId: fields.pf_payment_id,
            feeCents: fields.amount_fee ? Math.round(Math.abs(Number(fields.amount_fee)) * 100) : null,
            netCents: fields.amount_net ? Math.round(Number(fields.amount_net) * 100) : null,
            verifiedAt: new Date(),
          },
        });
        if (payment.purpose === "ORDER" && payment.orderId) {
          const { conflict } = await fulfilOrder(tx, payment.orderId, updated);
          after.notify = { kind: "order", orderId: payment.orderId, conflict };
        } else if (payment.purpose === "REPAIR" && payment.repairRequestId) {
          await applyRepairOnlinePayment(tx, payment.repairRequestId, updated);
          after.notify = { kind: "repair", repairId: payment.repairRequestId };
        }
        return "processed";
      }

      if (status === "FAILED" || status === "CANCELLED") {
        if (payment.status === "COMPLETE") return "ignored";
        await tx.payment.update({ where: { id: payment.id }, data: { status: status === "FAILED" ? "FAILED" : "CANCELLED", rawStatus: status } });
        if (payment.orderId) {
          const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
          if (order.status === "AWAITING_PAYMENT" || order.status === "PAYMENT_PROCESSING") {
            await releaseOrderReservations(tx, order.id);
            await setOrderStatus(tx, order, "PAYMENT_FAILED", `Gateway reported payment ${status.toLowerCase()}. Reserved stock released.`);
          }
        }
        return "failed_recorded";
      }

      if (payment.orderId && status === "PENDING") {
        const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
        if (order.status === "AWAITING_PAYMENT") await setOrderStatus(tx, order, "PAYMENT_PROCESSING", "Gateway reports payment pending.");
      }
      return "ignored";
    },
    { timeout: 20_000 },
  );

  await prisma.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), outcome } });

  const n = after.notify;
  if (n?.kind === "order") await sendOrderConfirmation(n.orderId, n.conflict);
  if (n?.kind === "repair") await sendRepairPaidNotification(n.repairId);
  logger.info("PayFast ITN handled", { reference, status, outcome });
  return outcome;
}
