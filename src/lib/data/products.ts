import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  model: string | null;
  price: number;
  compare_at_price: number | null;
  condition: string;
  status: string;
  featured: boolean;
  is_demo: boolean;
  quantity: number;
  brand_name: string | null;
  category_name: string | null;
  image_path: string | null;
  image_alt: string | null;
};

export type ShopParams = {
  q?: string;
  category?: string;
  brand?: string;
  conditions?: string[];
  min?: number;
  max?: number;
  availability?: "available" | "all" | "sold";
  sort?: "newest" | "price_asc" | "price_desc" | "brand";
  featuredOnly?: boolean;
  offersOnly?: boolean;
  page?: number;
  perPage?: number;
};

export async function searchProducts(params: ShopParams) {
  const supabase = await createClient();
  const perPage = params.perPage ?? 24;
  const page = Math.max(1, params.page ?? 1);
  const { data, error } = await supabase.rpc("search_products", {
    p_q: params.q || undefined,
    p_category: params.category || undefined,
    p_brand: params.brand || undefined,
    p_conditions: params.conditions?.length ? params.conditions : undefined,
    p_min: params.min,
    p_max: params.max,
    p_availability: params.availability ?? "available",
    p_sort: params.sort ?? "newest",
    p_featured_only: params.featuredOnly ?? false,
    p_offers_only: params.offersOnly ?? false,
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
  });
  if (error) {
    console.error("search_products failed", error);
    return { products: [] as ProductCardData[], total: 0, error: true };
  }
  const rows = (data ?? []) as unknown as (ProductCardData & { total_count: number })[];
  return { products: rows as ProductCardData[], total: rows[0]?.total_count ?? 0, error: false };
}

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description, kind, sort_order, active")
    .order("sort_order");
  return data ?? [];
});

export const getBrands = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("id, name, slug").order("name");
  return data ?? [];
});

export const getProductBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "*, brand:brands(id, name, slug), category:categories(id, name, slug), images:product_images(id, storage_path, alt_text, sort_order, width, height)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (data?.images) data.images.sort((a, b) => a.sort_order - b.sort_order);
  return data;
});

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, slug, title, price, compare_at_price, condition, status, quantity, is_demo, images:product_images(storage_path, alt_text, sort_order)")
    .in("id", ids.slice(0, 40));
  return (data ?? []).map((p) => {
    const img = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return { ...p, image_path: img?.storage_path ?? null, image_alt: img?.alt_text ?? null };
  });
}
