import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createOrderFromCart, cancelCheckout } from "@/lib/shop/orders";
import { availableQuantity, expireStaleReservations } from "@/lib/shop/inventory";
import { computeDiscount } from "@/lib/shop/discounts";
import { placeOrderAction } from "@/app/actions/checkout";
import { addToCart, loginAs, makeCategory, makeProduct, makeUser } from "../helpers/factories";

const checkout = (userId: string, extra: Partial<Parameters<typeof createOrderFromCart>[0]> = {}) => createOrderFromCart({ userId, acceptTerms: true, ...extra });

describe("checkout & stock reservation", () => {
  it("creates an order using database prices and reserves the item", async () => {
    const buyer = await makeUser();
    const p = await makeProduct({ price: 1_500_000, sale: 1_200_000 });
    await addToCart(buyer.id, p.id);
    const { order, payment } = await checkout(buyer.id);
    expect(order.status).toBe("AWAITING_PAYMENT");
    expect(order.totalCents).toBe(1_200_000);
    expect(payment.amountCents).toBe(1_200_000);
    expect(await availableQuantity(prisma, p.id)).toBe(0);
    const res = await prisma.stockReservation.findFirstOrThrow({ where: { orderId: order.id } });
    expect(res.status).toBe("ACTIVE");
    expect(res.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("requires terms acceptance, a verified email and a non-empty cart", async () => {
    const u = await makeUser();
    await expect(checkout(u.id)).rejects.toThrow(/cart is empty/);
    await expect(createOrderFromCart({ userId: u.id, acceptTerms: false })).rejects.toThrow(/terms/);
    const unverified = await makeUser({ verified: false });
    const p = await makeProduct();
    await addToCart(unverified.id, p.id);
    await expect(checkout(unverified.id)).rejects.toThrow(/verify your email/);
  });

  it("never sells the same unique guitar twice, even when two customers check out at the same moment", async () => {
    const p = await makeProduct();
    const buyers = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser()]);
    for (const b of buyers) await addToCart(b.id, p.id);
    const results = await Promise.allSettled(buyers.map((b) => checkout(b.id)));
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => /reserved|no longer available/.test(String((r as PromiseRejectedResult).reason)))).toBe(true);
    expect(await prisma.stockReservation.count({ where: { productId: p.id, status: "ACTIVE" } })).toBe(1);
  });

  it("allows multiple units of a parts item up to stock, but not beyond", async () => {
    const parts = await makeCategory("parts-x", true);
    const p = await makeProduct({ categoryId: parts.id, quantity: 3, price: 50_000 });
    const a = await makeUser();
    const b = await makeUser();
    await addToCart(a.id, p.id, 2);
    await addToCart(b.id, p.id, 2);
    const first = await checkout(a.id);
    expect(first.order.totalCents).toBe(100_000);
    await expect(checkout(b.id)).rejects.toThrow(/reserved|sold out/);
  });

  it("releases stock when the reservation expires", async () => {
    const p = await makeProduct();
    const a = await makeUser();
    const b = await makeUser();
    await addToCart(a.id, p.id);
    await addToCart(b.id, p.id);
    const { order } = await checkout(a.id);
    await prisma.stockReservation.updateMany({ where: { orderId: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await expireStaleReservations()).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
    const second = await checkout(b.id);
    expect(second.order.status).toBe("AWAITING_PAYMENT");
  });

  it("releases stock immediately when the customer cancels at the gateway", async () => {
    const p = await makeProduct();
    const a = await makeUser();
    await addToCart(a.id, p.id);
    const { order } = await checkout(a.id);
    await cancelCheckout(order.id, a.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect(await availableQuantity(prisma, p.id)).toBe(1);
  });

  it("starting a new checkout abandons the customer's previous unpaid checkout", async () => {
    const p = await makeProduct();
    const a = await makeUser();
    await addToCart(a.id, p.id);
    const first = await checkout(a.id);
    const second = await checkout(a.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: first.order.id } })).status).toBe("CANCELLED");
    expect(second.order.status).toBe("AWAITING_PAYMENT");
  });

  it("refuses unavailable, draft and sold items", async () => {
    const a = await makeUser();
    for (const status of ["DRAFT", "SOLD", "RESERVED", "UNAVAILABLE"] as const) {
      const p = await makeProduct({ status });
      await prisma.cartItem.deleteMany({ where: { userId: a.id } });
      await addToCart(a.id, p.id);
      await expect(checkout(a.id)).rejects.toThrow(/no longer available/);
    }
  });

  it("placeOrderAction redirects to the payment page for a signed-in, verified customer", async () => {
    const a = await makeUser();
    const p = await makeProduct();
    await addToCart(a.id, p.id);
    await loginAs(a.id);
    const form = new FormData();
    form.set("acceptTerms", "on");
    await expect(placeOrderAction(null, form)).rejects.toThrow(/NEXT_REDIRECT:\/checkout\/pay\//);
  });
});

describe("discount codes", () => {
  it("computes percentage and fixed discounts, limited to eligible categories", () => {
    const lines = [{ categoryId: "a", lineTotalCents: 100_000 }, { categoryId: "b", lineTotalCents: 50_000 }];
    expect(computeDiscount({ type: "PERCENTAGE", value: 10, categoryId: null }, lines)).toBe(15_000);
    expect(computeDiscount({ type: "PERCENTAGE", value: 10, categoryId: "b" }, lines)).toBe(5_000);
    expect(computeDiscount({ type: "FIXED", value: 999_999, categoryId: "b" }, lines)).toBe(50_000);
  });

  it("applies valid codes and enforces dates and per-customer limits", async () => {
    const p = await makeProduct({ price: 1_000_000 });
    const a = await makeUser();
    await prisma.discountCode.create({ data: { code: "ROCK10", type: "PERCENTAGE", value: 10, maxUsesPerUser: 1 } });
    await prisma.discountCode.create({ data: { code: "OLD", type: "FIXED", value: 5000, validUntil: new Date(Date.now() - 86400000) } });
    await addToCart(a.id, p.id);
    await expect(checkout(a.id, { discountCode: "old" })).rejects.toThrow(/expired/);
    const { order } = await checkout(a.id, { discountCode: "rock10" });
    expect(order.discountCents).toBe(100_000);
    expect(order.totalCents).toBe(900_000);
    // A second live checkout by the same customer cancels the first, so the code is usable again…
    const again = await checkout(a.id, { discountCode: "ROCK10" });
    expect(again.order.discountCents).toBe(100_000);
    // …but once an order with the code is paid, it can't be reused.
    await prisma.order.update({ where: { id: again.order.id }, data: { status: "PAID" } });
    const p2 = await makeProduct();
    await prisma.cartItem.deleteMany({ where: { userId: a.id } });
    await addToCart(a.id, p2.id);
    await expect(checkout(a.id, { discountCode: "ROCK10" })).rejects.toThrow(/already used/);
  });
});
