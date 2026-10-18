import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createOrderFromCart } from "@/lib/shop/orders";
import { handlePayfastItn } from "@/lib/shop/payments";
import { buildPaymentForm, pfEncode, pfParamString, pfSignature, verifyItnSignature, parseItnBody } from "@/lib/payfast";
import { orderReceiptInput, renderReceiptPdf } from "@/lib/receipts";
import { GET as receiptGet } from "@/app/api/receipts/[orderId]/route";
import { addToCart, loginAs, makeProduct, makeUser } from "../helpers/factories";
import { invalidFetch, itnBody, validFetch } from "../helpers/payfast";
import { sentEmails } from "../helpers/setup";

async function pendingOrder(price = 1_000_000) {
  const buyer = await makeUser();
  const product = await makeProduct({ price });
  await addToCart(buyer.id, product.id);
  const { order, payment } = await createOrderFromCart({ userId: buyer.id, acceptTerms: true });
  return { buyer, product, order, payment };
}

const complete = (reference: string, amount: string, extra: Record<string, string> = {}) => itnBody({ m_payment_id: reference, amount_gross: amount, amount_net: amount, payment_status: "COMPLETE", ...extra });

describe("PayFast signatures", () => {
  it("encodes like PHP urlencode", () => {
    expect(pfEncode("Guitar & Amp (used)!")).toBe("Guitar+%26+Amp+%28used%29%21");
  });

  it("signs payment requests in documented field order, card-only", () => {
    const form = buildPaymentForm({ reference: "PAY-1", amount: "100.00", itemName: "Test", email: "a@b.co", returnUrl: "http://x/r", cancelUrl: "http://x/c", notifyUrl: "http://x/n" });
    const keys = form.fields.map(([k]) => k);
    expect(keys.indexOf("merchant_id")).toBe(0);
    expect(keys.at(-1)).toBe("signature");
    expect(form.fields.find(([k]) => k === "payment_method")?.[1]).toBe("cc");
    const sig = form.fields.at(-1)![1];
    expect(sig).toBe(pfSignature(pfParamString(form.fields.slice(0, -1), { skipEmpty: true }), "jt7NOE43FZPn"));
    expect(form.action).toBe("https://sandbox.payfast.co.za/eng/process");
  });

  it("verifies genuine ITN signatures and rejects tampered ones", () => {
    const body = itnBody({ m_payment_id: "PAY-1", amount_gross: "100.00" });
    expect(verifyItnSignature(parseItnBody(body), "jt7NOE43FZPn")).toBe(true);
    const tampered = body.replace("amount_gross=100.00", "amount_gross=1.00");
    expect(verifyItnSignature(parseItnBody(tampered), "jt7NOE43FZPn")).toBe(false);
    expect(verifyItnSignature(parseItnBody(body), "wrong-passphrase")).toBe(false);
  });
});

