"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { getCurrentUser } from "@/lib/auth/session";
import { requireUser, requireVerifiedUser } from "@/lib/auth/guards";
import { readGuestCart, writeGuestCart } from "@/lib/shop/cart";
import { enforceRateLimit, limits } from "@/lib/rate-limit";
import { notifyAdmin } from "@/lib/notify";
import { UserError, type ActionResult } from "@/lib/errors";
import { validateDiscount } from "@/lib/shop/discounts";
import { effectivePrice, formatZAR } from "@/lib/money";

const idSchema = z.string().min(5).max(40);

export async function addToCart(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const productId = idSchema.parse(form.get("productId"));
    const qty = Math.max(1, Math.min(99, Number(form.get("quantity") ?? 1) || 1));
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== "AVAILABLE" || !product.publishedAt) throw new UserError("Sorry, this item is no longer available.");
    const quantity = product.quantity > 1 ? Math.min(qty, product.quantity) : 1;
    const user = await getCurrentUser();
    if (user) {
      await prisma.cartItem.upsert({ where: { userId_productId: { userId: user.id, productId } }, create: { userId: user.id, productId, quantity }, update: { quantity } });
    } else {
      const lines = (await readGuestCart()).filter((l) => l.p !== productId);
      await writeGuestCart([...lines, { p: productId, q: quantity }]);
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Added to your cart." };
  });
}

export async function removeFromCart(form: FormData): Promise<void> {
  const productId = idSchema.parse(form.get("productId"));
  const user = await getCurrentUser();
  if (user) await prisma.cartItem.deleteMany({ where: { userId: user.id, productId } });
  else await writeGuestCart((await readGuestCart()).filter((l) => l.p !== productId));
  revalidatePath("/", "layout");
}

export async function updateCartQuantity(form: FormData): Promise<void> {
  const productId = idSchema.parse(form.get("productId"));
  const qty = Math.max(1, Math.min(99, Number(form.get("quantity")) || 1));
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { quantity: true } });
  if (!product) return;
  const quantity = Math.min(qty, Math.max(1, product.quantity));
  const user = await getCurrentUser();
  if (user) await prisma.cartItem.updateMany({ where: { userId: user.id, productId }, data: { quantity } });
  else await writeGuestCart((await readGuestCart()).map((l) => (l.p === productId ? { ...l, q: quantity } : l)));
  revalidatePath("/cart");
}

export async function toggleWishlist(_prev: ActionResult<{ saved: boolean }> | null, form: FormData): Promise<ActionResult<{ saved: boolean }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Sign in to save items to your wishlist." };
    const productId = idSchema.parse(form.get("productId"));
    const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
    if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
    else {
      if (!(await prisma.product.findUnique({ where: { id: productId } }))) throw new UserError("Product not found.");
      await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
    }
    revalidatePath("/account/wishlist");
    return { ok: true, data: { saved: !existing }, message: existing ? "Removed from wishlist." : "Saved to your wishlist." };
  });
}

export async function askQuestion(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireVerifiedUser();
    await enforceRateLimit(`question:${user.id}`, limits.form.limit, limits.form.window);
    const productId = idSchema.parse(form.get("productId"));
    const question = z.string().trim().min(5, "Please write a bit more.").max(1000).parse(form.get("question"));
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { title: true, id: true } });
    if (!product) throw new UserError("Product not found.");
    await prisma.productQuestion.create({ data: { productId, userId: user.id, question } });
    await notifyAdmin("New product question", [["Product", product.title], ["From", user.name], ["Question", question]], "/admin/questions");
    return { ok: true, message: "Thanks! Your question has been sent. Answers appear here once published, and we'll email you." };
  });
}

/** Lets the customer preview a discount before checkout. The real validation happens again at checkout. */
export async function previewDiscount(_prev: ActionResult<{ discount: string; total: string }> | null, form: FormData): Promise<ActionResult<{ discount: string; total: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    await enforceRateLimit(`discount:${user.id}`, 20, 15 * 60);
    const code = z.string().trim().min(2).max(40).parse(form.get("discountCode"));
    const cart = await prisma.cartItem.findMany({ where: { userId: user.id }, include: { product: true } });
    const lines = cart.map((c) => ({ categoryId: c.product.categoryId, lineTotalCents: effectivePrice(c.product) * (c.product.quantity > 1 ? c.quantity : 1) }));
    const { amount } = await validateDiscount(prisma, code, user.id, lines);
    const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
    return { ok: true, message: `Code applied: −${formatZAR(amount)}`, data: { discount: formatZAR(amount), total: formatZAR(subtotal - amount) } };
  });
}
