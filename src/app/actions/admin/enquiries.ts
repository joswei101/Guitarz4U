"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runAction } from "@/lib/action";
import { requirePermission } from "@/lib/auth/guards";
import { randToCents } from "@/lib/money";
import { applyEnquiryAction, convertEnquiryToProduct, type EnquiryAction } from "@/lib/enquiries/service";
import { slugify } from "@/lib/catalog";
import { humanReference } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/errors";

export async function enquiryActionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("enquiries:manage");
    const id = z.string().parse(form.get("id"));
    const kind = z.enum(["review", "request_info", "decline", "make_offer", "record_counter", "accept_counter", "seller_accepted", "seller_declined", "complete_purchase", "note"]).parse(form.get("kind"));
    const message = String(form.get("message") ?? "").trim().slice(0, 3000);
    const amount = form.get("amount") ? randToCents(String(form.get("amount"))) : 0;
    const action = (["make_offer", "record_counter", "complete_purchase"].includes(kind) ? { kind, amountCents: amount, message } : { kind, message }) as EnquiryAction;
    await applyEnquiryAction(id, action, user.id);
    revalidatePath(`/admin/enquiries/${id}`);
    return { ok: true, message: "Saved." };
  });
}

export async function convertEnquiryAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let productId: string | null = null;
  const result = await runAction<undefined>(async () => {
    const user = await requirePermission("inventory:edit-pricing");
    await requirePermission("enquiries:manage");
    const id = z.string().parse(form.get("id"));
    const title = z.string().trim().min(3).max(150).parse(form.get("title"));
    const categoryId = z.string().min(5).parse(form.get("categoryId"));
    let slug = slugify(title) || "item";
    if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const product = await convertEnquiryToProduct(id, { title, categoryId, slug, sku: humanReference("G4U", 6) }, user.id);
    productId = product.id;
  });
  if (productId) redirect(`/admin/products/${productId}?created=1`);
  return result;
}
