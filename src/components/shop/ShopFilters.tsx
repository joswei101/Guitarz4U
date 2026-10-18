import Link from "next/link";
import { CONDITIONS } from "@/lib/constants";

type Opt = { slug: string; name: string };

export function ShopFilters({
  categories,
  brands,
  current,
}: {
  categories: Opt[];
  brands: Opt[];
  current: {
    q: string;
    category: string;
    brand: string;
    conditions: string[];
    min: string;
    max: string;
    availability: string;
    sort: string;
    offers: boolean;
  };
}) {
  return (
    <form action="/shop" method="get" className="space-y-5" aria-label="Filter products">
      <div>
        <label htmlFor="f-q" className="label">
          Search
        </label>
        <input id="f-q" name="q" type="search" defaultValue={current.q} className="input" placeholder="Brand, model…" maxLength={80} />
      </div>
      <div>
        <label htmlFor="f-cat" className="label">
          Category
        </label>
        <select id="f-cat" name="category" defaultValue={current.category} className="select">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-brand" className="label">
          Brand
        </label>
        <select id="f-brand" name="brand" defaultValue={current.brand} className="select">
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
        <div className="flex items-center gap-2">
          <label htmlFor="f-min" className="sr-only">
            Minimum price
          </label>
          <input id="f-min" name="min" type="number" min={0} step={100} inputMode="numeric" defaultValue={current.min} placeholder="Min" className="input" />
          <span aria-hidden>–</span>
          <label htmlFor="f-max" className="sr-only">
            Maximum price
          </label>
          <input id="f-max" name="max" type="number" min={0} step={100} inputMode="numeric" defaultValue={current.max} placeholder="Max" className="input" />
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Condition</legend>
        <ul className="space-y-2">
          {CONDITIONS.map((c) => (
            <li key={c.value} className="flex items-start gap-2">
              <input
                id={`f-cond-${c.value}`}
                type="checkbox"
                name="condition"
                value={c.value}
                defaultChecked={current.conditions.includes(c.value)}
                className="checkbox"
              />
              <label htmlFor={`f-cond-${c.value}`} className="text-sm">
                {c.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div>
        <label htmlFor="f-av" className="label">
          Availability
        </label>
        <select id="f-av" name="availability" defaultValue={current.availability} className="select">
          <option value="available">Available &amp; reserved</option>
          <option value="all">Include sold items</option>
          <option value="sold">Sold archive only</option>
        </select>
      </div>
      <div className="flex items-start gap-2">
        <input id="f-offers" type="checkbox" name="offers" value="1" defaultChecked={current.offers} className="checkbox" />
        <label htmlFor="f-offers" className="text-sm">
          Special offers only
        </label>
      </div>
      <input type="hidden" name="sort" value={current.sort} />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          Apply filters
        </button>
        <Link href="/shop" className="btn btn-ghost">
          Reset
        </Link>
      </div>
    </form>
  );
}