describe("payment notifications (ITN)", () => {
  it("marks the order paid, the guitar sold, and sends a confirmation — only after server verification", async () => {
    const { order, payment, product } = await pendingOrder();
    const outcome = await handlePayfastItn(complete(payment.reference, "10000.00"), validFetch);
    expect(outcome).toBe("processed");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("PAID");
    expect(after.paidAt).not.toBeNull();
    const p = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(p.status).toBe("SOLD");
    expect(p.quantity).toBe(0);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("COMPLETE");
    expect(sentEmails.some((e) => /Payment received/.test(e.subject))).toBe(true);
    expect(await prisma.cartItem.count({ where: { productId: product.id } })).toBe(0);
  });

  it("ignores duplicate notifications (idempotent)", async () => {
    const { order, payment, product } = await pendingOrder();
    const body = complete(payment.reference, "10000.00", { pf_payment_id: "777001" });
    expect(await handlePayfastItn(body, validFetch)).toBe("processed");
    expect(await handlePayfastItn(body, validFetch)).toBe("duplicate");
    const [a, b] = await Promise.all([handlePayfastItn(body, validFetch), handlePayfastItn(body, validFetch)]);
    expect([a, b]).toEqual(["duplicate", "duplicate"]);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).quantity).toBe(0);
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id, toStatus: "PAID" } })).toBe(1);
  });

  it("handles concurrent duplicate deliveries without double-processing", async () => {
    const { payment, order } = await pendingOrder();
    const body = complete(payment.reference, "10000.00", { pf_payment_id: "888002" });
    const results = await Promise.all([1, 2, 3].map(() => handlePayfastItn(body, validFetch)));
    expect(results.filter((r) => r === "processed")).toHaveLength(1);
    expect(await prisma.orderStatusHistory.count({ where: { orderId: order.id, toStatus: "PAID" } })).toBe(1);
  });

  it("rejects notifications with a bad signature or that PayFast does not confirm", async () => {
    const { order, payment } = await pendingOrder();
    const forged = complete(payment.reference, "10000.00").replace(/signature=[a-f0-9]+/, "signature=deadbeef");
    expect(await handlePayfastItn(forged, validFetch)).toBe("invalid");
    expect(await handlePayfastItn(complete(payment.reference, "10000.00"), invalidFetch)).toBe("invalid");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("AWAITING_PAYMENT");
  });

  it("refuses to mark an order paid when the amount doesn't match (price manipulation)", async () => {
    const { order, payment, product } = await pendingOrder();
    expect(await handlePayfastItn(complete(payment.reference, "1.00"), validFetch)).toBe("amount_mismatch");
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe("AWAITING_PAYMENT");
    expect(after.requiresAttention).toBe(true);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).status).toBe("AVAILABLE");
  });

  it("releases reserved stock when the payment fails", async () => {
    const { order, payment } = await pendingOrder();
    expect(await handlePayfastItn(itnBody({ m_payment_id: payment.reference, amount_gross: "10000.00", payment_status: "FAILED" }), validFetch)).toBe("failed_recorded");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAYMENT_FAILED");
    expect(await prisma.stockReservation.count({ where: { orderId: order.id, status: "ACTIVE" } })).toBe(0);
  });

  it("a late payment after the item was sold to someone else is flagged for a refund, not double-sold", async () => {
    const first = await pendingOrder();
    await prisma.stockReservation.updateMany({ where: { orderId: first.order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const rival = await makeUser();
    await addToCart(rival.id, first.product.id);
    const second = await createOrderFromCart({ userId: rival.id, acceptTerms: true });
    expect(await handlePayfastItn(complete(second.payment.reference, "10000.00"), validFetch)).toBe("processed");
    // Now the first (expired) customer's delayed payment arrives.
    expect(await handlePayfastItn(complete(first.payment.reference, "10000.00"), validFetch)).toBe("processed");
    const late = await prisma.order.findUniqueOrThrow({ where: { id: first.order.id }, include: { refunds: true } });
    expect(late.status).toBe("REFUND_PENDING");
    expect(late.requiresAttention).toBe(true);
    expect(late.refunds[0].status).toBe("APPROVED"); // decision recorded, NOT marked as refunded
    expect((await prisma.product.findUniqueOrThrow({ where: { id: first.product.id } })).quantity).toBe(0);
  });

  it("a delayed payment for an expired reservation still succeeds if the item is still available", async () => {
    const { order, payment, product } = await pendingOrder();
    await prisma.stockReservation.updateMany({ where: { orderId: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await handlePayfastItn(complete(payment.reference, "10000.00"), validFetch)).toBe("processed");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).status).toBe("SOLD");
  });

  it("ignores unknown references", async () => {
    expect(await handlePayfastItn(complete("PAY-NOPE", "10.00"), validFetch)).toBe("unknown_reference");
  });
});

describe("receipts", () => {
  it("generates a PDF receipt only for verified, paid orders and only for the owner", async () => {
    const { order, payment, buyer } = await pendingOrder();
    await loginAs(buyer.id);
    const before = await receiptGet(new Request("http://localhost/api/receipts/x"), { params: Promise.resolve({ orderId: order.id }) });
    expect(before.status).toBe(409);
    await handlePayfastItn(complete(payment.reference, "10000.00"), validFetch);
    const res = await receiptGet(new Request("http://localhost/api/receipts/x"), { params: Promise.resolve({ orderId: order.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
    const stranger = await makeUser();
    await loginAs(stranger.id);
    expect((await receiptGet(new Request("http://localhost/api/receipts/x"), { params: Promise.resolve({ orderId: order.id }) })).status).toBe(404);
    const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, payments: true } });
    const pdf = await renderReceiptPdf(orderReceiptInput(full));
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
