import Link from "next/link";
import { ProductGrid } from "@/components/shop/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/ui/Icons";
import { NewArrivalAlertButton } from "@/components/shop/AlertButtons";
import { CONDITION_LABELS, SORT_OPTIONS, type ProductCondition } from "@/lib/constants";
import { getBrands, getCategories, searchProducts, type ShopFilters } from "@/lib/data/products";

function buildQuery(base: ShopFilters, overrides: Partial<ShopFilters>) {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function ShopView({
  filters,
  basePath = "/shop",
  lockedCategory,
}: {
  filters: ShopFilters;
  basePath?: string;
  lockedCategory?: string;
}) {
  const effective = { ...filters, category: lockedCategory ?? filters.category };
  const [{ products, total, page, pages, error }, categories, brands] = await Promise.all([
    searchProducts(effective),
    getCategories(),
    getBrands(),
  ]);
  const selectedConditions = (filters.condition ?? "").split(",").filter(Boolean);
  const activeCategory = categories.find((c) => c.slug === effective.category);
  const activeBrand = brands.find((b) => b.slug === filters.brand);
  const hasFilters = Boolean(filters.q || filters.brand || filters.condition || filters.min || filters.max || filters.offers || filters.availability || (!lockedCategory && filters.category));

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[17rem_1fr]">
      {/* Filters */}
      <aside aria-labelledby="filters-heading">
        <form method="get" action={basePath} className="card space-y-5 p-5 lg:sticky lg:top-24" id="search">
          <h2 id="filters-heading" className="font-display text-xl">
            Search &amp; filter
          </h2>
          <div className="field">
            <label htmlFor="q" className="label">
              Search
            </label>
            <div className="relative">
              <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Brand, model, colour…" className="input pr-10" />
              <SearchIcon className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-muted" />
            </div>
          </div>
          {!lockedCategory && (
            <div className="field">
              <label htmlFor="category" className="label">
                Category
              </label>
              <select id="category" name="category" defaultValue={filters.category ?? ""} className="select">
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="brand" className="label">
              Brand
            </label>
            <select id="brand" name="brand" defaultValue={filters.brand ?? ""} className="select">
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="label">Price (R)</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <label className="sr-only" htmlFor="min">
                Minimum price
              </label>
              <input id="min" name="min" type="number" min={0} step={50} inputMode="numeric" placeholder="Min" defaultValue={filters.min} className="input" />
              <label className="sr-only" htmlFor="max">
                Maximum price
              </label>
              <input id="max" name="max" type="number" min={0} step={50} inputMode="numeric" placeholder="Max" defaultValue={filters.max} className="input" />
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Condition</legend>
            <ConditionCheckboxes selected={selectedConditions} />
          </fieldset>
          <fieldset className="space-y-2 text-sm">
            <legend className="label">Show</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="availability" value="available" defaultChecked={filters.availability === "available"} className="h-4 w-4 accent-[var(--color-walnut)]" />
              Available now only (hide reserved)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="offers" value="1" defaultChecked={filters.offers === "1"} className="h-4 w-4 accent-[var(--color-walnut)]" />
              Special offers only
            </label>
          </fieldset>
          <input type="hidden" name="sort" value={filters.sort ?? ""} />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1">
              Apply
            </button>
            {hasFilters && (
              <Link href={basePath} className="btn btn-outline">
                Clear
              </Link>
            )}
          </div>
        </form>
      </aside>

      {/* Results */}
      <section aria-labelledby="results-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="results-heading" className="text-base font-sans font-normal text-ink-soft" aria-live="polite">
            {error ? "We couldn't load the shop right now." : `${total} guitar${total === 1 ? "" : "s"} found`}
            {filters.q ? ` for “${filters.q}”` : ""}
          </h2>
          <nav aria-label="Sort" className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((o) => {
              const active = (filters.sort || "newest") === o.value;
              return (
                <Link
                  key={o.value}
                  href={`${basePath}${buildQuery(filters, { sort: o.value, page: undefined, category: lockedCategory ? undefined : filters.category })}`}
                  className={`rounded-full px-3 py-1.5 text-sm no-underline ${active ? "bg-walnut text-cream-light" : "bg-cream text-walnut hover:bg-gold-light/50"}`}
                  aria-current={active ? "true" : undefined}
                >
                  {o.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {products.length ? (
          <ProductGrid products={products} priorityCount={3} />
        ) : (
          <EmptyState title="No guitars match your search" action={hasFilters ? { href: basePath, label: "Clear filters" } : undefined}>
            <p>
              Try a different search or fewer filters. Stock changes often — you can ask us to let you know when something
              new arrives.
            </p>
          </EmptyState>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={`${basePath}${buildQuery(filters, { page: String(page - 1), category: lockedCategory ? undefined : filters.category })}`} className="btn btn-outline btn-sm" rel="prev">
                Previous
              </Link>
            )}
            <span className="px-3 text-sm text-ink-soft">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link href={`${basePath}${buildQuery(filters, { page: String(page + 1), category: lockedCategory ? undefined : filters.category })}`} className="btn btn-outline btn-sm" rel="next">
                Next
              </Link>
            )}
          </nav>
        )}

        <div className="mt-10">
          <NewArrivalAlertButton categoryId={activeCategory?.id} brandId={activeBrand?.id} label={[activeBrand?.name, activeCategory?.name].filter(Boolean).join(" ") || "any guitar"} />
        </div>
      </section>
    </div>
  );
}

function ConditionCheckboxes({ selected }: { selected: string[] }) {
  // Submitted as repeated "condition" params; the page joins them.
  return (
    <div className="mt-1.5 space-y-1.5 text-sm">
      {(Object.keys(CONDITION_LABELS) as ProductCondition[]).map((c) => (
        <label key={c} className="flex items-center gap-2">
          <input type="checkbox" name="condition" value={c} defaultChecked={selected.includes(c)} className="h-4 w-4 accent-[var(--color-walnut)]" />
          {CONDITION_LABELS[c]}
        </label>
      ))}
    </div>
  );
}

/** Normalises Next.js searchParams into ShopFilters. */
export function toFilters(sp: Record<string, string | string[] | undefined>): ShopFilters {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const condition = sp.condition;
  return {
    q: one("q")?.slice(0, 80),
    category: one("category"),
    brand: one("brand"),
    condition: Array.isArray(condition) ? condition.join(",") : condition,
    min: one("min"),
    max: one("max"),
    sort: one("sort"),
    availability: one("availability"),
    offers: one("offers"),
    page: one("page"),
  };
}
