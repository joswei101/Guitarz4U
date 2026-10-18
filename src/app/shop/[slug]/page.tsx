import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublicProduct, getRelatedProducts } from "@/lib/products";
import { getCurrentUser } from "@/lib/session";
import { getSettings, whatsappLink } from "@/lib/settings";
import { queryOne } from "@/lib/db";
import { conditionLabel, formatRand, CONDITIONS, type Condition } from "@/lib/format";
import { env } from "@/lib/env";
import { ProductCard } from "@/components/ProductCard";
import { expireOverdueReservations } from "@/lib/reservations";
import { EftNotice, SecondHandNotice, PageHead } from "@/components/ui";
import { Gallery } from "@/components/Gallery";
import { ProductActions } from "@/components/ProductActions";
import { RecentlyViewed } from "@/components/RecentlyViewed";

export const dynamic = "force-dynamic";

const load = cache(async (slug: string) => getPublicProduct(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p || !["published", "reserved"].includes(p.rawStatus)) return { title: "Guitar not available", robots: { index: false } };
  const desc = `${p.title} — ${conditionLabel(p.condition)} condition, ${formatRand(p.priceCents)}. Second-hand ${p.category.toLowerCase()} available from Guitarz4U in Johannesburg.`;
  return {
    title: `${p.title} — ${formatRand(p.priceCents)}`,
    description: desc,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: p.title, description: desc, images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : undefined },
    robots: p.isDemo ? { index: false } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  await expireOverdueReservations().catch((e) => console.error("[reservations]", e));
  const { slug } = await params;
  const [p, user, s] = await Promise.all([load(slug), getCurrentUser(), getSettings()]);
  if (!p) notFound();
  const isAdmin = user?.role === "admin";
  if ((p.rawStatus === "draft" || p.rawStatus === "archived") && !isAdmin) notFound();

  if (p.rawStatus === "sold" && !isAdmin) {
    return (
      <>
        <PageHead title={p.title} crumbs={[{ href: "/shop", label: "Shop" }, { label: p.title }]} />
        <div className="wrap section narrow">
          <div className="notice">
            <strong>This guitar has been sold</strong>
            <p>It is no longer available. Have a look at our current stock, or ask us to look out for something similar.</p>
          </div>
          <div className="row" style={{ marginTop: 20 }}>
            <Link href="/shop" className="btn btn-primary">Browse current stock</Link>
            <Link href="/contact" className="btn btn-outline">Ask us to find one</Link>
          </div>
        </div>
      </>
    );
  }

  const [related, wish] = await Promise.all([
    getRelatedProducts(p.id, p.categoryId),
    user ? queryOne("select 1 from wishlists where user_id=$1 and product_id=$2", [user.id, p.id]) : null,
  ]);
  const available = p.rawStatus === "published";
  const cond = CONDITIONS[p.condition as Condition];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    model: p.model || undefined,
    category: p.category,
    description: p.description || undefined,
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : env.siteUrl + i.url)),
    offers: {
      "@type": "Offer",
      priceCurrency: "ZAR",
      price: (p.priceCents / 100).toFixed(2),
      itemCondition: "https://schema.org/UsedCondition",
      availability: available ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
      url: `${env.siteUrl}/shop/${p.slug}`,
      seller: { "@type": "Organization", name: "Guitarz4U" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="wrap" style={{ paddingTop: 20 }}>
        <nav className="breadcrumbs" aria-label="Breadcrumb" style={{ color: "var(--muted)" }}>
          <ol>
            <li><Link href="/" style={{ color: "var(--muted)" }}>Home</Link></li>
            <li><Link href="/shop" style={{ color: "var(--muted)" }}>Shop</Link></li>
            <li><Link href={`/shop?category=${p.categorySlug}`} style={{ color: "var(--muted)" }}>{p.category}</Link></li>
            <li aria-current="page">{p.title}</li>
          </ol>
        </nav>
      </div>
      <div className="wrap section-tight">
        {isAdmin && p.rawStatus !== "published" && (
          <div className="notice notice-warn" style={{ marginBottom: 16 }}>
            <strong>Admin preview</strong>
            <p>This product is “{p.rawStatus}” and {p.rawStatus === "reserved" ? "is shown as reserved" : "is not visible"} to the public. <Link href={`/admin/products/${p.id}`}>Edit product</Link></p>
          </div>
        )}
        <div className="product-layout">
          <Gallery images={p.images} title={p.title} />
          <div className="buy-box stack">
            <div>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                {available ? <span className="tag tag-good">Available</span> : p.rawStatus === "reserved" ? <span className="tag tag-dark">Reserved</span> : <span className="tag tag-bad">Not available</span>}
                {p.compareAtPriceCents && <span className="tag tag-gold">Special offer</span>}
                {p.isDemo && <span className="tag tag-demo">Demonstration listing — not a real item</span>}
              </div>
              <span className="eyebrow">{p.brand ?? p.category}</span>
              <h1 style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.4rem)" }}>{p.title}</h1>
              <div className="row" style={{ alignItems: "baseline" }}>
                <span className="price" data-testid="product-price">{formatRand(p.priceCents)}</span>
                {p.compareAtPriceCents && <span className="price-was">Was {formatRand(p.compareAtPriceCents)}</span>}
              </div>
            </div>
            <dl className="spec-list">
              {p.brand && (<><dt>Brand</dt><dd>{p.brand}</dd></>)}
              {p.model && (<><dt>Model</dt><dd>{p.model}</dd></>)}
              <dt>Category</dt><dd>{p.category}</dd>
              <dt>Condition</dt><dd><strong>{cond?.label}</strong> <span className="small muted">— {cond?.help}</span></dd>
              <dt>Listed</dt><dd>{new Date(p.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</dd>
            </dl>
            <ProductActions
              product={{ id: p.id, title: p.title, slug: p.slug, priceCents: p.priceCents }}
              available={available}
              reserved={p.rawStatus === "reserved"}
              wishlisted={Boolean(wish)}
              user={user ? { name: user.name, email: user.email } : null}
              whatsappHref={whatsappLink(s.whatsappNumber, `Hi Guitarz4U, I am interested in "${p.title}" (${formatRand(p.priceCents)}): ${env.siteUrl}/shop/${p.slug}`)}
            />
            <EftNotice />
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 40, alignItems: "start" }}>
          <section className="card stack" aria-labelledby="desc-h">
            <h2 id="desc-h">Description</h2>
            <div className="pre-line">{p.description || "No description has been added yet."}</div>
            {p.history && (<><h3>Known history</h3><div className="pre-line">{p.history}</div></>)}
          </section>
          <section className="card stack" aria-labelledby="defects-h">
            <h2 id="defects-h">Disclosed defects &amp; damage</h2>
            <div className="pre-line">{p.defects || "No defects beyond normal signs of use have been noted. Please ask if you would like more photos or details."}</div>
            <SecondHandNotice />
          </section>
        </div>

        {related.length > 0 && (
          <section style={{ marginTop: 48 }} aria-labelledby="related-h">
            <h2 id="related-h">You might also like</h2>
            <div className="product-grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </section>
        )}
        <RecentlyViewed excludeId={p.id} />
      </div>
    </>
  );
}
