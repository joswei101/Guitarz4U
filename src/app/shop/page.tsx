import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductGrid } from '@/components/ProductCard';
import { StockAlertForm } from '@/components/PublicForms';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { WhatsAppIcon } from '@/components/icons';
import { CATEGORIES, CONDITIONS, type Category } from '@/lib/labels';
import { PAGE_SIZE, expireReservations, listBrands, listShopProducts, type ShopFilters } from '@/lib/products';
import { getSettings } from '@/lib/site';
import { waLink } from '@/lib/whatsapp';

type SP = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const cat = sp.category && sp.category in CATEGORIES ? CATEGORIES[sp.category as Category] : null;
  const title = cat ? `Second-hand ${cat.toLowerCase()} for sale` : 'Shop second-hand guitars';
  // Filtered/search variations point search engines to the main category page.
  return {
    title,
    description: `${title} in Sandringham, Johannesburg. Honest condition notes, prices in rand, collection only. No online payment — reserve or enquire.`,
    alternates: { canonical: cat ? `/shop?category=${sp.category}` : '/shop' },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  await expireReservations();
  const sp = await searchParams;
  const filters: ShopFilters = {
    q: sp.q, category: sp.category && sp.category in CATEGORIES ? sp.category : undefined,
    brand: sp.brand, condition: sp.condition && sp.condition in CONDITIONS ? sp.condition : undefined,
    availability: sp.availability, min: sp.min, max: sp.max, sort: sp.sort, page: sp.page,
  };
  const [{ products, total, page }, brands, settings] = await Promise.all([
    listShopProducts(filters), listBrands(), getSettings(),
  ]);
  const anyFilter = Boolean(filters.q || filters.category || filters.brand || filters.condition || filters.min || filters.max || (filters.availability && filters.availability !== 'all'));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const heading = filters.category ? CATEGORIES[filters.category as Category] : 'All guitars';
  const pageLink = (n: number) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    p.set('page', String(n));
    return `/shop?${p.toString()}`;
  };

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / Shop</nav>
          <h1>{heading}</h1>
          <p>Second-hand guitars, personally checked and honestly described. Prices in rand. Collection only in {settings.collection_area}. No online payment.</p>
        </div>
      </section>
      <div className="section">
        <div className="wrap shop-layout">
          <aside>
            <form className="filters" method="get" action="/shop" role="search" aria-label="Filter guitars">
              <h2>Search &amp; filter</h2>
              <div className="field"><label htmlFor="f-q">Search</label>
                <input id="f-q" type="search" name="q" defaultValue={sp.q} placeholder="Brand, model…" /></div>
              <div className="field"><label htmlFor="f-cat">Type</label>
                <select id="f-cat" name="category" defaultValue={filters.category ?? ''}>
                  <option value="">All types</option>
                  {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
              <div className="field"><label htmlFor="f-brand">Brand</label>
                <select id="f-brand" name="brand" defaultValue={sp.brand ?? ''}>
                  <option value="">All brands</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select></div>
              <div className="field"><label htmlFor="f-cond">Condition</label>
                <select id="f-cond" name="condition" defaultValue={filters.condition ?? ''}>
                  <option value="">Any condition</option>
                  {Object.entries(CONDITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
              <div className="field"><span className="label">Price (R)</span>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <label className="visually-hidden" htmlFor="f-min">Minimum price</label>
                  <input id="f-min" name="min" inputMode="numeric" placeholder="Min" defaultValue={sp.min} />
                  <label className="visually-hidden" htmlFor="f-max">Maximum price</label>
                  <input id="f-max" name="max" inputMode="numeric" placeholder="Max" defaultValue={sp.max} />
                </div></div>
              <div className="field"><label htmlFor="f-av">Availability</label>
                <select id="f-av" name="availability" defaultValue={sp.availability ?? 'all'}>
                  <option value="all">Available &amp; reserved</option>
                  <option value="available">Available only</option>
                  <option value="reserved">Reserved only</option>
                </select></div>
              <div className="field"><label htmlFor="f-sort">Sort by</label>
                <select id="f-sort" name="sort" defaultValue={sp.sort ?? 'newest'}>
                  <option value="newest">Newest listings</option>
                  <option value="price-asc">Price: lowest first</option>
                  <option value="price-desc">Price: highest first</option>
                </select></div>
              <div className="row">
                <button type="submit" className="btn btn-primary btn-small">Apply</button>
                {anyFilter ? <Link href="/shop" className="btn btn-outline btn-small">Clear</Link> : null}
              </div>
              <p className="small" style={{ marginTop: 14 }}><Link href="/sold">See sold guitars →</Link></p>
            </form>
          </aside>
          <div>
            <div className="results-bar">
              <p className="muted" role="status" style={{ margin: 0 }}>
                {total === 0 ? 'No guitars found' : `${total} guitar${total === 1 ? '' : 's'}`}
              </p>
            </div>
            {products.length ? (
              <>
                <ProductGrid products={products} headingLevel={2} />
                {pages > 1 ? (
                  <nav className="row" style={{ justifyContent: 'center', marginTop: 28 }} aria-label="Pages">
                    {page > 1 ? <Link className="btn btn-outline btn-small" href={pageLink(page - 1)}>← Previous</Link> : null}
                    <span className="muted">Page {page} of {pages}</span>
                    {page < pages ? <Link className="btn btn-outline btn-small" href={pageLink(page + 1)}>Next →</Link> : null}
                  </nav>
                ) : null}
              </>
            ) : (
              <div className="empty-state">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/logo-mark.svg" alt="" width={72} height={72} />
                {anyFilter ? (
                  <>
                    <h2>No guitars match your search</h2>
                    <p>Try removing a filter, or ask us to let you know when something similar comes in.</p>
                    <Link href="/shop" className="btn btn-outline">Show all guitars</Link>
                  </>
                ) : (
                  <>
                    <h2>The shop is restocking</h2>
                    <p>There are no guitars for sale right now. New second-hand guitars are added as soon as they have been checked. Leave your email below and we&apos;ll let you know, or tell us on WhatsApp what you&apos;re looking for.</p>
                    <a className="btn btn-whatsapp" href={waLink(settings.whatsapp_international, "Hi Guitarz4U, I'm looking for a guitar:")} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> WhatsApp us</a>
                  </>
                )}
              </div>
            )}
            <div className="card" style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: '1.3rem' }}>Looking for something specific?</h2>
              <p className="muted">Get an email when a matching guitar is listed.</p>
              <StockAlertForm />
            </div>
            <RecentlyViewed />
          </div>
        </div>
      </div>
    </>
  );
}
