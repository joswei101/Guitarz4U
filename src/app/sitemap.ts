import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ["", "/shop", "/sell", "/repairs", "/how-it-works", "/about", "/reviews", "/faq", "/contact", "/policies", "/privacy", "/terms"].map(
    (path) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: path === "/shop" || path === "" ? ("daily" as const) : ("monthly" as const), priority: path === "" ? 1 : 0.7 }),
  );
  if (!isSupabaseConfigured()) return staticPages;

  // Public data only, via the anonymous key (row level security applies).
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("slug, updated_at").in("status", ["published", "reserved"]).limit(5000),
    supabase.from("categories").select("slug"),
  ]);
  return [
    ...staticPages,
    ...((categories ?? []) as { slug: string }[]).map((c) => ({ url: `${SITE_URL}/shop/category/${c.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...((products ?? []) as { slug: string; updated_at: string }[]).map((p) => ({ url: `${SITE_URL}/shop/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
