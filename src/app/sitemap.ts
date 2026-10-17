import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { publicProductWhere } from "@/lib/shop/inventory";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const statics = ["", "/shop", "/sell", "/repairs", "/repairs/book", "/repairs/track", "/about", "/how-it-works", "/reviews", "/faqs", "/contact", "/policies/privacy", "/policies/terms", "/policies/returns", "/policies/condition", "/policies/repair-terms", "/policies/sell-terms", "/policies/collection"];
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: publicProductWhere, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: `${base}/shop?category=${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/shop/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
