"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/catalog";
import { randToCents } from "@/lib/money";
import { UserError, type ActionResult } from "@/lib/errors";
import { sendEmail } from "@/lib/notify";
import { setSetting } from "@/lib/settings";

// ── Categories ────────────────────────────────────────────────
export async function saveCategoryAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("categories:manage");
    const d = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(60), description: z.string().trim().max(500).optional(), sortOrder: z.coerce.number().int().default(0) }).parse({ ...Object.fromEntries(form), id: form.get("id") || undefined, description: form.get("description") || undefined });
    const data = { name: d.name, description: d.description, sortOrder: d.sortOrder, isActive: form.get("isActive") === "on", isPartsCategory: form.get("isPartsCategory") === "on" };
    if (d.id) await prisma.category.update({ where: { id: d.id }, data });
    else await prisma.category.create({ data: { ...data, slug: slugify(d.name) } });
    await audit({ actorId: user.id, action: d.id ? "category.updated" : "category.created", entityType: "Category", entityId: d.id ?? null, details: { name: d.name } });
    revalidatePath("/admin/categories");
    return { ok: true, message: "Category saved." };
  });
}

// ── Reviews ───────────────────────────────────────────────────
export async function moderateReviewAction(form: FormData) {
  const user = await requirePermission("reviews:moderate");
  const id = z.string().parse(form.get("id"));
  const status = z.enum(["APPROVED", "REJECTED", "REMOVED"]).parse(form.get("status"));
  await prisma.review.update({ where: { id }, data: { status, moderatedById: user.id, moderatedAt: new Date(), moderationNote: String(form.get("note") ?? "").slice(0, 500) || null } });
  await audit({ actorId: user.id, action: `review.${status.toLowerCase()}`, entityType: "Review", entityId: id });
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
}

// ── Product questions ─────────────────────────────────────────
export async function answerQuestionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("questions:answer");
    const id = z.string().parse(form.get("id"));
    const answer = z.string().trim().min(2).max(2000).parse(form.get("answer"));
    const publish = form.get("publish") === "on";
    const canPublish = user.role === "ADMIN";
    const q = await prisma.productQuestion.update({
      where: { id },
      data: { answer, answeredById: user.id, answeredAt: new Date(), status: publish && canPublish ? "APPROVED" : "PENDING" },
      include: { user: true, product: true },
    });
    await audit({ actorId: user.id, action: "question.answered", entityType: "ProductQuestion", entityId: id, details: { published: publish && canPublish } });
    if (publish && canPublish) await sendEmail("questionAnswered", q.user.email, { name: q.user.name, productTitle: q.product.title, slug: q.product.slug }, q.userId);
    revalidatePath("/admin/questions");
    return { ok: true, message: publish && canPublish ? "Answer published and customer notified." : "Answer saved — awaiting owner approval to publish." };
  });
}

export async function moderateQuestionAction(form: FormData) {
  const user = await requirePermission("questions:publish");
  const id = z.string().parse(form.get("id"));
  const status = z.enum(["APPROVED", "REJECTED", "REMOVED"]).parse(form.get("status"));
  const q = await prisma.productQuestion.findUniqueOrThrow({ where: { id }, include: { user: true, product: true } });
  if (status === "APPROVED" && !q.answer) throw new UserError("Answer the question before publishing it.");
  await prisma.productQuestion.update({ where: { id }, data: { status } });
  await audit({ actorId: user.id, action: `question.${status.toLowerCase()}`, entityType: "ProductQuestion", entityId: id });
  if (status === "APPROVED") await sendEmail("questionAnswered", q.user.email, { name: q.user.name, productTitle: q.product.title, slug: q.product.slug }, q.userId);
  revalidatePath("/admin/questions");
}

// ── Contact messages ──────────────────────────────────────────
export async function updateMessageAction(form: FormData) {
  const user = await requirePermission("contact:manage");
  const id = z.string().parse(form.get("id"));
  const status = z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "SPAM"]).parse(form.get("status"));
  await prisma.contactEnquiry.update({ where: { id }, data: { status, adminNotes: String(form.get("adminNotes") ?? "").slice(0, 2000) || undefined } });
  await audit({ actorId: user.id, action: "message.updated", entityType: "ContactEnquiry", entityId: id, details: { status } });
  revalidatePath("/admin/messages");
}

// ── Discount codes ────────────────────────────────────────────
export async function saveDiscountAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("discounts:manage");
    const d = z
      .object({
        id: z.string().optional(),
        code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "3–30 letters, numbers, - or _"),
        description: z.string().trim().max(200).optional(),
        type: z.enum(["PERCENTAGE", "FIXED"]),
        value: z.string().trim().min(1),
        minOrder: z.string().optional(),
        maxUses: z.string().optional(),
        maxUsesPerUser: z.string().optional(),
        validFrom: z.string().optional(),
        validUntil: z.string().optional(),
        categoryId: z.string().optional(),
      })
      .parse(Object.fromEntries([...form.entries()].map(([k, v]) => [k, v === "" ? undefined : v])));
    const value = d.type === "PERCENTAGE" ? Math.round(Number(d.value)) : randToCents(d.value);
    if (!Number.isFinite(value) || value <= 0 || (d.type === "PERCENTAGE" && value > 100)) throw new UserError("Enter a valid discount value.");
    const data = {
      code: d.code,
      description: d.description,
      type: d.type,
      value,
      minOrderCents: d.minOrder ? randToCents(d.minOrder) : null,
      maxUses: d.maxUses ? Number(d.maxUses) : null,
      maxUsesPerUser: d.maxUsesPerUser ? Number(d.maxUsesPerUser) : null,
      validFrom: d.validFrom ? new Date(`${d.validFrom}T00:00:00+02:00`) : null,
      validUntil: d.validUntil ? new Date(`${d.validUntil}T23:59:59+02:00`) : null,
      categoryId: d.categoryId ?? null,
      isActive: form.get("isActive") === "on",
    };
    if (d.id) await prisma.discountCode.update({ where: { id: d.id }, data });
    else {
      if (await prisma.discountCode.findFirst({ where: { code: { equals: d.code, mode: "insensitive" } } })) throw new UserError("That code already exists.");
      await prisma.discountCode.create({ data });
    }
    await audit({ actorId: user.id, action: d.id ? "discount.updated" : "discount.created", entityType: "DiscountCode", entityId: d.id ?? null, details: { code: d.code, type: d.type, value } });
    revalidatePath("/admin/discounts");
    return { ok: true, message: "Discount code saved." };
  });
}

// ── Settings ──────────────────────────────────────────────────
export async function saveSettingsAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("settings:manage");
    const types = String(form.get("acceptedTypes") ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 40);
    if (types.length === 0) throw new UserError("List at least one accepted item type.");
    await setSetting("sell.acceptedTypes", types);
    await setSetting("repairs.acceptingRequests", form.get("acceptingRepairs") === "on");
    const warranty = String(form.get("warrantyTerms") ?? "").trim();
    if (warranty) await setSetting("repairs.defaultWarrantyTerms", warranty.slice(0, 3000));
    await audit({ actorId: user.id, action: "settings.updated", entityType: "Setting", details: { types: types.length } });
    revalidatePath("/sell");
    return { ok: true, message: "Settings saved." };
  });
}
