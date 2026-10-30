import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductGrid } from '@/components/ProductCard';
import { PageHero } from '@/components/PageHero';
import { PAGE_SIZE, listSold } from '@/lib/products';

export const metadata: Metadata = {
  title: 'Sold guitar archive',
  description: 'Guitars previously sold by Guitarz4U in Sandringham, Johannesburg.',
  alternates: { canonical: '/sold' },
};

export default async function SoldPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { products, total } = await listSold(page);
  const pages = Math.ceil(total / PAGE_SIZE);
  return (
    <>
      <PageHero title="Sold guitar archive" intro="Guitars that have found new homes. Looking for something similar? Ask to be notified when new stock arrives." />
      <div className="section">
        <div className="wrap">
          {products.length ? <ProductGrid products={products} headingLevel={2} /> : (
            <div className="empty-state">
              <h2>No sold guitars yet</h2>
              <p>Sold guitars will be listed here for reference.</p>
              <Link href="/shop" className="btn btn-outline">Go to the shop</Link>
            </div>
          )}
          {pages > 1 ? (
            <nav className="row" style={{ justifyContent: 'center', marginTop: 24 }} aria-label="Pages">
              {page > 1 ? <Link className="btn btn-outline btn-small" href={`/sold?page=${page - 1}`}>← Previous</Link> : null}
              <span className="muted">Page {page} of {pages}</span>
              {page < pages ? <Link className="btn btn-outline btn-small" href={`/sold?page=${page + 1}`}>Next →</Link> : null}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
