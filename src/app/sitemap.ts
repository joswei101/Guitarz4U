import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/shop", "/sell", "/repairs", "/about", "/contact", "/reviews", "/faq", "/how-it-works", "/policies", "/privacy", "/terms"];
  const now = new Date();
  const entries: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${env.siteUrl}${p}`,
    lastModified: now,
    changeFrequency: p === "/shop" || p === "" ? "daily" : "monthly",
    priority: p === "" ? 1 : p === "/shop" ? 0.9 : 0.6,
  }));
  try {
    const products = await query<{ slug: string; updated_at: Date }>(
      "select slug, updated_at from products where status in ('published','reserved') and is_demo = false",
    );
    for (const p of products) {
      entries.push({ url: `${env.siteUrl}/shop/${p.slug}`, lastModified: p.updated_at, changeFrequency: "weekly", priority: 0.8 });
    }
  } catch (err) {
    console.error("[sitemap]", err);
  }
  return entries;
}
