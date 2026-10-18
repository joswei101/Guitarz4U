import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CONDITION_LABELS, PAGE_SIZE, SORTS, parseFilters, searchProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/shop/product-card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const cat = f.category ? await prisma.category.findUnique({ where: { slug: f.category } }) : null;
  const title = cat ? `${cat.name} for sale` : f.category === "left-handed" ? "Left-handed guitars for sale" : "Shop second-hand guitars & equipment";
  return {
    title,
    description: `${title} in Johannesburg. Inspected pre-owned instruments with honest condition ratings, priced in ZAR. Collection in Sandringham.`,
    alternates: { canonical: f.category ? `/shop?category=${f.category}` : "/shop" },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const [categories, result] = await Promise.all([prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), searchProducts(f)]);
  const activeCat = categories.find((c) => c.slug === f.category);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: f.q, category: f.category, condition: f.condition, min: f.min?.toString(), max: f.max?.toString(), sort: f.sort === "newest" ? undefined : f.sort, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  return (
    <>
      <PageHeader eyebrow="Shop" title={activeCat?.name ?? (f.category === "left-handed" ? "Left-handed guitars" : "All guitars & equipment")}>
        Every item is a unique, inspected second-hand instrument or piece of gear. Prices in South African rand. Collection only in Sandringham, Johannesburg.
      </PageHeader>
      <div className="container grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters" className="space-y-6">
          <nav aria-label="Categories">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-bone-dim">Categories</p>
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {[{ slug: undefined, name: "All" }, ...categories, { slug: "left-handed", name: "Left-handed guitars" }].map((c) => {
                const active = (c.slug ?? undefined) === f.category;
                return (
                  <li key={c.slug ?? "all"}>
                    <Link href={qs({ category: c.slug, page: undefined })} aria-current={active ? "page" : undefined}
                      className={cn("block rounded-md px-3 py-1.5 text-sm", active ? "bg-amp font-semibold text-ink" : "bg-ink-700 text-bone-muted hover:text-amp lg:bg-transparent")}>
                      {c.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <form method="get" action="/shop" className="space-y-4 rounded-xl border border-ink-500 bg-ink-800 p-4">
            {f.category && <input type="hidden" name="category" value={f.category} />}
            <div>
              <label htmlFor="q" className="mb-1 block text-sm font-medium">Search</label>
              <Input id="q" name="q" type="search" defaultValue={f.q} placeholder="Brand, model, keyword" />
            </div>
            <div>
              <label htmlFor="condition" className="mb-1 block text-sm font-medium">Condition</label>
              <Select id="condition" name="condition" defaultValue={f.condition ?? ""}>
                <option value="">Any condition</option>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Price (R)</legend>
              <div className="flex items-center gap-2">
                <label htmlFor="min" className="sr-only">Minimum price</label>
                <Input id="min" name="min" type="number" min={0} step={100} defaultValue={f.min} placeholder="Min" />
                <span className="text-bone-dim">–</span>
                <label htmlFor="max" className="sr-only">Maximum price</label>
                <Input id="max" name="max" type="number" min={0} step={100} defaultValue={f.max} placeholder="Max" />
              </div>
            </fieldset>
            <div>
              <label htmlFor="sort" className="mb-1 block text-sm font-medium">Sort by</label>
              <Select id="sort" name="sort" defaultValue={f.sort}>
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Apply</Button>
              <ButtonLink href={f.category ? `/shop?category=${f.category}` : "/shop"} variant="ghost">Reset</ButtonLink>
            </div>
          </form>
        </aside>
        <section aria-label="Products" aria-live="polite">
          <p className="mb-5 text-sm text-bone-muted">
            {result.total} item{result.total === 1 ? "" : "s"}{f.q ? <> matching “<span className="text-bone">{f.q}</span>”</> : null}
          </p>
          {result.items.length ? (
            <ProductGrid products={result.items} />
          ) : (
            <EmptyState title="Nothing matches — yet" action={<ButtonLink href="/shop" variant="outline">Clear filters</ButtonLink>}>
              Stock changes often. Try fewer filters, or WhatsApp us what you're looking for and we'll keep an eye out.
            </EmptyState>
          )}
          {result.pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
              {result.page > 1 && <ButtonLink href={qs({ page: String(result.page - 1) })} variant="outline" size="sm">← Previous</ButtonLink>}
              <span className="px-3 text-sm text-bone-muted">Page {result.page} of {result.pages}</span>
              {result.page < result.pages && <ButtonLink href={qs({ page: String(result.page + 1) })} variant="outline" size="sm">Next →</ButtonLink>}
            </nav>
          )}
          <p className="sr-only">{PAGE_SIZE} items per page</p>
        </section>
      </div>
    </>
  );
}
