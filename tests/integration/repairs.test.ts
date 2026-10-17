import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createRepairRequest } from "@/lib/submissions";
import { createQuote, recordRepairPayment, respondToQuote, sendQuote, transitionRepair } from "@/lib/repairs/service";
import { repairAmountDue } from "@/lib/repairs/payments";
import { handlePayfastItn } from "@/lib/shop/payments";
import { respondToQuoteAction, startRepairPaymentAction } from "@/app/actions/account";
import { jpegFile, loginAs, makeUser } from "../helpers/factories";
import { itnBody, validFetch } from "../helpers/payfast";
import { sentEmails } from "../helpers/setup";

async function repairForm(email = "pat@example.com") {
  const f = new FormData();
  for (const [k, v] of Object.entries({ name: "Pat Player", email, phone: "0711234567", instrumentType: "Electric guitar", brand: "Gibson", model: "SG", problem: "Crackling volume pot and buzzing on the high E.", privacy: "on" })) f.set(k, v);
  f.append("services", "Pickup and electronics repairs");
  f.append("services", "Guitar setup and action adjustment");
  f.append("photos", await jpegFile());
  return f;
}

async function acceptedRepair() {
  const admin = await makeUser({ role: "ADMIN" });
  const customer = await makeUser({ email: "pat@example.com" });
  const r = await createRepairRequest(await repairForm(), { ...customer, role: "CUSTOMER" } as never);
  await transitionRepair({ repairId: r.id, to: "ACCEPTED_FOR_ASSESSMENT", actorId: admin.id });
  await transitionRepair({ repairId: r.id, to: "AWAITING_ASSESSMENT", actorId: admin.id });
  const q = await createQuote({ repairId: r.id, actorId: admin.id, lines: [{ type: "LABOUR", description: "Clean pots & setup", quantity: 1, unitPriceCents: 60_000, costCents: 0 }, { type: "PART", description: "CTS 500k pot", quantity: 1, unitPriceCents: 25_000, costCents: 15_000 }], warrantyDays: 90, warrantyTerms: "Covers the work listed", exclusions: "Strings" });
  await sendQuote(q.id, admin.id);
  return { admin, customer, r, q };
}

