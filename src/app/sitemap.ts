import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ["", "/shop", "/sell", "/repairs", "/how-it-works", "/about", "/reviews", "/faq", "/contact", "/policies/privacy", "/policies/terms", "/policies/returns"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: (p === "" || p === "/shop" ? "daily" : "monthly") as "daily" | "monthly",
    priority: p === "" ? 1 : p === "/shop" ? 0.9 : 0.6,
  }));
  if (!SUPABASE_URL || !SUPABASE_KEY) return staticPages;
  try {
    // Public data only (anonymous key → RLS applies)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from("products").select("slug, updated_at").in("status", ["published", "reserved", "sold"]).eq("is_demo", false).limit(5000),
      supabase.from("categories").select("slug").eq("active", true),
    ]);
    return [
      ...staticPages,
      ...(categories ?? []).map((c) => ({ url: `${SITE_URL}/shop?category=${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
      ...(products ?? []).map((p) => ({ url: `${SITE_URL}/shop/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "weekly" as const, priority: 0.7 })),
    ];
  } catch {
    return staticPages;
  }
}
