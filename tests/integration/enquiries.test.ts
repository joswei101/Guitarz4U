import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { createPurchaseEnquiry } from "@/lib/submissions";
import { applyEnquiryAction, convertEnquiryToProduct } from "@/lib/enquiries/service";
import { searchProducts } from "@/lib/catalog";
import { POST as enquiryPost } from "@/app/api/enquiries/route";
import { jpegFile, makeCategory, makeUser } from "../helpers/factories";
import { sentEmails, storedFiles } from "../helpers/setup";

async function sellForm(extra: Record<string, string> = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ name: "Sam Seller", email: "sam@example.com", phone: "082 123 4567", instrumentType: "Electric guitar", brand: "Ibanez", model: "RG", condition: "Broken / not working", faults: "No output from the jack", privacy: "on", ...extra })) f.set(k, v);
  f.append("photos", await jpegFile());
  return f;
}

describe("sell-your-guitar submissions", () => {
  it("creates a private enquiry, stores photos privately (EXIF stripped), confirms to the seller and alerts the owner", async () => {
    const e = await createPurchaseEnquiry(await sellForm(), null);
    expect(e.status).toBe("SUBMITTED");
    expect(e.reference).toMatch(/^SELL-/);
    const media = await prisma.purchaseEnquiryMedia.findMany({ where: { enquiryId: e.id }, include: { file: true } });
    expect(media).toHaveLength(1);
    expect(media[0].file.isPublic).toBe(false);
    expect(media[0].file.mimeType).toBe("image/webp");
    const stored = storedFiles.get(media[0].file.storageKey)!;
    const meta = await sharp(stored).metadata();
    expect(meta.exif).toBeUndefined();
    expect(sentEmails.map((m) => m.to)).toEqual(expect.arrayContaining(["sam@example.com", "Joshuaweinfas@gmail.com"]));
  });

  it("requires consent, a photo, valid contact details and an accepted item type", async () => {
    const noConsent = await sellForm();
    noConsent.delete("privacy");
    await expect(createPurchaseEnquiry(noConsent, null)).rejects.toThrow();
    const noPhoto = await sellForm();
    noPhoto.delete("photos");
    await expect(createPurchaseEnquiry(noPhoto, null)).rejects.toThrow(/at least one photo/);
    await expect(createPurchaseEnquiry(await sellForm({ instrumentType: "Drum kit" }), null)).rejects.toThrow(/not currently accepting/);
    await expect(createPurchaseEnquiry(await sellForm({ email: "nope" }), null)).rejects.toThrow();
  });

  it("the API route blocks cross-site posts and returns field errors", async () => {
    const cross = await enquiryPost(new Request("http://localhost:3000/api/enquiries", { method: "POST", headers: { origin: "https://evil.example" }, body: await sellForm() }));
    expect(cross.status).toBe(403);
    const bad = await sellForm({ phone: "x" });
    const res = await enquiryPost(new Request("http://localhost:3000/api/enquiries", { method: "POST", headers: { origin: "http://localhost:3000" }, body: bad }));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.phone).toBeTruthy();
    const ok = await enquiryPost(new Request("http://localhost:3000/api/enquiries", { method: "POST", headers: { origin: "http://localhost:3000" }, body: await sellForm() }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).reference).toMatch(/^SELL-/);
  });

  it("supports the full negotiation: info request, offer, counter-offer, acceptance, purchase and conversion to a DRAFT product", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const e = await createPurchaseEnquiry(await sellForm(), null);
    await applyEnquiryAction(e.id, { kind: "review" }, admin.id);
    await applyEnquiryAction(e.id, { kind: "request_info", message: "Please send a photo of the serial number." }, admin.id);
    await applyEnquiryAction(e.id, { kind: "make_offer", amountCents: 150_000, message: "Offer for the guitar as-is." }, admin.id);
    await applyEnquiryAction(e.id, { kind: "record_counter", amountCents: 200_000, message: "Seller asked for R2000 on WhatsApp" }, admin.id);
    await applyEnquiryAction(e.id, { kind: "make_offer", amountCents: 180_000 }, admin.id);
    await applyEnquiryAction(e.id, { kind: "seller_accepted", message: "Accepted on WhatsApp" }, admin.id);
    let after = await prisma.purchaseEnquiry.findUniqueOrThrow({ where: { id: e.id }, include: { offers: { orderBy: { createdAt: "asc" } }, events: true } });
    expect(after.status).toBe("OFFER_ACCEPTED");
    expect(after.agreedPriceCents).toBe(180_000);
    expect(after.offers.map((o) => [o.party, o.amountCents, o.status])).toEqual([
      ["BUSINESS", 150_000, "DECLINED"],
      ["SELLER", 200_000, "SUPERSEDED"],
      ["BUSINESS", 180_000, "ACCEPTED"],
    ]);
    expect(after.events.length).toBeGreaterThanOrEqual(6);
    await expect(convertEnquiryToProduct(e.id, { title: "Ibanez RG", categoryId: (await makeCategory()).id, slug: "ibanez-rg", sku: "SKU-RG" }, admin.id)).rejects.toThrow(/completed purchases/);
    await applyEnquiryAction(e.id, { kind: "complete_purchase", amountCents: 180_000, message: "Paid by EFT" }, admin.id);
    const cat = await makeCategory("electric");
    const product = await convertEnquiryToProduct(e.id, { title: "Ibanez RG", categoryId: cat.id, slug: "ibanez-rg", sku: "SKU-RG" }, admin.id);
    expect(product.status).toBe("DRAFT");
    expect(product.publishedAt).toBeNull();
    expect(product.acquisitionCostCents).toBe(180_000);
    after = await prisma.purchaseEnquiry.findUniqueOrThrow({ where: { id: e.id }, include: { offers: true, events: true } });
    expect(after.status).toBe("CONVERTED_TO_INVENTORY");
    // Customer submissions never become public automatically.
    expect((await searchProducts({})).total).toBe(0);
    expect(sentEmails.some((m) => /We have made you an offer/.test(m.subject))).toBe(true);
  });

  it("accepting a seller's counter-offer records the agreed price", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const e = await createPurchaseEnquiry(await sellForm(), null);
    await applyEnquiryAction(e.id, { kind: "make_offer", amountCents: 100_000 }, admin.id);
    await applyEnquiryAction(e.id, { kind: "record_counter", amountCents: 120_000 }, admin.id);
    await applyEnquiryAction(e.id, { kind: "accept_counter" }, admin.id);
    const after = await prisma.purchaseEnquiry.findUniqueOrThrow({ where: { id: e.id } });
    expect(after.status).toBe("OFFER_ACCEPTED");
    expect(after.agreedPriceCents).toBe(120_000);
  });

  it("declining closes the enquiry", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const e = await createPurchaseEnquiry(await sellForm(), null);
    await applyEnquiryAction(e.id, { kind: "decline", message: "Not something we can resell." }, admin.id);
    await expect(applyEnquiryAction(e.id, { kind: "make_offer", amountCents: 1000 }, admin.id)).rejects.toThrow(/closed/);
  });
});
