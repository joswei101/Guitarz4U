import Link from 'next/link';
import { CATEGORY_SINGULAR, CONDITIONS, label, type Category } from '@/lib/labels';
import { formatZAR } from '@/lib/format';
import { imageUrl, sortImages, type ProductWithImages } from '@/lib/products';

export function AvailabilityBadge({ status }: { status: string }) {
  if (status === 'available') return <span className="badge badge-good">Available</span>;
  if (status === 'reserved') return <span className="badge badge-warn">Reserved</span>;
  if (status === 'sold') return <span className="badge badge-bad">Sold</span>;
  return <span className="badge badge-muted">{status}</span>;
}

export function ProductCard({ product, headingLevel = 3 }: { product: ProductWithImages; headingLevel?: 2 | 3 }) {
  const img = sortImages(product.product_images)[0];
  const src = imageUrl(img?.thumb_path ?? img?.path);
  const name = `${product.brand} ${product.model}`;
  const H = `h${headingLevel}` as 'h2' | 'h3';
  return (
    <article className={`product-card${product.status === 'sold' ? ' is-sold' : ''}`}>
      <div className="media">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={img?.alt || name} loading="lazy" decoding="async" width={img?.width ?? 600} height={img?.height ?? 750} />
        ) : (
          <div className="placeholder">Photo coming soon</div>
        )}
      </div>
      <div className="badges">
        <AvailabilityBadge status={product.status} />
        {product.is_featured && product.status !== 'sold' ? <span className="badge badge-dark">Featured</span> : null}
        {product.is_new_arrival && product.status !== 'sold' ? <span className="badge badge-info">New arrival</span> : null}
      </div>
      <div className="body">
        <H style={{ margin: 0, fontSize: 'inherit' }}>
          <Link className="title" href={`/shop/${product.slug}`}>{name}</Link>
        </H>
        <div className="meta">
          {CATEGORY_SINGULAR[product.category as Category]} · {label(CONDITIONS, product.condition)} condition
        </div>
        <div className="price">{product.status === 'sold' ? <span className="muted">Sold</span> : formatZAR(product.price)}</div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, headingLevel }: { products: ProductWithImages[]; headingLevel?: 2 | 3 }) {
  return (
    <div className="product-grid">
      {products.map((p) => <ProductCard key={p.id} product={p} headingLevel={headingLevel} />)}
    </div>
  );
}
