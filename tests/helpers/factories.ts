import sharp from "sharp";
import type { ConditionRating, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { randomToken, sha256 } from "@/lib/crypto";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { cookieJar } from "./setup";

let n = 0;

export async function makeUser(opts: { role?: Role; verified?: boolean; email?: string; name?: string; password?: string } = {}) {
  n++;
  return prisma.user.create({
    data: {
      email: opts.email ?? `user${n}-${randomToken(4).toLowerCase()}@example.com`,
      name: opts.name ?? `Test User${n}`,
      passwordHash: await hashPassword(opts.password ?? "correct-horse-42"),
      role: opts.role ?? "CUSTOMER",
      emailVerifiedAt: opts.verified === false ? null : new Date(),
      profile: { create: {} },
    },
  });
}

/** Signs a user in for subsequent server-action/route calls in this test. */
export async function loginAs(userId: string) {
  const token = randomToken(32);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + 86400000) } });
  cookieJar.set(SESSION_COOKIE, token);
  return token;
}

export function logout() {
  cookieJar.delete(SESSION_COOKIE);
}

export async function makeCategory(slug = `cat-${++n}`, isPartsCategory = false) {
  return prisma.category.create({ data: { slug, name: slug.replace(/-/g, " "), isPartsCategory } });
}

export async function makeProduct(opts: { categoryId?: string; price?: number; sale?: number | null; status?: "AVAILABLE" | "DRAFT" | "SOLD" | "RESERVED" | "UNAVAILABLE"; quantity?: number; title?: string; brand?: string; condition?: ConditionRating; leftHanded?: boolean; cost?: number } = {}) {
  n++;
  const categoryId = opts.categoryId ?? (await makeCategory()).id;
  const status = opts.status ?? "AVAILABLE";
  return prisma.product.create({
    data: {
      slug: `product-${n}-${randomToken(3).toLowerCase()}`,
      sku: `SKU-${n}-${randomToken(3)}`,
      title: opts.title ?? `Test Guitar ${n}`,
      brand: opts.brand ?? "Fender",
      model: "Stratocaster",
      categoryId,
      description: "A lovely test guitar with a long enough description.",
      priceCents: opts.price ?? 1_000_000,
      salePriceCents: opts.sale ?? null,
      condition: opts.condition ?? "GOOD",
      conditionNotes: "Light wear.",
      status,
      quantity: opts.quantity ?? 1,
      isLeftHanded: opts.leftHanded ?? false,
      publishedAt: status === "DRAFT" ? null : new Date(Date.now() - n * 1000),
      acquisitionCostCents: opts.cost ?? 400_000,
    },
  });
}

export async function addToCart(userId: string, productId: string, quantity = 1) {
  return prisma.cartItem.create({ data: { userId, productId, quantity } });
}

/** A real (tiny) JPEG with EXIF metadata, as a browser File. */
export async function jpegFile(name = "photo.jpg"): Promise<File> {
  const buf = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 120, b: 30 } } })
    .withMetadata({ exif: { IFD0: { Make: "TestCam", Model: "GPS-Phone" } } })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(buf)], name, { type: "image/jpeg" });
}
