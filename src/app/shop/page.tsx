import type { Metadata } from "next";
import Link from "next/link";
import { listProducts, getCategories, getBrandsInStock, type ShopFilters } from "@/lib/products";
import { CONDITIONS } from "@/lib/format";
import { ProductCard } from "@/components/ProductCard";
import { expireOverdueReservations } from "@/lib/reservations";
import { PageHead, Empty } from "@/components/ui";
import { RecentlyViewed } from "@/components/RecentlyViewed";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function parseFilters(sp: SP): ShopFilters {
  const num = (v: string) => {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
  };
  const sort = one(sp.sort);
  return {
    q: one(sp.q).trim().slice(0, 100) || undefined,
    category: one(sp.category) || undefined,
    brand: one(sp.brand) || undefined,
    condition: one(sp.condition) in CONDITIONS ? one(sp.condition) : undefined,
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
    offers: one(sp.offers) === "1",
    available: one(sp.available) === "1",
    page: Math.max(1, parseInt(one(sp.page) || "1", 10) || 1),
  };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === one(sp.category));
  const title = cat ? `Second-hand ${cat.name.toLowerCase()} for sale` : "Shop second-hand guitars";
  return {
    title,
    description: `${title} in Johannesburg, South Africa. Honest condition reports, disclosed defects and prices in rand. Purchase requests with private EFT — no online payments.`,
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : "/shop" },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  await expireOverdueReservations().catch((e) => console.error("[reservations]", e));
  const sp = await searchParams;
  const f = parseFilters(sp);
  const [{ products, total, page, pageSize }, categories, brands] = await Promise.all([
    listProducts(f),
    getCategories(),
    getBrandsInStock(),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)])), ...patch })) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  const currentCat = categories.find((c) => c.slug === f.category);

  return (
    <>
      <PageHead
        title={currentCat ? currentCat.name : "Shop guitars"}
        eyebrow="Second-hand stock"
        intro="Every guitar is pre-owned and listed with its condition and known defects. Send a purchase request — we confirm availability and arrange payment privately."
        crumbs={[{ href: currentCat ? "/shop" : undefined, label: "Shop" }, ...(currentCat ? [{ label: currentCat.name }] : [])]}
      />
      <div className="wrap section-tight">
        <nav className="chips" aria-label="Categories" style={{ marginBottom: 20 }}>
          <Link className="chip" href={qs({ category: undefined, page: undefined })} aria-current={!f.category ? "true" : undefined}>All</Link>
          {categories.map((c) => (
            <Link key={c.slug} className="chip" href={qs({ category: c.slug, page: undefined })} aria-current={f.category === c.slug ? "true" : undefined}>
              {c.name}
            </Link>
          ))}
          <Link className="chip" href={qs({ offers: f.offers ? undefined : "1", page: undefined })} aria-current={f.offers ? "true" : undefined}>Special offers</Link>
        </nav>
        <div className="shop-layout">
          <aside className="filters card-flat" aria-label="Filters">
            <form action="/shop" method="get">
              {f.category && <input type="hidden" name="category" value={f.category} />}
              {f.offers && <input type="hidden" name="offers" value="1" />}
              <div className="field">
                <label htmlFor="q">Search</label>
                <input id="q" name="q" type="search" defaultValue={f.q} placeholder="Brand, model, keyword" />
              </div>
              <div className="field">
                <label htmlFor="brand">Brand</label>
                <select id="brand" name="brand" defaultValue={f.brand ?? ""}>
                  <option value="">All brands</option>
                  {brands.map((b) => <option key={b.slug} value={b.slug}>{b.name} ({b.n})</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="condition">Condition</label>
                <select id="condition" name="condition" defaultValue={f.condition ?? ""}>
                  <option value="">Any condition</option>
                  {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <fieldset className="field">
                <legend>Price (R)</legend>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <label className="sr-only" htmlFor="min">Minimum price</label>
                  <input id="min" name="min" type="number" min={0} step={100} placeholder="Min" defaultValue={f.min !== undefined ? f.min / 100 : ""} />
                  <span aria-hidden>–</span>
                  <label className="sr-only" htmlFor="max">Maximum price</label>
                  <input id="max" name="max" type="number" min={0} step={100} placeholder="Max" defaultValue={f.max !== undefined ? f.max / 100 : ""} />
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="sort">Sort by</label>
                <select id="sort" name="sort" defaultValue={f.sort}>
                  <option value="newest">Newest listings</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
              </div>
              <label className="check" style={{ marginBottom: 16 }}>
                <input type="checkbox" name="available" value="1" defaultChecked={f.available} /> Hide reserved items
              </label>
              <button className="btn btn-primary btn-block" type="submit">Apply filters</button>
              <Link href="/shop" className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>Clear all</Link>
            </form>
          </aside>
          <div>
            <div className="toolbar">
              <p className="muted" style={{ margin: 0 }} aria-live="polite">
                {total} {total === 1 ? "guitar" : "guitars"}{f.q ? <> matching “{f.q}”</> : null}
              </p>
            </div>
            {products.length > 0 ? (
              <div className="product-grid">
                {products.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 2} />)}
              </div>
            ) : (
              <Empty title="No guitars match your search">
                <p className="muted">Try removing a filter, or tell us what you are looking for and we will keep an eye out.</p>
                <div className="row" style={{ justifyContent: "center" }}>
                  <Link href="/shop" className="btn btn-outline btn-sm">Clear filters</Link>
                  <Link href="/contact" className="btn btn-primary btn-sm">Ask us to find one</Link>
                </div>
              </Empty>
            )}
            {pages > 1 && (
              <nav className="pagination" aria-label="Pagination">
                {page > 1 && <Link className="btn btn-ghost btn-sm" href={qs({ page: String(page - 1) })}>← Previous</Link>}
                <span className="btn btn-sm" aria-current="page">Page {page} of {pages}</span>
                {page < pages && <Link className="btn btn-ghost btn-sm" href={qs({ page: String(page + 1) })}>Next →</Link>}
              </nav>
            )}
            <RecentlyViewed />
          </div>
        </div>
      </div>
    </>
  );
}
