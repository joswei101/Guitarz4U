import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type FunctionalStatus, type ProductCondition, type ProductStatus } from "@/lib/constants";

export type ProductImage = { id?: string; storage_path: string; alt_text: string | null; sort_order: number };

export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  model: string | null;
  price: number;
  compare_at_price: number | null;
  condition: ProductCondition;
  functional_status: FunctionalStatus;
  status: ProductStatus;
  is_featured: boolean;
  is_demo: boolean;
  created_at: string;
  category: { id: number; slug: string; name: string } | null;
  brand: { id: number; name: string; slug: string } | null;
  images: ProductImage[];
};

export type ProductDetail = ProductSummary & {
  description: string;
  defects: string;
  history: string;
  specifications: string;
  included_items: string;
  year_made: string | null;
  colour: string | null;
  published_at: string | null;
  updated_at: string;
};

export const PRODUCT_SUMMARY_SELECT =
  "id, slug, title, model, price, compare_at_price, condition, functional_status, status, is_featured, is_demo, created_at, category:categories(id, slug, name), brand:brands(id, name, slug), images:product_images(id, storage_path, alt_text, sort_order)";

export const PRODUCT_DETAIL_SELECT = `${PRODUCT_SUMMARY_SELECT}, description, defects, history, specifications, included_items, year_made, colour, published_at, updated_at`;

function normalise<T extends ProductSummary>(row: T): T {
  return {
    ...row,
    price: Number(row.price),
    compare_at_price: row.compare_at_price === null ? null : Number(row.compare_at_price),
    images: [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export type ShopFilters = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  min?: string;
  max?: string;
  sort?: string;
  availability?: string;
  offers?: string;
  page?: string;
};

/** Removes characters that have meaning in PostgREST filter syntax. */
export function sanitiseSearch(input: string) {
  return input.replace(/[%_,.()*\\:"'`]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, slug, name, description").order("sort_order");
  return (data ?? []) as { id: number; slug: string; name: string; description: string | null }[];
});

export const getBrands = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("id, name, slug").order("name");
  return (data ?? []) as { id: number; name: string; slug: string }[];
});

export async function searchProducts(filters: ShopFilters) {
  const supabase = await createClient();
  const page = Math.max(1, Number.parseInt(filters.page || "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("products")
    .select(PRODUCT_SUMMARY_SELECT, { count: "exact" })
    .in("status", filters.availability === "available" ? ["published"] : ["published", "reserved"]);

  if (filters.category) {
    const categories = await getCategories();
    const cat = categories.find((c) => c.slug === filters.category);
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (filters.brand) {
    const brands = await getBrands();
    const brand = brands.find((b) => b.slug === filters.brand);
    if (brand) query = query.eq("brand_id", brand.id);
  }
  if (filters.condition) {
    const conditions = filters.condition.split(",").filter(Boolean);
    if (conditions.length) query = query.in("condition", conditions);
  }
  const min = Number(filters.min);
  const max = Number(filters.max);
  if (filters.min && Number.isFinite(min)) query = query.gte("price", min);
  if (filters.max && Number.isFinite(max)) query = query.lte("price", max);
  if (filters.offers === "1") query = query.not("compare_at_price", "is", null);

  if (filters.q) {
    const term = sanitiseSearch(filters.q);
    if (term) {
      const brands = await getBrands();
      const lower = term.toLowerCase();
      const matchingBrandIds = brands.filter((b) => b.name.toLowerCase().includes(lower)).map((b) => b.id);
      const words = term.split(" ").filter(Boolean).slice(0, 5);
      // Every word must match the title, model or description (or the brand).
      for (const word of words) {
        const ors = [`title.ilike.%${word}%`, `model.ilike.%${word}%`, `description.ilike.%${word}%`];
        if (matchingBrandIds.length && words.length === 1) ors.push(`brand_id.in.(${matchingBrandIds.join(",")})`);
        query = query.or(ors.join(","));
      }
    }
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) {
    console.error("searchProducts failed", error);
    return { products: [] as ProductSummary[], total: 0, page, pages: 1, error: true };
  }
  const total = count ?? 0;
  return {
    products: ((data ?? []) as unknown as ProductSummary[]).map(normalise),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    error: false,
  };
}

export async function getFeaturedProducts(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SUMMARY_SELECT)
    .in("status", ["published", "reserved"])
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as ProductSummary[]).map(normalise);
}

export async function getNewestProducts(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SUMMARY_SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as ProductSummary[]).map(normalise);
}

export async function getSpecialOffers(limit = 4) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SUMMARY_SELECT)
    .eq("status", "published")
    .not("compare_at_price", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as ProductSummary[]).map(normalise).filter((p) => (p.compare_at_price ?? 0) > p.price);
}

export const getProductBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_DETAIL_SELECT).eq("slug", slug).maybeSingle();
  return data ? normalise(data as unknown as ProductDetail) : null;
});

export async function getRelatedProducts(product: ProductSummary, limit = 4) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SUMMARY_SELECT)
    .eq("status", "published")
    .neq("id", product.id)
    .eq("category_id", product.category?.id ?? -1)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as ProductSummary[]).map(normalise);
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_SUMMARY_SELECT).in("id", ids.slice(0, 20));
  return ((data ?? []) as unknown as ProductSummary[]).map(normalise);
}
