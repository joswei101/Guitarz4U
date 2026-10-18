import type { EnquiryStatus, Prisma } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { humanReference } from "../crypto";
import { UserError } from "../errors";
import { audit } from "../audit";
import { sendEmail } from "../notify";
import { canNegotiate, isClosed } from "./status";

export async function newEnquiryReference(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const ref = humanReference("SELL", 6);
    if (!(await prisma.purchaseEnquiry.findUnique({ where: { reference: ref } }))) return ref;
  }
  throw new Error("Could not allocate enquiry reference");
}

async function lockEnquiry(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "PurchaseEnquiry" WHERE "id" = ${id} FOR UPDATE`;
  const e = await tx.purchaseEnquiry.findUnique({ where: { id } });
  if (!e) throw new UserError("Enquiry not found.", 404);
  return e;
}

async function move(tx: Tx, id: string, from: EnquiryStatus, to: EnquiryStatus, type: string, actorId: string, message?: string, customerVisible = false) {
  await tx.purchaseEnquiry.update({ where: { id }, data: { status: to } });
  await tx.enquiryEvent.create({ data: { enquiryId: id, type, fromStatus: from, toStatus: to, message: message || null, isCustomerVisible: customerVisible, actorId } });
}

export type EnquiryAction =
  | { kind: "review" }
  | { kind: "request_info"; message: string }
  | { kind: "decline"; message: string }
  | { kind: "make_offer"; amountCents: number; message?: string }
  | { kind: "record_counter"; amountCents: number; message?: string }
  | { kind: "accept_counter"; message?: string }
  | { kind: "seller_accepted"; message?: string }
  | { kind: "seller_declined"; message?: string }
  | { kind: "complete_purchase"; amountCents: number; message?: string }
  | { kind: "note"; message: string };

/** Applies an owner action to a purchase enquiry and records full negotiation history. */
export async function applyEnquiryAction(enquiryId: string, action: EnquiryAction, actorId: string): Promise<void> {
  const out: { email: { headline: string; message?: string; offerCents?: number } | null } = { email: null };

  const enquiry = await prisma.$transaction(async (tx) => {
    const e = await lockEnquiry(tx, enquiryId);
    if (isClosed(e.status) && action.kind !== "note") throw new UserError("This enquiry is closed.");

    switch (action.kind) {
      case "review":
        if (e.status !== "SUBMITTED") throw new UserError("Only new submissions can be marked as under review.");
        await move(tx, e.id, e.status, "UNDER_REVIEW", "status", actorId);
        break;
      case "request_info":
        if (!action.message.trim()) throw new UserError("Please write what information you need.");
        await move(tx, e.id, e.status, "MORE_INFO_REQUESTED", "info_requested", actorId, action.message, true);
        out.email = { headline: "We need a little more information", message: action.message };
        break;
      case "decline":
        if (["PURCHASE_COMPLETED", "OFFER_ACCEPTED"].includes(e.status)) throw new UserError("This purchase has already been agreed.");
        await tx.purchaseOffer.updateMany({ where: { enquiryId: e.id, status: "OPEN" }, data: { status: "WITHDRAWN" } });
        await move(tx, e.id, e.status, "DECLINED", "declined", actorId, action.message, true);
        out.email = { headline: "We are unable to make an offer on this item", message: action.message || undefined };
        break;
      case "make_offer": {
        if (!canNegotiate(e.status)) throw new UserError("Offers cannot be made at this stage.");
        if (action.amountCents <= 0) throw new UserError("Offer amount must be positive.");
        await tx.purchaseOffer.updateMany({ where: { enquiryId: e.id, status: "OPEN" }, data: { status: "SUPERSEDED" } });
        const offer = await tx.purchaseOffer.create({ data: { enquiryId: e.id, party: "BUSINESS", amountCents: action.amountCents, message: action.message, createdById: actorId } });
        await move(tx, e.id, e.status, "OFFER_MADE", "offer", actorId, action.message, true);
        await audit({ actorId, action: "enquiry.offer_made", entityType: "PurchaseOffer", entityId: offer.id, details: { amount: action.amountCents } }, tx);
        out.email = { headline: "We have made you an offer", message: action.message || "There is no obligation to accept. Reply on WhatsApp or email to accept, decline or discuss.", offerCents: action.amountCents };
        break;
      }
      case "record_counter": {
        if (!canNegotiate(e.status)) throw new UserError("A counter-offer cannot be recorded at this stage.");
        if (action.amountCents <= 0) throw new UserError("Counter-offer amount must be positive.");
        await tx.purchaseOffer.updateMany({ where: { enquiryId: e.id, status: "OPEN" }, data: { status: "DECLINED", respondedAt: new Date() } });
        await tx.purchaseOffer.create({ data: { enquiryId: e.id, party: "SELLER", amountCents: action.amountCents, message: action.message, createdById: actorId } });
        await move(tx, e.id, e.status, "COUNTER_OFFER_RECEIVED", "counter_offer", actorId, action.message);
        break;
      }
      case "accept_counter": {
        const counter = await tx.purchaseOffer.findFirst({ where: { enquiryId: e.id, status: "OPEN", party: "SELLER" }, orderBy: { createdAt: "desc" } });
        if (!counter) throw new UserError("There is no open counter-offer to accept.");
        await tx.purchaseOffer.update({ where: { id: counter.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
        await tx.purchaseEnquiry.update({ where: { id: e.id }, data: { agreedPriceCents: counter.amountCents } });
        await move(tx, e.id, e.status, "OFFER_ACCEPTED", "counter_accepted", actorId, action.message, true);
        out.email = { headline: "We accept your counter-offer", message: action.message || "We will be in touch to arrange the handover privately.", offerCents: counter.amountCents };
        break;
      }
      case "seller_accepted":
      case "seller_declined": {
        const offer = await tx.purchaseOffer.findFirst({ where: { enquiryId: e.id, status: "OPEN", party: "BUSINESS" }, orderBy: { createdAt: "desc" } });
        if (!offer) throw new UserError("There is no open offer from Guitarz4U to record a response for.");
        const accepted = action.kind === "seller_accepted";
        await tx.purchaseOffer.update({ where: { id: offer.id }, data: { status: accepted ? "ACCEPTED" : "DECLINED", respondedAt: new Date() } });
        if (accepted) await tx.purchaseEnquiry.update({ where: { id: e.id }, data: { agreedPriceCents: offer.amountCents } });
        await move(tx, e.id, e.status, accepted ? "OFFER_ACCEPTED" : "OFFER_DECLINED", accepted ? "offer_accepted" : "offer_declined", actorId, action.message);
        break;
      }
      case "complete_purchase":
        if (e.status !== "OFFER_ACCEPTED") throw new UserError("Record the accepted offer before completing the purchase.");
        if (action.amountCents <= 0) throw new UserError("Enter the amount paid to the seller.");
        await tx.purchaseEnquiry.update({ where: { id: e.id }, data: { agreedPriceCents: action.amountCents, purchasedAt: new Date() } });
        await move(tx, e.id, e.status, "PURCHASE_COMPLETED", "purchase_completed", actorId, action.message);
        await audit({ actorId, action: "enquiry.purchase_completed", entityType: "PurchaseEnquiry", entityId: e.id, details: { amount: action.amountCents } }, tx);
        out.email = { headline: "Purchase completed — thank you", message: "Thank you for selling your instrument to Guitarz4U." };
        break;
      case "note":
        if (!action.message.trim()) throw new UserError("Note cannot be empty.");
        await tx.enquiryEvent.create({ data: { enquiryId: e.id, type: "note", message: action.message, actorId } });
        break;
    }
    return e;
  });

  const mail = out.email;
  if (mail) await sendEmail("enquiryUpdate", enquiry.email, { name: enquiry.name, reference: enquiry.reference, ...mail }, enquiry.userId);
}

/**
 * Creates a DRAFT inventory item from a completed purchase. It is never published automatically:
 * the owner must add photos, a description, condition and price, then publish it.
 */
export async function convertEnquiryToProduct(enquiryId: string, input: { categoryId: string; title: string; slug: string; sku: string }, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const e = await lockEnquiry(tx, enquiryId);
    if (e.status !== "PURCHASE_COMPLETED") throw new UserError("Only completed purchases can be converted into inventory.");
    const data: Prisma.ProductUncheckedCreateInput = {
      slug: input.slug,
      sku: input.sku,
      title: input.title,
      brand: e.brand || "Unknown",
      model: e.model || "Unknown",
      categoryId: input.categoryId,
      description: "",
      priceCents: Math.max(100, e.agreedPriceCents ?? 100),
      condition: "GOOD",
      conditionNotes: e.faults ? `Seller-reported faults at purchase: ${e.faults}` : "",
      status: "DRAFT",
      quantity: 1,
      acquisitionCostCents: e.agreedPriceCents,
      acquiredAt: e.purchasedAt ?? new Date(),
      sourceEnquiryId: e.id,
      privateNotes: `Acquired via purchase enquiry ${e.reference}. Set the selling price before publishing.`,
    };
    const product = await tx.product.create({ data });
    await move(tx, e.id, e.status, "CONVERTED_TO_INVENTORY", "converted", actorId, `Draft inventory item ${product.sku} created.`);
    await audit({ actorId, action: "enquiry.converted", entityType: "Product", entityId: product.id, details: { enquiryId: e.id } }, tx);
    return product;
  });
}
