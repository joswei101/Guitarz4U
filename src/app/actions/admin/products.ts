"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ConditionRating, Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { randToCents } from "@/lib/money";
import { slugify, CONDITION_LABELS } from "@/lib/catalog";
import { UserError, type ActionResult } from "@/lib/errors";
import { requestPriceSuggestion } from "@/lib/ai-pricing";
import { storage } from "@/lib/storage";
import { thumbKey } from "@/lib/storage/uploads";
import { humanReference } from "@/lib/crypto";

const optionalMoney = z.string().trim().optional().transform((v) => (v ? randToCents(v) : null));

function parseSpecs(text: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of (text ?? "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim().slice(0, 60);
      const v = line.slice(i + 1).trim().slice(0, 200);
      if (k && v) out[k] = v;
    }
  }
  return out;
}

const contentSchema = z.object({
  title: z.string().trim().min(3).max(150),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  categoryId: z.string().min(5),
  description: z.string().trim().max(8000).default(""),
  condition: z.enum(Object.keys(CONDITION_LABELS) as [ConditionRating, ...ConditionRating[]]),
  conditionNotes: z.string().trim().max(4000).default(""),
  specifications: z.string().max(5000).optional(),
});

const pricingSchema = z.object({
  price: z.string().trim().min(1, "Price is required").transform((v) => randToCents(v)),
  salePrice: optionalMoney,
  acquisitionCost: optionalMoney,
  refurbishmentCost: optionalMoney,
  quantity: z.coerce.number().int().min(0).max(999).default(1),
  lowStockThreshold: z.string().optional().transform((v) => (v ? Number(v) : null)),
  privateNotes: z.string().trim().max(4000).optional(),
});

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "item";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await prisma.product.findUnique({ where: { slug } });
    if (!hit || hit.id === excludeId) return slug;
  }
  return `${root}-${Date.now()}`;
}

export async function createProductAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let id: string | null = null;
  const result = await runAction<undefined>(async () => {
    const user = await requirePermission("inventory:edit-pricing");
    const c = contentSchema.parse(Object.fromEntries(form));
    const p = pricingSchema.parse(Object.fromEntries(form));
    const category = await prisma.category.findUnique({ where: { id: c.categoryId } });
    if (!category) throw new UserError("Choose a category.");
    if (p.salePrice != null && p.salePrice >= p.price) throw new UserError("The sale price must be lower than the normal price.");
    const product = await prisma.product.create({
      data: {
        ...c,
        specifications: parseSpecs(c.specifications),
        slug: await uniqueSlug(c.title),
        sku: humanReference("G4U", 6),
        priceCents: p.price,
        salePriceCents: p.salePrice,
        acquisitionCostCents: p.acquisitionCost,
        refurbishmentCostCents: p.refurbishmentCost,
        quantity: category.isPartsCategory ? p.quantity : 1,
        lowStockThreshold: category.isPartsCategory ? p.lowStockThreshold : null,
        privateNotes: p.privateNotes,
        isLeftHanded: form.get("isLeftHanded") === "on",
        isFeatured: form.get("isFeatured") === "on",
        status: "DRAFT",
      },
    });
    await audit({ actorId: user.id, action: "product.created", entityType: "Product", entityId: product.id, details: { price: p.price } });
    id = product.id;
  });
  if (id) redirect(`/admin/products/${id}?created=1`);
  return result;
}

export async function updateProductAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("inventory:edit-content");
    const id = z.string().parse(form.get("id"));
    const existing = await prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!existing) throw new UserError("Product not found.", 404);
    const c = contentSchema.parse(Object.fromEntries(form));
    const data: Prisma.ProductUncheckedUpdateInput = { ...c, specifications: parseSpecs(c.specifications), isLeftHanded: form.get("isLeftHanded") === "on" };
    const changes: Record<string, unknown> = {};
    // Price, cost and stock fields: owner only, enforced here regardless of what the form contained.
    if (can(user.role, "inventory:edit-pricing")) {
      const p = pricingSchema.parse(Object.fromEntries(form));
      if (p.salePrice != null && p.salePrice >= p.price) throw new UserError("The sale price must be lower than the normal price.");
      const category = await prisma.category.findUniqueOrThrow({ where: { id: c.categoryId } });
      Object.assign(data, {
        priceCents: p.price,
        salePriceCents: p.salePrice,
        acquisitionCostCents: p.acquisitionCost,
        refurbishmentCostCents: p.refurbishmentCost,
        quantity: category.isPartsCategory ? p.quantity : Math.min(existing.quantity, 1),
        lowStockThreshold: category.isPartsCategory ? p.lowStockThreshold : null,
        privateNotes: p.privateNotes,
        isFeatured: form.get("isFeatured") === "on",
      });
      if (p.price !== existing.priceCents || p.salePrice !== existing.salePriceCents) changes.price = { from: [existing.priceCents, existing.salePriceCents], to: [p.price, p.salePrice] };
    }
    if (c.title !== existing.title && !existing.publishedAt) data.slug = await uniqueSlug(c.title, id);
    await prisma.product.update({ where: { id }, data });
    await audit({ actorId: user.id, action: "product.updated", entityType: "Product", entityId: id, details: changes as Prisma.InputJsonValue });
    revalidatePath(`/admin/products/${id}`);
    revalidatePath(`/shop/${existing.slug}`);
    return { ok: true, message: "Product saved." };
  });
}

