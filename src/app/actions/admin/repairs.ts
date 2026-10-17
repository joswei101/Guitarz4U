"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RepairStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { randToCents } from "@/lib/money";
import { UserError, type ActionResult } from "@/lib/errors";
import { createQuote, recordRepairPayment, respondToQuote, sendQuote, transitionRepair, notifyRepairStatus } from "@/lib/repairs/service";
import { REPAIR_STATUS_LABELS } from "@/lib/repairs/status";

export async function repairTransitionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("repairs:manage");
    const id = z.string().parse(form.get("id"));
    const to = z.string().parse(form.get("status")) as RepairStatus;
    if (!(to in REPAIR_STATUS_LABELS)) throw new UserError("Unknown status.");
    const note = String(form.get("note") ?? "").trim().slice(0, 2000) || undefined;
    const final = await transitionRepair({ repairId: id, to, actorId: user.id, note, override: form.get("override") === "on", customerVisible: form.get("internal") !== "on" });
    revalidatePath(`/admin/repairs/${id}`);
    return { ok: true, message: `Status updated to “${REPAIR_STATUS_LABELS[final]}”. The customer has been notified.` };
  });
}

export async function saveDropOffAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("repairs:manage");
    const id = z.string().parse(form.get("id"));
    const details = String(form.get("dropOffDetails") ?? "").trim().slice(0, 2000);
    const when = String(form.get("appointmentAt") ?? "");
    const appointmentAt = when ? new Date(`${when}:00+02:00`) : null;
    // Business is closed on Saturdays (South Africa is UTC+2 year-round).
    if (appointmentAt && new Date(appointmentAt.getTime() + 2 * 3600000).getUTCDay() === 6) throw new UserError("That appointment is on a Saturday — the business is closed on Saturdays.");
    await prisma.repairRequest.update({ where: { id }, data: { dropOffDetails: details || null, appointmentAt, internalNotes: String(form.get("internalNotes") ?? "").slice(0, 4000) || undefined } });
    await audit({ actorId: user.id, action: "repair.arrangements_saved", entityType: "RepairRequest", entityId: id });
    if (form.get("notify") === "on" && details) await notifyRepairStatus(id, "Your private drop-off/appointment details are available in your account.");
    revalidatePath(`/admin/repairs/${id}`);
    return { ok: true, message: "Saved. Drop-off details are only visible to this customer." };
  });
}

const lineSchema = z.object({ type: z.enum(["LABOUR", "PART"]), description: z.string().trim().min(1).max(300), quantity: z.coerce.number().int().min(1).max(100), unitPrice: z.string().min(1), cost: z.string().optional() });

export async function createQuoteAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("repairs:manage");
    const id = z.string().parse(form.get("id"));
    const raw = JSON.parse(String(form.get("lines") ?? "[]")) as unknown;
    const lines = z.array(lineSchema).min(1, "Add at least one line").parse(raw).map((l) => ({ type: l.type, description: l.description, quantity: l.quantity, unitPriceCents: randToCents(l.unitPrice), costCents: l.cost ? randToCents(l.cost) : null }));
    const warrantyDays = form.get("warrantyDays") ? z.coerce.number().int().min(0).max(3650).parse(form.get("warrantyDays")) : null;
    const quote = await createQuote({
      repairId: id,
      actorId: user.id,
      lines,
      notes: String(form.get("notes") ?? "").trim() || undefined,
      warrantyDays,
      warrantyTerms: String(form.get("warrantyTerms") ?? "").trim() || undefined,
      exclusions: String(form.get("exclusions") ?? "").trim() || undefined,
      validDays: form.get("validDays") ? Number(form.get("validDays")) : undefined,
    });
    revalidatePath(`/admin/repairs/${id}`);
    return { ok: true, message: `Draft quote v${quote.version} created. Review it, then approve & send it to the customer.` };
  });
}

export async function sendQuoteAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("repairs:manage");
    const quoteId = z.string().parse(form.get("quoteId"));
    if (form.get("inspected") !== "on") throw new UserError("Confirm that you have inspected the instrument and approve this quote.");
    await sendQuote(quoteId, user.id);
    revalidatePath("/admin/repairs");
    return { ok: true, message: "Quote approved and sent to the customer for their acceptance." };
  });
}

export async function recordQuoteDecisionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("repairs:manage");
    const quoteId = z.string().parse(form.get("quoteId"));
    const accept = form.get("decision") === "accept";
    await respondToQuote({ quoteId, accept, recordedByStaffId: user.id, note: String(form.get("note") ?? "") });
    revalidatePath("/admin/repairs");
    return { ok: true, message: `Customer ${accept ? "acceptance" : "decline"} recorded.` };
  });
}

export async function recordRepairPaymentAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("repairs:manage");
    const id = z.string().parse(form.get("id"));
    const method = z.enum(["CARD_IN_PERSON", "EFT", "CASH"]).parse(form.get("method"));
    const settled = await recordRepairPayment({ repairId: id, actorId: user.id, amountCents: randToCents(String(form.get("amount"))), method, reference: String(form.get("reference") ?? "") || undefined, notes: String(form.get("notes") ?? "") || undefined });
    revalidatePath(`/admin/repairs/${id}`);
    return { ok: true, message: settled ? "Payment recorded — repair is now fully paid." : "Payment recorded. A balance remains." };
  });
}