describe("repair requests & workflow", () => {
  it("creates a request awaiting owner review with no payment taken", async () => {
    const r = await createRepairRequest(await repairForm(), null);
    expect(r.status).toBe("AWAITING_REVIEW");
    expect(r.services).toHaveLength(2);
    expect(await prisma.payment.count()).toBe(0);
    const history = await prisma.repairStatusHistory.findMany({ where: { repairId: r.id } });
    expect(history.map((h) => h.toStatus)).toEqual(["SUBMITTED", "AWAITING_REVIEW"]);
    expect(sentEmails.some((m) => /Repair request received/.test(m.subject))).toBe(true);
  });

  it("rejects Saturday drop-off preferences and missing services", async () => {
    const f = await repairForm();
    f.set("preferredDate", "2026-10-24"); // a Saturday
    await expect(createRepairRequest(f, null)).rejects.toThrow(/Saturdays/);
    const g = await repairForm();
    g.delete("services");
    await expect(createRepairRequest(g, null)).rejects.toThrow();
  });

  it("the owner can decline with a reason", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const r = await createRepairRequest(await repairForm(), null);
    await expect(transitionRepair({ repairId: r.id, to: "DECLINED", actorId: admin.id })).rejects.toThrow(/reason/);
    await transitionRepair({ repairId: r.id, to: "DECLINED", actorId: admin.id, note: "Neck damage too severe to repair economically." });
    expect((await prisma.repairRequest.findUniqueOrThrow({ where: { id: r.id } })).declineReason).toMatch(/Neck damage/);
  });

  it("work cannot begin until the customer accepts the quote — even with an override", async () => {
    const { admin, r } = await acceptedRepair();
    await expect(transitionRepair({ repairId: r.id, to: "IN_PROGRESS", actorId: admin.id, override: true, note: "try" })).rejects.toThrow(/accept a quote/);
    expect((await prisma.repairRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("AWAITING_CUSTOMER_APPROVAL");
  });

  it("customer accepts the quote online, owner completes the job, payment becomes due, then paid and collected", async () => {
    const { admin, customer, r, q } = await acceptedRepair();
    expect(q.totalCents).toBe(85_000);
    expect(q.partsCents).toBe(25_000);
    await loginAs(customer.id);
    const noAgree = new FormData();
    noAgree.set("quoteId", q.id);
    noAgree.set("decision", "accept");
    expect((await respondToQuoteAction(null, noAgree)).ok).toBe(false);
    noAgree.set("agree", "on");
    expect((await respondToQuoteAction(null, noAgree)).ok).toBe(true);
    const accepted = await prisma.repairQuote.findUniqueOrThrow({ where: { id: q.id } });
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.customerAcceptedAt).not.toBeNull();

    await transitionRepair({ repairId: r.id, to: "IN_PROGRESS", actorId: admin.id });
    await transitionRepair({ repairId: r.id, to: "AWAITING_PARTS", actorId: admin.id, note: "Pot on order" });
    await transitionRepair({ repairId: r.id, to: "IN_PROGRESS", actorId: admin.id });
    await expect(transitionRepair({ repairId: r.id, to: "PAID", actorId: admin.id, override: true, note: "x" })).rejects.toThrow(/Record the customer's payment/);
    const status = await transitionRepair({ repairId: r.id, to: "COMPLETED", actorId: admin.id });
    expect(status).toBe("PAYMENT_DUE");
    expect((await repairAmountDue(prisma, r.id)).due).toBe(85_000);
    expect(await prisma.warrantyRecord.findUnique({ where: { repairId: r.id } })).toBeTruthy();

    await expect(recordRepairPayment({ repairId: r.id, actorId: admin.id, amountCents: 100_000, method: "EFT" })).rejects.toThrow(/more than the balance/);
    expect(await recordRepairPayment({ repairId: r.id, actorId: admin.id, amountCents: 35_000, method: "CASH" })).toBe(false);
    expect(await recordRepairPayment({ repairId: r.id, actorId: admin.id, amountCents: 50_000, method: "EFT", reference: "EFT123" })).toBe(true);
    expect((await prisma.repairRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("PAID");
    await transitionRepair({ repairId: r.id, to: "READY_FOR_COLLECTION", actorId: admin.id });
    await transitionRepair({ repairId: r.id, to: "COLLECTED", actorId: admin.id });
    const history = await prisma.repairStatusHistory.findMany({ where: { repairId: r.id }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => h.toStatus)).toEqual(expect.arrayContaining(["QUOTE_PREPARED", "AWAITING_CUSTOMER_APPROVAL", "QUOTE_ACCEPTED", "IN_PROGRESS", "AWAITING_PARTS", "COMPLETED", "PAYMENT_DUE", "PAID", "READY_FOR_COLLECTION", "COLLECTED"]));
    // Repair payments never touch shop orders.
    expect(await prisma.order.count()).toBe(0);
  });

  it("another customer cannot accept someone else's quote", async () => {
    const { q } = await acceptedRepair();
    const other = await makeUser();
    await expect(respondToQuote({ quoteId: q.id, accept: true, byUserId: other.id })).rejects.toThrow(/not found/);
  });

  it("owner can record an offline acceptance only with a note", async () => {
    const { admin, q } = await acceptedRepair();
    await expect(respondToQuote({ quoteId: q.id, accept: true, recordedByStaffId: admin.id })).rejects.toThrow(/how the customer confirmed/);
    await respondToQuote({ quoteId: q.id, accept: true, recordedByStaffId: admin.id, note: "WhatsApp 12 Oct" });
    expect((await prisma.repairQuote.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("ACCEPTED");
  });

  it("customer can pay a completed repair online; the verified ITN marks it paid (separate from shop checkout)", async () => {
    const { admin, customer, r, q } = await acceptedRepair();
    await respondToQuote({ quoteId: q.id, accept: true, byUserId: customer.id });
    await transitionRepair({ repairId: r.id, to: "IN_PROGRESS", actorId: admin.id });
    await transitionRepair({ repairId: r.id, to: "COMPLETED", actorId: admin.id });
    await loginAs(customer.id);
    const f = new FormData();
    f.set("repairId", r.id);
    await expect(startRepairPaymentAction(f)).rejects.toThrow(/NEXT_REDIRECT:\/account\/repairs\/pay\//);
    const payment = await prisma.payment.findFirstOrThrow({ where: { repairRequestId: r.id } });
    expect(payment.purpose).toBe("REPAIR");
    expect(payment.amountCents).toBe(85_000);
    const body = itnBody({ m_payment_id: payment.reference, amount_gross: "850.00", amount_net: "830.00" });
    expect(await handlePayfastItn(body, validFetch)).toBe("processed");
    expect(await handlePayfastItn(body, validFetch)).toBe("duplicate");
    expect((await prisma.repairRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("PAID");
    expect(await prisma.repairPayment.count({ where: { repairId: r.id } })).toBe(1);
  });
});
