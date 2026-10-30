import Link from 'next/link';
import { ProductCard, ProductGrid } from '@/components/ProductCard';
import { StockAlertForm } from '@/components/PublicForms';
import { ShieldIcon, TagIcon, WrenchIcon, WhatsAppIcon } from '@/components/icons';
import { expireReservations, listHomeProducts } from '@/lib/products';
import { getContent, getSettings } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/labels';
import { waLink } from '@/lib/whatsapp';
import { SITE_URL } from '@/lib/env';
import { formatDate } from '@/lib/format';
import { Flash } from '@/components/Flash';

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await expireReservations();
  const supabase = await createClient();
  const [{ featured, newArrivals, anyStock }, settings, intro, reviews] = await Promise.all([
    listHomeProducts(),
    getSettings(),
    getContent('home-intro'),
    supabase.from('reviews').select('id, display_name, rating, title, body, created_at')
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(3),
  ]);
  const hero = featured[0] ?? newArrivals[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicStore',
    name: settings.business_name,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    image: `${SITE_URL}/images/og-image.png`,
    email: settings.contact_email,
    telephone: '+' + settings.whatsapp_international,
    // Only the general area is published — never a street address.
    address: { '@type': 'PostalAddress', addressLocality: 'Sandringham, Johannesburg', addressRegion: 'Gauteng', addressCountry: 'ZA' },
    areaServed: ['Johannesburg', 'Gauteng', 'South Africa'],
    currenciesAccepted: 'ZAR',
    paymentAccepted: 'EFT (arranged directly with the owner)',
    makesOffer: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Guitar repairs' } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {sp.ok || sp.error ? <div className="wrap" style={{ paddingTop: 16 }}><Flash ok={sp.ok} error={sp.error} allow={['You have been signed out.', 'Your account has been deleted.']} /></div> : null}
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="rise">
              <p className="eyebrow" style={{ color: 'var(--amber-light)' }}>Sandringham · Johannesburg</p>
              <h1>Honest second-hand guitars. Careful repairs.</h1>
              <p className="lead">{intro?.body.trim() ?? 'Second-hand guitars and repairs in Sandringham, Johannesburg.'}</p>
              <div className="hero-actions">
                <Link href="/shop" className="btn btn-primary">Shop guitars</Link>
                <Link href="/sell" className="btn btn-outline-light">Sell or give away</Link>
                <Link href="/repairs" className="btn btn-outline-light">Repairs</Link>
              </div>
            </div>
            <div className="hero-feature rise" style={{ animationDelay: '0.1s' }}>
              {hero ? (
                <>
                  <p className="eyebrow" style={{ color: 'var(--amber-light)' }}>{featured[0] ? 'Featured guitar' : 'Just listed'}</p>
                  <ProductCard product={hero} headingLevel={2} />
                </>
              ) : (
                <div className="hero-empty">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/logo-mark.svg" alt="" width={84} height={84} />
                  <h2>New stock is on its way</h2>
                  <p>There are no guitars listed right now. Ask to be notified when the next guitars arrive, or message us about what you&apos;re looking for.</p>
                  <div className="row" style={{ justifyContent: 'center' }}>
                    <a href="#notify" className="btn btn-primary">Notify me</a>
                    <a href={waLink(settings.whatsapp_international, "Hi Guitarz4U, I'm looking for a guitar.")} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> WhatsApp us</a>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="trust-strip">
            <div><strong>Personally inspected</strong>Honest descriptions, defects shown up front.</div>
            <div><strong>No online payments</strong>Payment is arranged directly with the owner.</div>
            <div><strong>Collection only</strong>In Sandringham — details shared privately.</div>
            <div><strong>You approve repair quotes</strong>No work or extra cost without your OK.</div>
          </div>
        </div>
      </section>

      {featured.length > 1 ? (
        <section className="section">
          <div className="wrap">
            <div className="row-between"><h2>Featured guitars</h2><Link href="/shop">View all guitars →</Link></div>
            <ProductGrid products={featured} />
          </div>
        </section>
      ) : null}

      {anyStock ? (
        <section className={`section ${featured.length > 1 ? 'section-alt' : ''}`}>
          <div className="wrap">
            <div className="row-between"><h2>New arrivals</h2><Link href="/shop?sort=newest">Shop the latest →</Link></div>
            <ProductGrid products={newArrivals} />
          </div>
        </section>
      ) : null}

      <section className="section section-alt">
        <div className="wrap">
          <h2>Shop by type</h2>
          <div className="grid-3" style={{ marginTop: 16 }}>
            {Object.entries(CATEGORIES).map(([k, l]) => (
              <Link key={k} href={`/shop?category=${k}`} className="stat">
                <span className="value" style={{ fontSize: '1.2rem' }}>{l}</span>
                <span className="label">Browse {l.toLowerCase()} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid-3">
          <div className="feature-card">
            <div className="icon"><TagIcon /></div>
            <h3>Buy a guitar</h3>
            <p>Every listing shows the condition, known defects and what&apos;s included. Reserve for {settings.reservation_hours} hours, make an offer or send an enquiry — no online payment.</p>
            <Link href="/shop">Browse the shop →</Link>
          </div>
          <div className="feature-card">
            <div className="icon"><ShieldIcon /></div>
            <h3>Sell or give away</h3>
            <p>Working, broken or incomplete — we&apos;ll take a look. The owner inspects every guitar in person before making an offer.</p>
            <Link href="/sell">Submit your guitar →</Link>
          </div>
          <div className="feature-card">
            <div className="icon"><WrenchIcon /></div>
            <h3>Repairs</h3>
            <p>Strings, setups, fretwork, electronics and broken-guitar repairs. Clear quotes with labour and parts shown separately.</p>
            <Link href="/repairs">Request a repair →</Link>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="notify">
        <div className="wrap grid-2">
          <div>
            <h2>Get notified about new stock</h2>
            <p>Tell us what you&apos;re looking for and we&apos;ll email you when a matching guitar is listed. No spam — unsubscribe any time.</p>
            <p>Prefer WhatsApp? <a href={waLink(settings.whatsapp_international)} target="_blank" rel="noopener noreferrer">Message us on {settings.whatsapp_display}</a>.</p>
          </div>
          <div className="card"><StockAlertForm compact /></div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="row-between"><h2>What customers say</h2><Link href="/reviews">All reviews →</Link></div>
          {reviews.data?.length ? (
            <div className="grid-3">
              {reviews.data.map((r) => (
                <article key={r.id} className="review">
                  <div className="stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  {r.title ? <h3 style={{ marginTop: 6 }}>{r.title}</h3> : null}
                  <p>{r.body}</p>
                  <p className="small muted">— {r.display_name}, {formatDate(r.created_at)}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No reviews yet</h3>
              <p>We&apos;re a new shop, so there are no published reviews yet. Bought, sold or had a guitar repaired with us? We&apos;d love your honest feedback.</p>
              <Link href="/reviews" className="btn btn-outline">Write a review</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
