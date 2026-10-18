import { query, queryOne } from "./db";
import { publicImageUrl } from "./storage";

export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  model: string;
  category: string;
  categorySlug: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  condition: string;
  status: "published" | "reserved";
  featured: boolean;
  isDemo: boolean;
  createdAt: string;
  image: { url: string; alt: string } | null;
};

export type ProductDetail = ProductCard & {
  description: string;
  defects: string;
  history: string;
  categoryId: number;
  images: { id: string; url: string; alt: string; width: number | null; height: number | null }[];
};

const CARD_SELECT = `
  p.id, p.slug, p.title, b.name as brand, p.model, c.name as category, c.slug as category_slug,
  p.price_cents, p.compare_at_price_cents, p.condition, p.status, p.featured, p.is_demo, p.created_at,
  (select json_build_object('key', i.storage_key, 'alt', i.alt_text) from product_images i
    where i.product_id = p.id order by i.sort_order, i.created_at limit 1) as image`;

type CardRow = {
  id: string; slug: string; title: string; brand: string | null; model: string; category: string; category_slug: string;
  price_cents: number; compare_at_price_cents: number | null; condition: string; status: "published" | "reserved";
  featured: boolean; is_demo: boolean; created_at: Date; image: { key: string; alt: string } | null;
};

function toCard(r: CardRow): ProductCard {
  return {
    id: r.id, slug: r.slug, title: r.title, brand: r.brand, model: r.model, category: r.category,
    categorySlug: r.category_slug, priceCents: r.price_cents, compareAtPriceCents: r.compare_at_price_cents,
    condition: r.condition, status: r.status, featured: r.featured, isDemo: r.is_demo,
    createdAt: r.created_at.toISOString(),
    image: r.image ? { url: publicImageUrl(r.image.key), alt: r.image.alt || r.title } : null,
  };
}

export type ShopFilters = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  min?: number;
  max?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  offers?: boolean;
  available?: boolean;
  page?: number;
};

export const PAGE_SIZE = 24;

/** Public listing: only published and reserved items. Drafts, sold and archived stay private. */
export async function listProducts(f: ShopFilters) {
  const where = ["p.status in ('published','reserved')"];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (f.q) {
    params.push(f.q);
    const n = params.length;
    where.push(`(to_tsvector('english', p.title || ' ' || p.model || ' ' || p.description) @@ plainto_tsquery('english', $${n})
      or p.title ilike '%' || $${n} || '%' or b.name ilike '%' || $${n} || '%' or p.model ilike '%' || $${n} || '%')`);
  }
  if (f.category) add("c.slug = ?", f.category);
  if (f.brand) add("b.slug = ?", f.brand);
  if (f.condition) add("p.condition = ?", f.condition);
  if (f.min !== undefined) add("p.price_cents >= ?", f.min);
  if (f.max !== undefined) add("p.price_cents <= ?", f.max);
  if (f.offers) where.push("p.compare_at_price_cents is not null");
  if (f.available) where.push("p.status = 'published'");
  const order =
    f.sort === "price_asc" ? "p.price_cents asc" : f.sort === "price_desc" ? "p.price_cents desc" : "p.created_at desc";
  const page = Math.max(1, f.page ?? 1);
  const whereSql = where.join(" and ");
  const from = `from products p join categories c on c.id = p.category_id left join brands b on b.id = p.brand_id`;
  const [rows, count] = await Promise.all([
    query<CardRow>(
      `select ${CARD_SELECT} ${from} where ${whereSql} order by ${order}, p.id limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
      params,
    ),
    queryOne<{ n: number }>(`select count(*)::int as n ${from} where ${whereSql}`, params),
  ]);
  return { products: rows.map(toCard), total: count?.n ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getFeaturedProducts(limit = 6) {
  const rows = await query<CardRow>(
    `select ${CARD_SELECT} from products p join categories c on c.id = p.category_id left join brands b on b.id = p.brand_id
     where p.status in ('published','reserved') order by p.featured desc, p.created_at desc limit $1`,
    [limit],
  );
  return rows.map(toCard);
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await query<CardRow>(
    `select ${CARD_SELECT} from products p join categories c on c.id = p.category_id left join brands b on b.id = p.brand_id
     where p.id = any($1::uuid[]) and p.status in ('published','reserved')`,
    [ids],
  );
  return rows.map(toCard);
}

export async function getRelatedProducts(productId: string, categoryId: number, limit = 4) {
  const rows = await query<CardRow>(
    `select ${CARD_SELECT} from products p join categories c on c.id = p.category_id left join brands b on b.id = p.brand_id
     where p.status = 'published' and p.id <> $1 order by (p.category_id = $2) desc, p.created_at desc limit $3`,
    [productId, categoryId, limit],
  );
  return rows.map(toCard);
}

/** Public product detail. Never selects the serial number. */
export async function getPublicProduct(slug: string): Promise<(ProductDetail & { rawStatus: string }) | null> {
  const r = await queryOne<CardRow & { description: string; defects: string; history: string; category_id: number }>(
    `select ${CARD_SELECT}, p.description, p.defects, p.history, p.category_id
     from products p join categories c on c.id = p.category_id left join brands b on b.id = p.brand_id
     where p.slug = $1`,
    [slug],
  );
  if (!r) return null;
  const images = await query<{ id: string; storage_key: string; alt_text: string; width: number | null; height: number | null }>(
    "select id, storage_key, alt_text, width, height from product_images where product_id=$1 order by sort_order, created_at",
    [r.id],
  );
  return {
    ...toCard(r),
    rawStatus: r.status,
    description: r.description,
    defects: r.defects,
    history: r.history,
    categoryId: r.category_id,
    images: images.map((i) => ({ id: i.id, url: publicImageUrl(i.storage_key), alt: i.alt_text || r.title, width: i.width, height: i.height })),
  };
}

export async function getCategories() {
  return query<{ id: number; slug: string; name: string; description: string }>(
    "select id, slug, name, description from categories order by sort_order",
  );
}

export async function getBrandsInStock() {
  return query<{ slug: string; name: string; n: number }>(
    `select b.slug, b.name, count(p.id)::int as n from brands b join products p on p.brand_id = b.id
     where p.status in ('published','reserved') group by b.id order by b.name`,
  );
}
