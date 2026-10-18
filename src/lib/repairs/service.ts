import type { RepairStatus } from "@prisma/client";
import { prisma } from "../db";
import { humanReference } from "../crypto";
import { UserError } from "../errors";
import { audit } from "../audit";
import { notifyAdmin, sendEmail, sendWhatsAppUpdate } from "../notify";
import { REPAIR_STATUS_LABELS, REPAIR_TRANSITIONS, REQUIRES_ACCEPTED_QUOTE } from "./status";
import { repairAmountDue, settleIfPaid } from "./payments";

export async function newRepairReference(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const ref = humanReference("REP", 6);
    if (!(await prisma.repairRequest.findUnique({ where: { reference: ref } }))) return ref;
  }
  throw new Error("Could not allocate repair reference");
}

async function notifyStatus(repairId: string, message?: string) {
  const r = await prisma.repairRequest.findUnique({ where: { id: repairId } });
  if (!r) return;
  const due = r.status === "PAYMENT_DUE" ? (await repairAmountDue(prisma, r.id)).due : undefined;
  await sendEmail("repairStatus", r.email, { name: r.name, reference: r.reference, statusLabel: REPAIR_STATUS_LABELS[r.status], message, amountDueCents: due }, r.userId);
  await sendWhatsAppUpdate(r.userId, r.phone, "repair_status_update", [r.name, r.reference, REPAIR_STATUS_LABELS[r.status]]);
}

/**
 * Moves a repair to a new status with a recorded history entry.
 * `override` lets the owner correct a status outside the normal flow (a reason is required),
 * but core rules always hold: no work without an accepted quote, no "Paid" without payment.
 */
export async function transitionRepair(opts: { repairId: string; to: RepairStatus; actorId: string; note?: string; override?: boolean; customerVisible?: boolean; declineReason?: string }) {
  const { repairId, to, actorId } = opts;
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RepairRequest" WHERE "id" = ${repairId} FOR UPDATE`;
    const repair = await tx.repairRequest.findUnique({ where: { id: repairId } });
    if (!repair) throw new UserError("Repair not found.", 404);
    if (repair.status === to) throw new UserError("The repair already has that status.");
    const normal = REPAIR_TRANSITIONS[repair.status].includes(to);
    if (!normal) {
      if (!opts.override) throw new UserError(`Cannot move from "${REPAIR_STATUS_LABELS[repair.status]}" to "${REPAIR_STATUS_LABELS[to]}" without an override.`);
      if (!opts.note?.trim()) throw new UserError("Please give a reason for overriding the normal status flow.");
    }
    if (REQUIRES_ACCEPTED_QUOTE.includes(to)) {
      const accepted = await tx.repairQuote.findFirst({ where: { repairId, status: "ACCEPTED" } });
      if (!accepted) throw new UserError("The customer must accept a quote before work can begin.");
    }
    if (to === "PAID") {
      const { due } = await repairAmountDue(tx, repairId);
      if (due > 0) throw new UserError("Record the customer's payment first; the repair is marked paid automatically once the quote total is covered.");
    }
    if (to === "DECLINED" && !(opts.declineReason ?? opts.note)?.trim()) throw new UserError("Please give the customer a reason for declining.");

    let finalStatus: RepairStatus = to;
    const data: Record<string, unknown> = { status: to };
    if (to === "DECLINED") data.declineReason = opts.declineReason ?? opts.note;
    if (to === "COMPLETED") data.completedAt = new Date();
    if (to === "COLLECTED") data.collectedAt = new Date();
    await tx.repairRequest.update({ where: { id: repairId }, data });
    await tx.repairStatusHistory.create({ data: { repairId, fromStatus: repair.status, toStatus: to, note: opts.note || (opts.override ? "Status corrected by owner" : null), actorId, isCustomerVisible: opts.customerVisible ?? true } });

    // Completing a job automatically raises the payment request (payment happens after the repair).
    if (to === "COMPLETED") {
      const { due } = await repairAmountDue(tx, repairId);
      if (due > 0) {
        await tx.repairRequest.update({ where: { id: repairId }, data: { status: "PAYMENT_DUE" } });
        await tx.repairStatusHistory.create({ data: { repairId, fromStatus: "COMPLETED", toStatus: "PAYMENT_DUE", note: "Repair completed — payment now due.", actorId } });
        finalStatus = "PAYMENT_DUE";
      } else if (await settleIfPaid(tx, repairId, actorId, "Repair completed; quote already fully paid.")) {
        finalStatus = "PAID";
      }
    }
    if (to === "COMPLETED" || to === "PAID") {
      // Start the warranty from completion if the accepted quote specified one.
      const quote = await tx.repairQuote.findFirst({ where: { repairId, status: "ACCEPTED" } });
      if (quote?.warrantyDays && to === "COMPLETED") {
        const startsAt = new Date();
        await tx.warrantyRecord.upsert({
          where: { repairId },
          create: { repairId, startsAt, endsAt: new Date(startsAt.getTime() + quote.warrantyDays * 86400000), terms: quote.warrantyTerms ?? "Limited repair warranty as per the accepted quote.", exclusions: quote.exclusions },
          update: {},
        });
      }
    }
    await audit({ actorId, action: opts.override ? "repair.status_override" : "repair.status_change", entityType: "RepairRequest", entityId: repairId, details: { from: repair.status, to: finalStatus, note: opts.note ?? null } }, tx);
    return finalStatus;
  });
  await notifyStatus(repairId, opts.customerVisible === false ? undefined : opts.note);
  return result;
}

