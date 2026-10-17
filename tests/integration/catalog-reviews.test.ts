import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { parseFilters, searchProducts } from "@/lib/catalog";
import { submitReviewAction, requestOrderCancellationAction, requestAccountDeletionAction } from "@/app/actions/account";
import { askQuestion, addToCart as addToCartAction } from "@/app/actions/shop";
import { moderateReviewAction, answerQuestionAction } from "@/app/actions/admin/misc";
import { updateRefundAction, createRefundAction, updateOrderStatusAction } from "@/app/actions/admin/orders";
import { resolveDeletionAction } from "@/app/actions/admin/customers";
import { createOrderFromCart } from "@/lib/shop/orders";
import { handlePayfastItn } from "@/lib/shop/payments";
import { addToCart, loginAs, logout, makeCategory, makeProduct, makeUser } from "../helpers/factories";
import { itnBody, validFetch } from "../helpers/payfast";

function form(obj: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

async function paidOrder() {
  const buyer = await makeUser();
  const product = await makeProduct({ price: 500_000 });
  await addToCart(buyer.id, product.id);
  const { order, payment } = await createOrderFromCart({ userId: buyer.id, acceptTerms: true });
  await handlePayfastItn(itnBody({ m_payment_id: payment.reference, amount_gross: "5000.00", pf_payment_id: "PF123" }), validFetch);
  return { buyer, product, order, payment };
}

describe("product browsing & filtering", () => {
  it("shows only published available/reserved items and supports search, category, condition, price and sort", async () => {
    const electric = await makeCategory("electric-guitars");
    const bass = await makeCategory("bass-guitars");
    await makeProduct({ categoryId: electric.id, title: "Fender Telecaster", brand: "Fender", price: 900_000, condition: "EXCELLENT" });
    await makeProduct({ categoryId: electric.id, title: "Gibson SG", brand: "Gibson", price: 1_800_000, sale: 1_500_000 });
    await makeProduct({ categoryId: bass.id, title: "Ibanez SR300", brand: "Ibanez", price: 600_000, leftHanded: true });
    await makeProduct({ categoryId: electric.id, title: "Sold Strat", status: "SOLD" });
    await makeProduct({ categoryId: electric.id, title: "Draft Jazzmaster", status: "DRAFT" });
    await makeProduct({ categoryId: electric.id, title: "Hidden Mustang", status: "UNAVAILABLE" });

    expect((await searchProducts({})).total).toBe(3);
    expect((await searchProducts({ category: "electric-guitars" })).items.map((p) => p.title).sort()).toEqual(["Fender Telecaster", "Gibson SG"]);
    expect((await searchProducts({ q: "gibson" })).items.map((p) => p.title)).toEqual(["Gibson SG"]);
    expect((await searchProducts({ condition: "EXCELLENT" })).total).toBe(1);
    expect((await searchProducts({ category: "left-handed" })).items.map((p) => p.title)).toEqual(["Ibanez SR300"]);
    // Price filter uses the effective (sale) price.
    expect((await searchProducts({ min: 1_000, max: 15_000 })).items.map((p) => p.title).sort()).toEqual(["Fender Telecaster", "Gibson SG", "Ibanez SR300"]);
    expect((await searchProducts({ max: 8_000 })).items.map((p) => p.title)).toEqual(["Ibanez SR300"]);
    expect((await searchProducts({ sort: "price-asc" })).items.map((p) => p.title)).toEqual(["Ibanez SR300", "Fender Telecaster", "Gibson SG"]);
  });

  it("parses untrusted query parameters safely", () => {
    const f = parseFilters({ q: "x".repeat(500), condition: "BOGUS", sort: "DROP TABLE", min: "-5", page: "abc" });
    expect(f.q).toHaveLength(100);
    expect(f.condition).toBeUndefined();
    expect(f.sort).toBe("newest");
    expect(f.min).toBeUndefined();
    expect(f.page).toBe(1);
  });

  it("guests can add to cart (cookie) but prices are never taken from the client", async () => {
    const p = await makeProduct({ price: 700_000 });
    const res = await addToCartAction(null, form({ productId: p.id, price: "1" }));
    expect(res.ok).toBe(true);
    const sold = await makeProduct({ status: "SOLD" });
    expect((await addToCartAction(null, form({ productId: sold.id }))).ok).toBe(false);
  });
});

describe("reviews & questions moderation", () => {
  it("reviews require a verified account and a real purchase, stay unpublished until approved, and can't be duplicated", async () => {
    const { buyer, product } = await paidOrder();
    const stranger = await makeUser();
    await loginAs(stranger.id);
    expect((await submitReviewAction(null, form({ subject: "PRODUCT", productId: product.id, rating: "5", body: "Fantastic guitar, plays like a dream!", displayName: "Fake" }))).ok).toBe(false);

    await loginAs(buyer.id);
    const res = await submitReviewAction(null, form({ subject: "PRODUCT", productId: product.id, rating: "5", body: "Fantastic guitar, plays like a dream!", displayName: "Real B." }));
    expect(res.ok).toBe(true);
    const review = await prisma.review.findFirstOrThrow({ where: { userId: buyer.id } });
    expect(review.status).toBe("PENDING");
    expect(review.isVerifiedPurchase).toBe(true);
    expect(await prisma.review.count({ where: { status: "APPROVED" } })).toBe(0);
    expect((await submitReviewAction(null, form({ subject: "PRODUCT", productId: product.id, rating: "1", body: "Changing my mind about everything here", displayName: "Real B." }))).ok).toBe(false);
    expect((await submitReviewAction(null, form({ subject: "GENERAL", rating: "9", body: "Out of range rating should fail validation", displayName: "Real B." }))).ok).toBe(false);

    // Customers cannot approve their own review.
    await expect(moderateReviewAction(form({ id: review.id, status: "APPROVED" }))).rejects.toThrow(/permission/);
    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    await moderateReviewAction(form({ id: review.id, status: "APPROVED" }));
    expect((await prisma.review.findUniqueOrThrow({ where: { id: review.id } })).status).toBe("APPROVED");
  });

  it("unverified users can't review or ask questions", async () => {
    const u = await makeUser({ verified: false });
    await loginAs(u.id);
    expect((await submitReviewAction(null, form({ subject: "GENERAL", rating: "5", body: "Great shop, very helpful owner here", displayName: "U" }))).ok).toBe(false);
    const p = await makeProduct();
    expect((await askQuestion(null, form({ productId: p.id, question: "Is the neck straight?" }))).ok).toBe(false);
  });

  it("questions are held for moderation; content-manager answers need owner approval", async () => {
    const p = await makeProduct();
    const u = await makeUser();
    await loginAs(u.id);
    expect((await askQuestion(null, form({ productId: p.id, question: "Has the neck ever been repaired?" }))).ok).toBe(true);
    const q = await prisma.productQuestion.findFirstOrThrow();
    expect(q.status).toBe("PENDING");
    const cm = await makeUser({ role: "CONTENT_MANAGER" });
    await loginAs(cm.id);
    await answerQuestionAction(null, form({ id: q.id, answer: "No, never repaired.", publish: "on" }));
    expect((await prisma.productQuestion.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("PENDING");
    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    await answerQuestionAction(null, form({ id: q.id, answer: "No, never repaired.", publish: "on" }));
    expect((await prisma.productQuestion.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("APPROVED");
  });
});

describe("cancellations & refunds", () => {
  it("customer requests cancellation; owner records refund; completion requires a gateway reference", async () => {
    const { buyer, order } = await paidOrder();
    await loginAs(buyer.id);
    expect((await requestOrderCancellationAction(null, form({ orderId: order.id, reason: "Changed my mind, sorry" }))).ok).toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLATION_REQUESTED");

    // Customers can't record refunds.
    expect((await createRefundAction(null, form({ orderId: order.id, amount: "5000", reason: "x" }))).ok).toBe(false);

    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    expect((await createRefundAction(null, form({ orderId: order.id, amount: "6000.00", reason: "too much" }))).ok).toBe(false);
    expect((await createRefundAction(null, form({ orderId: order.id, amount: "5000.00", reason: "Approved cancellation" }))).ok).toBe(true);
    const refund = await prisma.refund.findFirstOrThrow({ where: { orderId: order.id } });
    expect(refund.status).toBe("APPROVED");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUND_PENDING");

    const noRef = await updateRefundAction(null, form({ id: refund.id, status: "COMPLETED", confirmed: "on" }));
    expect(noRef.ok).toBe(false);
    await expect(prisma.refund.update({ where: { id: refund.id }, data: { status: "COMPLETED" } })).rejects.toThrow(); // DB constraint too
    expect((await updateRefundAction(null, form({ id: refund.id, status: "COMPLETED", gatewayReference: "PF-REFUND-1", confirmed: "on" }))).ok).toBe(true);
    const done = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(done.status).toBe("REFUNDED");
  });

  it("staff cannot mark an order as paid by hand", async () => {
    const buyer = await makeUser();
    const p = await makeProduct();
    await addToCart(buyer.id, p.id);
    const { order } = await createOrderFromCart({ userId: buyer.id, acceptTerms: true });
    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    const res = await updateOrderStatusAction(null, form({ id: order.id, status: "PAID" }));
    expect(res.ok).toBe(false);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("AWAITING_PAYMENT");
  });

  it("owner moves a paid order through collection states", async () => {
    const { order } = await paidOrder();
    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    for (const s of ["COLLECTION_PENDING", "READY_FOR_COLLECTION", "COLLECTED"]) expect((await updateOrderStatusAction(null, form({ id: order.id, status: s, notify: "on" }))).ok).toBe(true);
    const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.status).toBe("COLLECTED");
    expect(o.collectedAt).not.toBeNull();
  });
});

describe("account deletion requests", () => {
  it("customer requests deletion; owner anonymises the profile while retaining order records", async () => {
    const { buyer, order } = await paidOrder();
    await prisma.order.update({ where: { id: order.id }, data: { status: "COLLECTED" } });
    await prisma.wishlistItem.create({ data: { userId: buyer.id, productId: (await makeProduct()).id } });
    await loginAs(buyer.id);
    expect((await requestAccountDeletionAction(null, form({ confirm: "nope" }))).ok).toBe(false);
    expect((await requestAccountDeletionAction(null, form({ confirm: "DELETE", reason: "No longer needed" }))).ok).toBe(true);
    const req = await prisma.accountDeletionRequest.findFirstOrThrow();
    logout();
    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    expect((await resolveDeletionAction(null, form({ id: req.id, decision: "complete", resolution: "Profile deleted; tax records retained." }))).ok).toBe(true);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } });
    expect(u.status).toBe("DELETED");
    expect(u.name).toBe("Deleted customer");
    expect(u.email).not.toContain("example.com");
    expect(await prisma.wishlistItem.count({ where: { userId: buyer.id } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: buyer.id } })).toBe(0);
    expect(await prisma.order.count({ where: { id: order.id } })).toBe(1);
  });

  it("deletion is blocked while orders are still open", async () => {
    const { buyer } = await paidOrder();
    await loginAs(buyer.id);
    await requestAccountDeletionAction(null, form({ confirm: "DELETE" }));
    const req = await prisma.accountDeletionRequest.findFirstOrThrow();
    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    const res = await resolveDeletionAction(null, form({ id: req.id, decision: "complete", resolution: "Attempt" }));
    expect(res.ok).toBe(false);
  });
});