export async function setProductStatusAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("inventory:change-status");
    const id = z.string().parse(form.get("id"));
    const status = z.enum(["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "UNAVAILABLE"]).parse(form.get("status")) as ProductStatus;
    const product = await prisma.product.findUnique({ where: { id }, include: { media: true } });
    if (!product) throw new UserError("Product not found.", 404);
    if (status === "AVAILABLE") {
      if (product.media.length === 0) throw new UserError("Add at least one photo before publishing.");
      if (product.description.trim().length < 20) throw new UserError("Add a proper description before publishing.");
      if (!product.conditionNotes.trim()) throw new UserError("Add condition notes (known faults and wear) before publishing.");
      if (product.quantity < 1) throw new UserError("Stock quantity is zero.");
    }
    const live = await prisma.stockReservation.count({ where: { productId: id, status: "ACTIVE", expiresAt: { gt: new Date() } } });
    await prisma.product.update({
      where: { id },
      data: { status, publishedAt: status === "AVAILABLE" && !product.publishedAt ? new Date() : undefined, soldAt: status === "SOLD" ? (product.soldAt ?? new Date()) : undefined },
    });
    await audit({ actorId: user.id, action: "product.status_changed", entityType: "Product", entityId: id, details: { from: product.status, to: status } });
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/shop");
    return { ok: true, message: `Status changed to ${status.toLowerCase()}.${live ? " Note: a customer is currently in checkout for this item — if their payment completes, the order will be flagged for you." : ""}` };
  });
}

export async function deleteProductAction(form: FormData) {
  const user = await requirePermission("inventory:delete");
  const id = z.string().parse(form.get("id"));
  const used = await prisma.orderItem.count({ where: { productId: id } });
  if (used > 0) {
    // Keep sales records intact: hide instead of deleting.
    await prisma.product.update({ where: { id }, data: { status: "UNAVAILABLE" } });
    await audit({ actorId: user.id, action: "product.hidden_instead_of_deleted", entityType: "Product", entityId: id });
    redirect(`/admin/products/${id}?kept=1`);
  }
  const media = await prisma.productMedia.findMany({ where: { productId: id }, include: { file: true } });
  await prisma.$transaction([prisma.stockReservation.deleteMany({ where: { productId: id } }), prisma.product.delete({ where: { id } }), prisma.storedFile.deleteMany({ where: { id: { in: media.map((m) => m.fileId) } } })]);
  for (const m of media) {
    await storage().delete(m.file.storageKey).catch(() => undefined);
    await storage().delete(thumbKey(m.file.storageKey)).catch(() => undefined);
  }
  await audit({ actorId: user.id, action: "product.deleted", entityType: "Product", entityId: id });
  redirect("/admin/products");
}

export async function mediaAction(form: FormData) {
  await requirePermission("inventory:edit-content");
  const id = z.string().parse(form.get("mediaId"));
  const op = z.enum(["up", "down", "delete", "alt"]).parse(form.get("op"));
  const media = await prisma.productMedia.findUnique({ where: { id }, include: { file: true } });
  if (!media) return;
  if (op === "delete") {
    await prisma.storedFile.delete({ where: { id: media.fileId } });
    await storage().delete(media.file.storageKey).catch(() => undefined);
    await storage().delete(thumbKey(media.file.storageKey)).catch(() => undefined);
  } else if (op === "alt") {
    await prisma.productMedia.update({ where: { id }, data: { altText: String(form.get("altText") ?? "").slice(0, 200) || null } });
  } else {
    const all = await prisma.productMedia.findMany({ where: { productId: media.productId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const idx = all.findIndex((m) => m.id === id);
    const swap = all[op === "up" ? idx - 1 : idx + 1];
    if (swap) {
      const ordered = [...all];
      [ordered[idx], ordered[op === "up" ? idx - 1 : idx + 1]] = [swap, media];
      await prisma.$transaction(ordered.map((m, i) => prisma.productMedia.update({ where: { id: m.id }, data: { sortOrder: i } })));
    }
  }
  revalidatePath(`/admin/products/${media.productId}`);
}

export async function requestAiPriceAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("inventory:edit-pricing");
    const id = z.string().parse(form.get("id"));
    await requestPriceSuggestion(id);
    await audit({ actorId: user.id, action: "product.ai_estimate_requested", entityType: "Product", entityId: id });
    revalidatePath(`/admin/products/${id}`);
    return { ok: true, message: "AI estimate received. Review it below — it has NOT been applied." };
  });
}

export async function decidePriceSuggestionAction(form: FormData) {
  const user = await requirePermission("inventory:edit-pricing");
  const id = z.string().parse(form.get("suggestionId"));
  const approve = form.get("decision") === "approve";
  const s = await prisma.priceSuggestion.findUnique({ where: { id } });
  if (!s || s.status !== "PENDING") return;
  await prisma.$transaction(async (tx) => {
    await tx.priceSuggestion.update({ where: { id }, data: { status: approve ? "APPROVED" : "DISMISSED", decidedById: user.id, decidedAt: new Date() } });
    if (approve) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: s.productId } });
      await tx.product.update({ where: { id: s.productId }, data: { priceCents: s.suggestedCents, salePriceCents: product.salePriceCents && product.salePriceCents < s.suggestedCents ? product.salePriceCents : null } });
    }
    await audit({ actorId: user.id, action: approve ? "product.ai_price_approved" : "product.ai_price_dismissed", entityType: "Product", entityId: s.productId, details: { suggested: s.suggestedCents } }, tx);
  });
  revalidatePath(`/admin/products/${s.productId}`);
}
