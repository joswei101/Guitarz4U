import Link from "next/link";
import { getSettings, whatsappLink } from "@/lib/settings";
import { getCategories, getFeaturedProducts } from "@/lib/products";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { ProductCard } from "@/components/ProductCard";
import { EftNotice, Stars, Empty } from "@/components/ui";
import { IconGuitar, IconHandshake, IconShield, IconTag, IconWhatsApp, IconWrench } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [s, featured, categories, reviews] = await Promise.all([
    getSettings(),
    getFeaturedProducts(8),
    getCategories(),
    query<{ id: string; display_name: string; rating: number; title: string; body: string; verified_purchase: boolean }>(
      "select id, display_name, rating, title, body, verified_purchase from reviews where status='approved' order by created_at desc limit 3",
    ),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicStore",
    name: "Guitarz4U",
    slogan: s.tagline,
    url: env.siteUrl,
    image: `${env.siteUrl}/og-image.jpg`,
    logo: `${env.siteUrl}/icon-512.png`,
    email: s.email,
    telephone: "+" + s.whatsappNumber.replace(/\D/g, "").replace(/^0/, "27"),
    currenciesAccepted: "ZAR",
    paymentAccepted: "Bank transfer (EFT), arranged privately",
    address: { "@type": "PostalAddress", addressLocality: "Sandringham, Johannesburg", addressRegion: "Gauteng", addressCountry: "ZA" },
    areaServed: ["Johannesburg", "Gauteng", "South Africa"],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="hero">
        <picture>
          <source media="(max-width: 720px)" srcSet="/images/hero-960.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-img" src="/images/hero.webp" alt="" fetchPriority="high" width={1920} height={1280} />
        </picture>
        <div className="wrap hero-inner">
          <span className="eyebrow fade-up">Pre-owned guitars · Johannesburg</span>
          <h1 className="fade-up">{s.heroHeading}</h1>
          <p className="lead fade-up-2">{s.heroText}</p>
          <div className="hero-ctas fade-up-3">
            <Link href="/shop" className="btn btn-gold">Shop guitars</Link>
            <Link href="/sell" className="btn btn-outline-light">Sell your guitar</Link>
            <a href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, ")} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer" data-track="whatsapp_click">
              <IconWhatsApp /> WhatsApp us
            </a>
          </div>
          <div className="hero-facts fade-up-3">
            <span>Defects always disclosed</span>
            <span>No online payments</span>
            <span>Repairs &amp; setups</span>
            <span>{s.hoursNotice}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="toolbar">
            <div>
              <span className="eyebrow">In the shop</span>
              <h2 style={{ marginBottom: 0 }}>Featured guitars</h2>
            </div>
            <Link href="/shop" className="btn btn-outline">View all stock</Link>
          </div>
          {featured.length > 0 ? (
            <div className="product-grid">
              {featured.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 2} />)}
            </div>
          ) : (
            <Empty title="New stock is on its way">
              <p className="muted">There are no guitars listed right now. Check back soon, or WhatsApp us to ask what is coming in.</p>
            </Empty>
          )}
        </div>
      </section>

      <section className="section" style={{ background: "var(--cream-light)", borderBlock: "1px solid var(--line)" }}>
        <div className="wrap">
          <span className="eyebrow center">Browse by type</span>
          <h2 className="center">Find your next guitar</h2>
          <div className="cat-tiles" style={{ marginTop: 24 }}>
            {categories.map((c) => (
              <Link key={c.slug} href={`/shop?category=${c.slug}`} className="cat-tile">
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <IconGuitar />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">How buying works</span>
          <h2>Personal service instead of a checkout</h2>
          <p className="lead">Every guitar is one of a kind, so every sale is handled personally by the owner.</p>
          <div className="grid-3" style={{ marginTop: 24 }}>
            <div className="card feature">
              <div className="feature-icon"><IconTag /></div>
              <h3>1. Send a purchase request</h3>
              <p className="muted">Add guitars to your request cart and send us your details. Nothing is charged and nothing is confirmed yet.</p>
            </div>
            <div className="card feature">
              <div className="feature-icon"><IconHandshake /></div>
              <h3>2. We confirm personally</h3>
              <p className="muted">We check the guitar is still available and contact you on WhatsApp or email to confirm the price and collection.</p>
            </div>
            <div className="card feature">
              <div className="feature-icon"><IconShield /></div>
              <h3>3. Private EFT &amp; collection</h3>
              <p className="muted">Only after approval do we share EFT details privately. Once funds reflect, we arrange collection with you.</p>
            </div>
          </div>
          <div style={{ marginTop: 24 }}><EftNotice /></div>
          <p style={{ marginTop: 16 }}><Link href="/how-it-works">Read the full buying and selling process →</Link></p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--brown)", color: "var(--cream)" }}>
        <div className="wrap grid-2" style={{ alignItems: "center" }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--gold-light)" }}>We buy guitars</span>
            <h2 style={{ color: "var(--cream-light)" }}>Selling a guitar? Working, broken or incomplete.</h2>
            <p style={{ color: "rgba(245,235,216,0.85)" }}>{s.sellIntro}</p>
            <div className="row" style={{ marginTop: 18 }}>
              <Link href="/sell" className="btn btn-gold">Submit your guitar</Link>
              <a className="btn btn-outline-light" href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, I would like to sell a guitar: ")} target="_blank" rel="noopener noreferrer">Send photos on WhatsApp</a>
            </div>
          </div>
          <div>
            <span className="eyebrow" style={{ color: "var(--gold-light)" }}>Repairs &amp; setups</span>
            <h2 style={{ color: "var(--cream-light)" }}>Bring your guitar back to life</h2>
            <p style={{ color: "rgba(245,235,216,0.85)" }}>{s.repairsIntro}</p>
            <Link href="/repairs" className="btn btn-outline-light" style={{ marginTop: 18 }}><IconWrench /> Book a repair</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="toolbar">
            <div>
              <span className="eyebrow">Customer reviews</span>
              <h2 style={{ marginBottom: 0 }}>What customers say</h2>
            </div>
            <Link href="/reviews" className="btn btn-outline">All reviews</Link>
          </div>
          {reviews.length > 0 ? (
            <div className="grid-3">
              {reviews.map((r) => (
                <figure key={r.id} className="card review" style={{ margin: 0 }}>
                  <Stars rating={r.rating} />
                  {r.title && <h3 style={{ marginTop: 8 }}>{r.title}</h3>}
                  <blockquote style={{ margin: 0 }} className="muted">{r.body}</blockquote>
                  <figcaption className="small" style={{ marginTop: 10 }}>
                    — {r.display_name}{r.verified_purchase && <span className="tag tag-good" style={{ marginLeft: 6 }}>Completed purchase</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <Empty title="No reviews yet">
              <p className="muted">Reviews from real customers will appear here once they have been submitted and approved.</p>
              <Link href="/reviews" className="btn btn-outline btn-sm">Write a review</Link>
            </Empty>
          )}
        </div>
      </section>
    </>
  );
}