export interface QuoteLineInput {
  type: "LABOUR" | "PART";
  description: string;
  quantity: number;
  unitPriceCents: number;
  costCents?: number | null;
}

/** Creates a new draft quote version (previous unsent/declined drafts are superseded). */
export async function createQuote(opts: { repairId: string; actorId: string; lines: QuoteLineInput[]; notes?: string; warrantyDays?: number | null; warrantyTerms?: string; exclusions?: string; validDays?: number }) {
  if (opts.lines.length === 0) throw new UserError("Add at least one labour or parts line.");
  for (const l of opts.lines) {
    if (!l.description.trim()) throw new UserError("Every quote line needs a description.");
    if (l.quantity < 1 || l.unitPriceCents < 0) throw new UserError("Quote line amounts must be positive.");
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RepairRequest" WHERE "id" = ${opts.repairId} FOR UPDATE`;
    const repair = await tx.repairRequest.findUnique({ where: { id: opts.repairId } });
    if (!repair) throw new UserError("Repair not found.", 404);
    const allowed: RepairStatus[] = ["ACCEPTED_FOR_ASSESSMENT", "AWAITING_ASSESSMENT", "QUOTE_PREPARED", "AWAITING_CUSTOMER_APPROVAL"];
    if (!allowed.includes(repair.status)) throw new UserError("A quote can only be prepared after the job has been accepted for assessment and before work begins.");
    const last = await tx.repairQuote.findFirst({ where: { repairId: repair.id }, orderBy: { version: "desc" } });
    await tx.repairQuote.updateMany({ where: { repairId: repair.id, status: { in: ["DRAFT", "SENT"] } }, data: { status: "SUPERSEDED" } });
    const lines = opts.lines.map((l) => ({ ...l, totalCents: l.unitPriceCents * l.quantity }));
    const labour = lines.filter((l) => l.type === "LABOUR").reduce((s, l) => s + l.totalCents, 0);
    const parts = lines.filter((l) => l.type === "PART").reduce((s, l) => s + l.totalCents, 0);
    const quote = await tx.repairQuote.create({
      data: {
        repairId: repair.id,
        version: (last?.version ?? 0) + 1,
        status: "DRAFT",
        labourCents: labour,
        partsCents: parts,
        totalCents: labour + parts,
        notes: opts.notes,
        warrantyDays: opts.warrantyDays ?? null,
        warrantyTerms: opts.warrantyTerms,
        exclusions: opts.exclusions,
        validUntil: opts.validDays ? new Date(Date.now() + opts.validDays * 86400000) : null,
        lineItems: { create: lines.map((l) => ({ type: l.type, description: l.description.trim(), quantity: l.quantity, unitPriceCents: l.unitPriceCents, totalCents: l.totalCents, costCents: l.costCents ?? null })) },
      },
    });
    if (repair.status !== "QUOTE_PREPARED") {
      await tx.repairRequest.update({ where: { id: repair.id }, data: { status: "QUOTE_PREPARED" } });
      await tx.repairStatusHistory.create({ data: { repairId: repair.id, fromStatus: repair.status, toStatus: "QUOTE_PREPARED", note: `Quote v${quote.version} prepared after inspection.`, actorId: opts.actorId } });
    }
    await audit({ actorId: opts.actorId, action: "repair.quote_created", entityType: "RepairQuote", entityId: quote.id, details: { total: quote.totalCents } }, tx);
    return quote;
  });
}

/** Owner approves the draft quote and sends it to the customer for explicit acceptance. */
export async function sendQuote(quoteId: string, actorId: string) {
  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.repairQuote.findUnique({ where: { id: quoteId }, include: { repair: true } });
    if (!q || q.status !== "DRAFT") throw new UserError("Only a draft quote can be sent.");
    await tx.repairQuote.update({ where: { id: q.id }, data: { status: "SENT", sentAt: new Date(), approvedByOwnerId: actorId } });
    await tx.repairRequest.update({ where: { id: q.repairId }, data: { status: "AWAITING_CUSTOMER_APPROVAL" } });
    await tx.repairStatusHistory.create({ data: { repairId: q.repairId, fromStatus: q.repair.status, toStatus: "AWAITING_CUSTOMER_APPROVAL", note: `Quote v${q.version} sent to customer.`, actorId } });
    await audit({ actorId, action: "repair.quote_sent", entityType: "RepairQuote", entityId: q.id }, tx);
    return q;
  });
  await sendEmail("repairQuote", quote.repair.email, { name: quote.repair.name, reference: quote.repair.reference, totalCents: quote.totalCents, labourCents: quote.labourCents, partsCents: quote.partsCents }, quote.repair.userId);
  await sendWhatsAppUpdate(quote.repair.userId, quote.repair.phone, "repair_quote_ready", [quote.repair.name, quote.repair.reference]);
}

