import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addToCart, toggleWishlist } from '@/app/actions/public';
import { Gallery } from '@/components/Gallery';
import { AvailabilityBadge, ProductGrid } from '@/components/ProductCard';
import { ContactForm, OfferForm, ReserveForm, StockAlertForm } from '@/components/PublicForms';
import { RecentlyViewed, TrackView } from '@/components/RecentlyViewed';
import { HeartIcon, WhatsAppIcon } from '@/components/icons';
import { SubmitButton } from '@/components/forms';
import { getProfile, getUser } from '@/lib/auth';
import { readCart } from '@/lib/cart';
import { SITE_URL } from '@/lib/env';
import { formatDate, formatDateTime, formatZAR } from '@/lib/format';
import { CATEGORY_SINGULAR, CONDITIONS, label, type Category } from '@/lib/labels';
import { expireReservations, getProductBySlug, imageUrl, listRelated, sortImages } from '@/lib/products';
import { getSettings } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { waLink } from '@/lib/whatsapp';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await expireReservations();
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: 'Guitar not found', robots: { index: false } };
  const name = `${p.brand} ${p.model}`;
  const img = sortImages(p.product_images)[0];
  const desc = `${CATEGORY_SINGULAR[p.category as Category]} in ${label(CONDITIONS, p.condition).toLowerCase()} condition — ${p.status === 'sold' ? 'sold' : formatZAR(p.price)}. Second-hand, collection in Sandringham, Johannesburg.`;
  return {
    title: `${name}${p.status === 'sold' ? ' (sold)' : ''}`,
    description: desc,
    alternates: { canonical: `/shop/${p.slug}` },
    robots: ['available', 'reserved', 'sold'].includes(p.status) ? undefined : { index: false, follow: false },
    openGraph: { title: name, description: desc, images: img ? [{ url: imageUrl(img.path)!, alt: img.alt || name }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  await expireReservations();
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [user, profile, settings, related, cart] = await Promise.all([
    getUser(), getProfile(), getSettings(), listRelated(product), readCart(),
  ]);
  const supabase = await createClient();
  const [{ data: wish }, { data: myRes }] = await Promise.all([
    user ? supabase.from('wishlist_items').select('product_id').eq('product_id', product.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from('reservations').select('ref, expires_at').eq('product_id', product.id).eq('user_id', user.id).eq('status', 'active').maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const name = `${product.brand} ${product.model}`;
  const isPublic = ['available', 'reserved', 'sold'].includes(product.status);
  const images = sortImages(product.product_images).map((i) => ({
    src: imageUrl(i.path)!, thumb: imageUrl(i.thumb_path ?? i.path)!, alt: i.alt || name, width: i.width, height: i.height,
  }));
  const inCart = cart.includes(product.id);
  const canEnquire = product.status === 'available' || (product.status === 'reserved' && Boolean(myRes));
  const defaults = { name: profile?.full_name ?? undefined, email: user?.email ?? undefined, phone: profile?.whatsapp ?? undefined };
  const waMsg = `Hi Guitarz4U, I'm interested in the ${name} (${product.ref}) listed at ${formatZAR(product.price)}: ${SITE_URL}/shop/${product.slug}`;

  const jsonLd = isPublic ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    sku: product.ref,
    brand: { '@type': 'Brand', name: product.brand },
    category: CATEGORY_SINGULAR[product.category as Category],
    description: product.description.slice(0, 500) || undefined,
    image: images.map((i) => i.src),
    itemCondition: 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/shop/${product.slug}`,
      price: Number(product.price).toFixed(2),
      priceCurrency: 'ZAR',
      availability: product.status === 'available' ? 'https://schema.org/InStock'
        : product.status === 'reserved' ? 'https://schema.org/Reserved' : 'https://schema.org/SoldOut',
      itemCondition: 'https://schema.org/UsedCondition',
      seller: { '@type': 'Organization', name: 'Guitarz4U' },
      availableDeliveryMethod: 'https://schema.org/OnSitePickup',
    },
  } : null;

  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /> : null}
      {isPublic ? <TrackView productId={product.id} /> : null}
      <div className="section">
        <div className="wrap">
          <nav className="breadcrumbs" aria-label="Breadcrumb" style={{ color: 'var(--ink-soft)' }}>
            <Link href="/" style={{ color: 'inherit' }}>Home</Link> / <Link href="/shop" style={{ color: 'inherit' }}>Shop</Link> /{' '}
            <Link href={`/shop?category=${product.category}`} style={{ color: 'inherit' }}>{CATEGORY_SINGULAR[product.category as Category]}</Link>
          </nav>
          {!isPublic ? (
            <div className="draft-banner">Preview only — this listing is <strong>{product.status}</strong> and is not visible to the public.</div>
          ) : null}
          <div className="product-layout">
            <Gallery images={images} name={name} />
            <div>
              <div className="row"><AvailabilityBadge status={product.status} /><span className="muted small">Ref {product.ref}</span></div>
              <h1 style={{ marginTop: 10 }}>{name}</h1>
              <div className="price-lg">{product.status === 'sold' ? 'Sold' : formatZAR(product.price)}</div>
              <dl className="spec-list">
                <dt>Type</dt><dd>{CATEGORY_SINGULAR[product.category as Category]}</dd>
                <dt>Condition</dt><dd>{label(CONDITIONS, product.condition)}</dd>
                {product.year_made ? (<><dt>Year</dt><dd>{product.year_made}</dd></>) : null}
                {product.public_serial ? (<><dt>Serial no.</dt><dd>{product.public_serial}</dd></>) : null}
                <dt>Included</dt><dd>{product.accessories || 'Guitar only'}</dd>
                <dt>Listed</dt><dd>{formatDate(product.published_at ?? product.created_at)}</dd>
                {product.status === 'sold' && product.sold_at ? (<><dt>Sold</dt><dd>{formatDate(product.sold_at)}</dd></>) : null}
              </dl>

              {product.status === 'reserved' ? (
                <div className={`alert ${myRes ? 'alert-success' : 'alert-info'}`} role="status" style={{ marginTop: 16 }}>
                  {myRes
                    ? <><strong>Reservation confirmed.</strong> You have reserved this guitar until <strong>{formatDateTime(myRes.expires_at)}</strong> (ref {myRes.ref}). The owner will contact you about payment and collection.</>
                    : <>This guitar is currently reserved by another customer. It may become available again if the reservation ends — ask to be notified below.</>}
                </div>
              ) : null}
              {product.status === 'sold' ? (
                <div className="alert alert-info" style={{ marginTop: 16 }}>This guitar has been sold. Browse <Link href={`/shop?category=${product.category}`}>similar guitars</Link> or ask to be notified when something similar arrives.</div>
              ) : null}

              <div className="action-panel">
                {canEnquire ? (
                  inCart ? <Link href="/cart" className="btn btn-dark">In your enquiry cart — view cart</Link> : (
                    <form action={addToCart}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <SubmitButton className="btn btn-primary btn-block" pendingText="Adding…">Add to enquiry cart</SubmitButton>
                    </form>
                  )
                ) : null}
                {product.status !== 'sold' && isPublic ? (
                  <a className="btn btn-whatsapp" href={waLink(settings.whatsapp_international, waMsg)} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon /> Ask about it on WhatsApp
                  </a>
                ) : null}
                {isPublic ? (
                  <form action={toggleWishlist}>
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="back" value={`/shop/${product.slug}`} />
                    <SubmitButton className="btn btn-outline btn-block" pendingText="Saving…">
                      <HeartIcon /> {wish ? 'Saved to wishlist — remove' : 'Save to wishlist'}
                    </SubmitButton>
                  </form>
                ) : null}
              </div>

              <div className="payment-note">
                <strong>No online payment.</strong> Enquiries, offers and reservations are not payments and do not complete a sale.
                Payment (usually EFT) is arranged directly with the owner. Collection only in {settings.collection_area} — details shared privately once approved.
              </div>

              <div style={{ marginTop: 18 }}>
                {product.status === 'available' ? (
                  <details className="disclosure">
                    <summary>Reserve for {settings.reservation_hours} hours</summary>
                    <div>
                      {user ? <ReserveForm productId={product.id} hours={settings.reservation_hours} defaults={defaults} /> : (
                        <p>Please <Link href={`/auth/login?next=/shop/${product.slug}`}>sign in</Link> or <Link href={`/auth/register?next=/shop/${product.slug}`}>create a free account</Link> to reserve this guitar.</p>
                      )}
                    </div>
                  </details>
                ) : null}
                {product.status === 'available' || product.status === 'reserved' ? (
                  <details className="disclosure">
                    <summary>Make an offer</summary>
                    <div><OfferForm productId={product.id} defaults={defaults} /></div>
                  </details>
                ) : null}
                {isPublic ? (
                  <details className="disclosure">
                    <summary>Ask a question</summary>
                    <div><ContactForm productId={product.id} defaults={defaults} /></div>
                  </details>
                ) : null}
                {product.status !== 'available' ? (
                  <details className="disclosure" open={product.status === 'sold'}>
                    <summary>Notify me about similar guitars</summary>
                    <div><StockAlertForm defaults={defaults} /></div>
                  </details>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 40 }}>
            <section>
              <h2>Description</h2>
              {product.description ? product.description.split(/\n{2,}/).map((para, i) => <p key={i} style={{ whiteSpace: 'pre-line' }}>{para}</p>) : <p className="muted">No description yet.</p>}
              {product.provenance ? (<><h3>History</h3><p style={{ whiteSpace: 'pre-line' }}>{product.provenance}</p></>) : null}
            </section>
            <section>
              <h2>Known defects &amp; wear</h2>
              <p style={{ whiteSpace: 'pre-line' }}>{product.defects || 'No defects noted beyond normal wear for a second-hand instrument. Please inspect on collection.'}</p>
            </section>
          </div>

          {related.length ? (
            <section style={{ marginTop: 40 }}>
              <h2>Related guitars</h2>
              <ProductGrid products={related} />
            </section>
          ) : null}
          <RecentlyViewed excludeId={product.id} />
        </div>
      </div>
    </>
  );
}
