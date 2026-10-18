"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { PAGE_DEFS } from "@/lib/content";
import { UserError, type ActionResult } from "@/lib/errors";
import { notifyAdmin } from "@/lib/notify";

function revalidatePublic(slug: string) {
  revalidatePath(["about", "how-it-works"].includes(slug) ? `/${slug}` : `/policies/${slug}`);
}

/** Content managers save drafts for owner approval; the owner can publish directly. */
export async function savePageAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("content:draft");
    const slug = z.string().parse(form.get("slug"));
    const def = PAGE_DEFS.find((p) => p.slug === slug);
    if (!def) throw new UserError("Unknown page.");
    const title = z.string().trim().min(2).max(120).parse(form.get("title"));
    const body = z.string().trim().min(20).max(50000).parse(form.get("body"));
    const metaDescription = z.string().trim().max(300).optional().parse(form.get("metaDescription") || undefined);
    const publish = form.get("intent") === "publish" && can(user.role, "content:publish");
    if (publish) {
      await prisma.page.upsert({
        where: { slug },
        create: { slug, title, body, metaDescription, requiresLegalReview: def.requiresLegalReview, publishedAt: new Date(), publishedById: user.id },
        update: { title, body, metaDescription, publishedAt: new Date(), publishedById: user.id, draftBody: null, draftTitle: null, draftStatus: null, draftById: null },
      });
      revalidatePublic(slug);
    } else {
      await prisma.page.upsert({
        where: { slug },
        create: { slug, title: def.title, body: "", draftTitle: title, draftBody: body, draftStatus: "PENDING_APPROVAL", draftById: user.id, requiresLegalReview: def.requiresLegalReview },
        update: { draftTitle: title, draftBody: body, draftStatus: "PENDING_APPROVAL", draftById: user.id, metaDescription },
      });
      if (!can(user.role, "content:publish")) await notifyAdmin("Page change awaiting your approval", [["Page", title], ["By", user.name]], `/admin/content/${slug}`);
    }
    await audit({ actorId: user.id, action: publish ? "page.published" : "page.draft_saved", entityType: "Page", entityId: slug });
    revalidatePath(`/admin/content/${slug}`);
    return { ok: true, message: publish ? "Published." : "Draft saved and submitted for owner approval." };
  });
}

export async function decidePageDraftAction(form: FormData) {
  const user = await requirePermission("content:publish");
  const slug = z.string().parse(form.get("slug"));
  const approve = form.get("decision") === "approve";
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page?.draftBody) return;
  await prisma.page.update({
    where: { slug },
    data: approve
      ? { title: page.draftTitle ?? page.title, body: page.draftBody, publishedAt: new Date(), publishedById: user.id, draftBody: null, draftTitle: null, draftStatus: null, draftById: null }
      : { draftBody: null, draftTitle: null, draftStatus: null, draftById: null },
  });
  await audit({ actorId: user.id, action: approve ? "page.draft_approved" : "page.draft_rejected", entityType: "Page", entityId: slug });
  revalidatePublic(slug);
  revalidatePath(`/admin/content/${slug}`);
}

export async function saveFaqAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("content:draft");
    const d = z.object({ id: z.string().optional(), question: z.string().trim().min(5).max(300), answer: z.string().trim().min(5).max(3000), category: z.string().trim().min(2).max(40), sortOrder: z.coerce.number().int().default(0) }).parse({ ...Object.fromEntries(form), id: form.get("id") || undefined });
    const status = can(user.role, "content:publish") ? (form.get("publish") === "on" ? "PUBLISHED" : "DRAFT") : "PENDING_APPROVAL";
    const data = { question: d.question, answer: d.answer, category: d.category, sortOrder: d.sortOrder, status } as const;
    if (d.id) await prisma.faq.update({ where: { id: d.id }, data });
    else await prisma.faq.create({ data });
    await audit({ actorId: user.id, action: "faq.saved", entityType: "Faq", entityId: d.id ?? null, details: { status } });
    revalidatePath("/faqs");
    revalidatePath("/admin/content");
    return { ok: true, message: status === "PENDING_APPROVAL" ? "Saved — awaiting owner approval." : "FAQ saved." };
  });
}

export async function deleteFaqAction(form: FormData) {
  const user = await requirePermission("content:publish");
  const id = z.string().parse(form.get("id"));
  await prisma.faq.delete({ where: { id } });
  await audit({ actorId: user.id, action: "faq.deleted", entityType: "Faq", entityId: id });
  revalidatePath("/faqs");
  revalidatePath("/admin/content");
}

export async function saveBannerAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("content:draft");
    const d = z.object({ id: z.string().optional(), heading: z.string().trim().min(3).max(120), subheading: z.string().trim().max(300).optional() }).parse({ id: form.get("id") || undefined, heading: form.get("heading"), subheading: form.get("subheading") || undefined });
    const status = can(user.role, "content:publish") ? "PUBLISHED" : "PENDING_APPROVAL";
    if (status === "PENDING_APPROVAL") {
      // Store the proposal as a separate pending banner so the live one is unaffected.
      await prisma.banner.create({ data: { heading: d.heading, subheading: d.subheading, status, sortOrder: 99 } });
    } else if (d.id) {
      await prisma.banner.update({ where: { id: d.id }, data: { heading: d.heading, subheading: d.subheading, status } });
    } else {
      await prisma.banner.create({ data: { heading: d.heading, subheading: d.subheading, status } });
    }
    await audit({ actorId: user.id, action: "banner.saved", entityType: "Banner", entityId: d.id ?? null, details: { status } });
    revalidatePath("/");
    return { ok: true, message: status === "PUBLISHED" ? "Homepage banner updated." : "Banner proposal submitted for owner approval." };
  });
}

export async function decideBannerAction(form: FormData) {
  const user = await requirePermission("content:publish");
  const id = z.string().parse(form.get("id"));
  if (form.get("decision") === "approve") {
    await prisma.$transaction([prisma.banner.updateMany({ where: { status: "PUBLISHED" }, data: { status: "DRAFT" } }), prisma.banner.update({ where: { id }, data: { status: "PUBLISHED", sortOrder: 0 } })]);
  } else await prisma.banner.delete({ where: { id } });
  await audit({ actorId: user.id, action: "banner.decided", entityType: "Banner", entityId: id });
  revalidatePath("/");
  revalidatePath("/admin/content");
}