/**
 * Customer (or owner recording a confirmed acceptance) responds to a sent quote.
 * `byUserId` must own the repair unless `recordedByStaffId` is given with a note.
 */
export async function respondToQuote(opts: { quoteId: string; accept: boolean; byUserId?: string; recordedByStaffId?: string; note?: string; ip?: string }) {
  const result = await prisma.$transaction(async (tx) => {
    const q = await tx.repairQuote.findUnique({ where: { id: opts.quoteId }, include: { repair: true } });
    if (!q) throw new UserError("Quote not found.", 404);
    if (opts.byUserId && q.repair.userId !== opts.byUserId) throw new UserError("Quote not found.", 404);
    if (!opts.byUserId && !opts.recordedByStaffId) throw new UserError("Not allowed.", 403);
    if (opts.recordedByStaffId && !opts.note?.trim()) throw new UserError("Please note how the customer confirmed their decision (e.g. WhatsApp message on a date).");
    if (q.status !== "SENT") throw new UserError("This quote is no longer awaiting a decision.");
    if (q.validUntil && q.validUntil < new Date()) throw new UserError("This quote has expired. Please contact us for an updated quote.");
    const now = new Date();
    await tx.repairQuote.update({
      where: { id: q.id },
      data: opts.accept ? { status: "ACCEPTED", customerAcceptedAt: now, acceptedIp: opts.ip ?? null } : { status: "DECLINED", customerDeclinedAt: now },
    });
    const to: RepairStatus = opts.accept ? "QUOTE_ACCEPTED" : "CANCELLED";
    await tx.repairRequest.update({ where: { id: q.repairId }, data: { status: to } });
    const who = opts.recordedByStaffId ? `Recorded by owner: ${opts.note}` : "Customer responded online.";
    await tx.repairStatusHistory.create({ data: { repairId: q.repairId, fromStatus: q.repair.status, toStatus: to, note: `Quote v${q.version} ${opts.accept ? "accepted" : "declined"}. ${who}`, actorId: opts.recordedByStaffId ?? opts.byUserId } });
    await audit({ actorId: opts.recordedByStaffId ?? opts.byUserId, action: opts.accept ? "repair.quote_accepted" : "repair.quote_declined", entityType: "RepairQuote", entityId: q.id, details: { recordedByStaff: Boolean(opts.recordedByStaffId), ip: opts.ip ?? null } }, tx);
    return q;
  });
  await sendEmail("repairStatus", result.repair.email, {
    name: result.repair.name,
    reference: result.repair.reference,
    statusLabel: opts.accept ? "Quote accepted" : "Quote declined",
    message: opts.accept ? "Thank you for accepting the quote. We will begin the repair and keep you updated." : "You declined the quote, so no work will be done. Please contact us to arrange collection of your instrument if it is with us.",
  }, result.repair.userId);
  await notifyAdmin(`Repair quote ${opts.accept ? "accepted" : "declined"}`, [["Repair", result.repair.reference], ["Customer", result.repair.name]], `/admin/repairs/${result.repairId}`);
}

export async function recordRepairPayment(opts: { repairId: string; actorId: string; amountCents: number; method: "CARD_IN_PERSON" | "EFT" | "CASH"; reference?: string; notes?: string }) {
  if (opts.amountCents <= 0) throw new UserError("Payment amount must be positive.");
  const settled = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RepairRequest" WHERE "id" = ${opts.repairId} FOR UPDATE`;
    const { due } = await repairAmountDue(tx, opts.repairId);
    if (due <= 0) throw new UserError("Nothing is currently due on this repair.");
    if (opts.amountCents > due) throw new UserError("That amount is more than the balance due.");
    await tx.repairPayment.create({ data: { repairId: opts.repairId, amountCents: opts.amountCents, method: opts.method, reference: opts.reference, notes: opts.notes, recordedById: opts.actorId } });
    await audit({ actorId: opts.actorId, action: "repair.payment_recorded", entityType: "RepairRequest", entityId: opts.repairId, details: { amount: opts.amountCents, method: opts.method } }, tx);
    return settleIfPaid(tx, opts.repairId, opts.actorId, `Payment of ${(opts.amountCents / 100).toFixed(2)} recorded (${opts.method}).`);
  });
  if (settled) await notifyStatus(opts.repairId, "Thank you — your payment has been received.");
  return settled;
}

export { notifyStatus as notifyRepairStatus };
