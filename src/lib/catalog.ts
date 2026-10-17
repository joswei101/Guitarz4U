import type { ConditionRating, Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "./db";
import { publicProductWhere } from "./shop/inventory";

export const CONDITION_LABELS: Record<ConditionRating, string> = {
  MINT: "Mint",
  EXCELLENT: "Excellent",
  VERY_GOOD: "Very good",
  GOOD: "Good",
  FAIR: "Fair",
  FOR_REPAIR: "For repair / project",
};

export const CONDITION_DESCRIPTIONS: Record<ConditionRating, string> = {
  MINT: "Little or no visible wear; plays and functions as new.",
  EXCELLENT: "Light signs of use only; fully functional and well set up.",
  VERY_GOOD: "Normal cosmetic wear such as light scratches or buckle rash; fully functional.",
  GOOD: "Noticeable wear and/or minor non-structural issues, all disclosed in the notes; plays well.",
  FAIR: "Heavy wear and/or functional issues disclosed in the notes; priced accordingly.",
  FOR_REPAIR: "Sold as a project or for parts. Known faults are described; not guaranteed to be playable.",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Draft (hidden)",
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  UNAVAILABLE: "Unavailable",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SORTS = {
  newest: { label: "Newest", orderBy: { publishedAt: "desc" } },
  "price-asc": { label: "Price: low to high", orderBy: { priceCents: "asc" } },
  "price-desc": { label: "Price: high to low", orderBy: { priceCents: "desc" } },
  brand: { label: "Brand A–Z", orderBy: { brand: "asc" } },
} as const satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }>;

export type SortKey = keyof typeof SORTS;

export interface ShopFilters {
  q?: string;
  category?: string;
  condition?: ConditionRating;
  min?: number; // rand
  max?: number; // rand
  sort?: SortKey;
  page?: number;
  leftHanded?: boolean;
}

export const PAGE_SIZE = 12;

export const productCardSelect = {
  id: true,
  slug: true,
  title: true,
  brand: true,
  model: true,
  priceCents: true,
  salePriceCents: true,
  condition: true,
  status: true,
  isLeftHanded: true,
  publishedAt: true,
  category: { select: { name: true, slug: true } },
  media: { orderBy: { sortOrder: "asc" }, take: 2, select: { fileId: true, altText: true, file: { select: { kind: true } } } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export function buildShopWhere(f: ShopFilters): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [publicProductWhere];
  if (f.category === "left-handed") and.push({ isLeftHanded: true });
  else if (f.category) and.push({ category: { slug: f.category } });
  if (f.leftHanded) and.push({ isLeftHanded: true });
  if (f.condition) and.push({ condition: f.condition });
  // Price filters apply to the effective price (sale price when set).
  if (f.min != null) and.push({ OR: [{ salePriceCents: { gte: Math.round(f.min * 100) } }, { salePriceCents: null, priceCents: { gte: Math.round(f.min * 100) } }] });
  if (f.max != null) and.push({ OR: [{ salePriceCents: { lte: Math.round(f.max * 100) } }, { salePriceCents: null, priceCents: { lte: Math.round(f.max * 100) } }] });
  if (f.q?.trim()) {
    const terms = f.q.trim().split(/\s+/).slice(0, 6);
    for (const t of terms) {
      and.push({ OR: [{ title: { contains: t, mode: "insensitive" } }, { brand: { contains: t, mode: "insensitive" } }, { model: { contains: t, mode: "insensitive" } }, { description: { contains: t, mode: "insensitive" } }] });
    }
  }
  return { AND: and };
}

export async function searchProducts(f: ShopFilters) {
  const where = buildShopWhere(f);
  const page = Math.max(1, f.page ?? 1);
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, select: productCardSelect, orderBy: [SORTS[f.sort ?? "newest"].orderBy, { id: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { total, items, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): ShopFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const num = (k: string) => {
    const v = one(k);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const cond = one("condition");
  const sort = one("sort");
  return {
    q: one("q")?.slice(0, 100),
    category: one("category")?.slice(0, 60),
    condition: cond && cond in CONDITION_LABELS ? (cond as ConditionRating) : undefined,
    min: num("min"),
    max: num("max"),
    sort: sort && sort in SORTS ? (sort as SortKey) : "newest",
    page: num("page") ? Math.floor(num("page")!) : 1,
    leftHanded: one("lh") === "1",
  };
}
