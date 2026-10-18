import type { Metadata } from "next";
import { Suspense } from "react";
import { SlidersHorizontal } from "lucide-react";
import { getBrands, getCategories, searchProducts, type ShopParams } from "@/lib/data/products";
import { ProductGrid } from "@/components/shop/ProductCard";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { SortSelect } from "@/components/shop/SortSelect";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const sp = await searchParams;
  const category = one(sp.category);
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === category);
  const title = cat ? `Second-hand ${cat.name.toLowerCase()} for sale` : "Shop second-hand guitars & equipment";
  return {
    title,
    description: cat?.description
      ? `${cat.description} Personally checked and honestly described by Guitarz4U, Johannesburg.`
      : "Browse pre-owned electric, bass, acoustic and classical guitars and selected equipment. Honest condition grades, prices in rand, based in Johannesburg.",
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" },
    robots: sp.q || sp.min || sp.max || sp.page ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const sp = await searchParams;
  const availability = (["available", "all", "sold"].includes(one(sp.availability)) ? one(sp.availability) : "available") as
    ShopParams["availability"];
  const sort = (["newest", "price_asc", "price_desc", "brand"].includes(one(sp.sort)) ? one(sp.sort) : "newest") as
    ShopParams["sort"];
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1);
  const num = (v: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  const params: ShopParams = {
    q: one(sp.q).slice(0, 80),
    category: one(sp.category),
    brand: one(sp.brand),
    conditions: many(sp.condition).slice(0, 6),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    availability,
    sort,
    offersOnly: one(sp.offers) === "1",
    page,
    perPage: 24,
  };

  const [{ products, total, error }, categories, brands] = await Promise.all([
    searchProducts(params),
    getCategories(),
    getBrands(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / 24));
  const cat = categories.find((c) => c.slug === params.category);
  const filtersActive = Boolean(
    params.q || params.category || params.brand || params.conditions?.length || params.min || params.max || params.offersOnly,
  );

  const makeHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const val of many(v)) next.append(k, val);
    next.set("page", String(p));
    return `/shop?${next.toString()}`;
  };

  const filters = (
    <ShopFilters
      categories={categories.filter((c) => c.active)}
      brands={brands}
      current={{
        q: params.q ?? "",
        category: params.category ?? "",
        brand: params.brand ?? "",
        conditions: params.conditions ?? [],
        min: one(sp.min),
        max: one(sp.max),
        availability: availability!,
        sort: sort!,
        offers: Boolean(params.offersOnly),
      }}
    />
  );

  return (
    <>
      <section className="grain border-b border-gold/30 bg-cream-2">
        <div className="container-page py-8 md:py-10">
          <p className="eyebrow">{availability === "sold" ? "Sold archive" : "The shop"}</p>
          <h1 className="mt-1 text-3xl md:text-4xl">
            {availability === "sold" ? "Recently sold" : cat ? cat.name : "Second-hand guitars & equipment"}
          </h1>
          <p className="mt-2 max-w-2xl text-walnut/80">
            {availability === "sold"
              ? "A record of instruments that have found new homes. These items are no longer available."
              : "Every item is pre-owned and personally checked. Please read each description carefully — second-hand instruments may show wear or disclosed defects."}
          </p>
        </div>
      </section>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-5">{filters}</div>
        </aside>
        <div>
          <details className="card mb-5 p-4 lg:hidden">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters {filtersActive && <span className="badge badge-gold">On</span>}
            </summary>
            <div className="mt-4">{filters}</div>
          </details>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-tan" aria-live="polite">
              {total} {total === 1 ? "item" : "items"}
              {params.q ? ` matching “${params.q}”` : ""}
            </p>
            <Suspense>
              <SortSelect value={sort!} />
            </Suspense>
          </div>
          {error ? (
            <Alert tone="error" title="We couldn't load the shop right now">
              Please refresh the page in a moment. If the problem continues, contact us on WhatsApp.
            </Alert>
          ) : products.length ? (
            <>
              <ProductGrid products={products} priorityCount={4} />
              <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
            </>
          ) : (
            <EmptyState
              title={filtersActive ? "No items match your filters" : availability === "sold" ? "No sold items yet" : "No items listed right now"}
              action={filtersActive ? { href: "/shop", label: "Clear filters" } : { href: "/contact", label: "Tell us what you're looking for" }}
            >
              {filtersActive
                ? "Try removing a filter or searching for something broader."
                : "New stock is added regularly. Let us know what you're after and we'll keep an eye out."}
            </EmptyState>
          )}
        </div>
      </div>
      <RecentlyViewed />
    </>
  );
}
