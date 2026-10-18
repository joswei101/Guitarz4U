import { cookies } from "next/headers";
import { prisma } from "../db";
import { effectivePrice } from "../money";
import { getCurrentUser } from "../auth/session";
import { reservedCounts } from "./inventory";

export const GUEST_CART_COOKIE = "g4u_cart";
const MAX_LINES = 20;

type GuestLine = { p: string; q: number };

/** Guest carts hold only product ids and quantities. Prices and availability always come from the database. */
export async function readGuestCart(): Promise<GuestLine[]> {
  const raw = (await cookies()).get(GUEST_CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l): l is GuestLine => typeof l?.p === "string" && l.p.length < 40 && Number.isInteger(l?.q) && l.q > 0 && l.q < 100)
      .slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export async function writeGuestCart(lines: GuestLine[]) {
  (await cookies()).set(GUEST_CART_COOKIE, JSON.stringify(lines.slice(0, MAX_LINES)), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

/** Moves a guest cart into the user's saved cart after sign-in. */
export async function mergeGuestCart(userId: string) {
  const lines = await readGuestCart();
  for (const l of lines) {
    const product = await prisma.product.findUnique({ where: { id: l.p }, select: { id: true, quantity: true } });
    if (!product) continue;
    await prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId: l.p } },
      create: { userId, productId: l.p, quantity: Math.min(l.q, Math.max(1, product.quantity)) },
      update: {},
    });
  }
  if (lines.length) (await cookies()).delete(GUEST_CART_COOKIE);
}

export async function getCart() {
  const user = await getCurrentUser();
  const lines = user
    ? (await prisma.cartItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } })).map((c) => ({ productId: c.productId, quantity: c.quantity }))
    : (await readGuestCart()).map((l) => ({ productId: l.p, quantity: l.q }));
  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
    include: { category: { select: { name: true } }, media: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const reserved = await reservedCounts(products.map((p) => p.id));
  const items = lines
    .map((l) => {
      const product = products.find((p) => p.id === l.productId);
      if (!product) return null;
      const free = Math.max(0, product.quantity - (reserved.get(product.id) ?? 0));
      const purchasable = product.status === "AVAILABLE" && Boolean(product.publishedAt) && free > 0;
      const quantity = product.quantity > 1 ? Math.min(l.quantity, product.quantity) : 1;
      const unit = effectivePrice(product);
      return {
        product,
        quantity,
        unitPriceCents: unit,
        lineTotalCents: unit * quantity,
        purchasable,
        issue: !purchasable ? (product.status === "SOLD" ? "Sold" : product.status === "AVAILABLE" && free === 0 ? "Currently reserved in another checkout" : "No longer available") : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const subtotalCents = items.filter((i) => i.purchasable).reduce((s, i) => s + i.lineTotalCents, 0);
  return { user, items, subtotalCents, hasIssues: items.some((i) => !i.purchasable) };
}
