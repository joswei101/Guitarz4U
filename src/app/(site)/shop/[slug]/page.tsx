import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductGrid } from "@/components/shop/ProductCard";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import {
  AddToCartButton,
  ShareButton,
  TrackProductView,
  WhatsAppProductLink,
  WishlistButton,
} from "@/components/shop/ProductActions";
import { ReservationForm } from "@/components/shop/ReservationForm";
import { ProductAlertButton } from "@/components/shop/AlertButtons";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { ChevronRight } from "@/components/ui/Icons";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";
import { getProfile, getUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { productImageUrl } from "@/lib/images";
import { formatDate, formatZAR, truncate, whatsappLink } from "@/lib/format";
import { SITE_URL } from "@/lib/env";
import {
  CONDITION_DESCRIPTIONS,
  CONDITION_LABELS,
  FUNCTIONAL_LABELS,
  PAYMENT_NOTICE,
  PRODUCT_STATUS_LABELS,
  SECOND_HAND_NOTICE,
} from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Guitar not found", robots: { index: false } };
  const description = truncate(
    `${product.title} — ${CONDITION_LABELS[product.condition]} condition, ${formatZAR(product.price)}. ${product.description}`,
    155,
  );
  const image = product.images[0];
  return {
    title: `${product.title} — ${formatZAR(product.price)}`,
    description,
    alternates: { canonical: `/shop/${product.slug}` },
    robots: product.status === "published" || product.status === "reserved" ? undefined : { index: false },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url: `/shop/${product.slug}`,
      images: image && !image.storage_path.endsWith(".svg") ? [{ url: productImageUrl(image.storage_path), alt: image.alt_text ?? product.title }] : undefined,
    },
  };
}

function DetailSection({ title, text }: { title: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <section className="border-t border-line py-6">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-ink-soft">{text}</p>
    </section>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [user, profile, settings, related] = await Promise.all([
    getUser(),
    getProfile(),
    getSiteSettings(),
    getRelatedProducts(product),
  ]);

  let saved = false;
  let reservedForMe = false;
  if (user) {
    const supabase = await createClient();
    const [{ data: wish }, { data: myRes }] = await Promise.all([
      supabase.from("wishlists").select("product_id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle(),
      supabase.from("reservations").select("id").eq("user_id", user.id).eq("product_id", product.id).eq("status", "approved").maybeSingle(),
    ]);
    saved = Boolean(wish);
    reservedForMe = Boolean(myRes);
  }

  const available = product.status === "published";
  const reserved = product.status === "reserved";
  const notPublic = !available && !reserved;
  const onOffer = product.compare_at_price !== null && product.compare_at_price > product.price;
  const images = product.images.length
    ? product.images.map((i) => ({ url: productImageUrl(i.storage_path), alt: i.alt_text || product.title }))
    : [{ url: productImageUrl(null), alt: "No photograph available yet" }];
  const productUrl = `${SITE_URL}/shop/${product.slug}`;
  const cartItem = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    price: product.price,
    image: images[0].url,
    condition: CONDITION_LABELS[product.condition],
  };
  const contactDefaults = {
    name: profile?.full_name,
    email: profile?.email,
    phone: profile?.phone,
    preferred: profile?.preferred_contact,
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="container-page pt-6 text-sm text-ink-soft">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/shop" className="hover:text-gold-ink">
              Shop
            </Link>
          </li>
          {product.category && (
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href={`/shop/category/${product.category.slug}`} className="hover:text-gold-ink">
                {product.category.name}
              </Link>
            </li>
          )}
          <li className="flex items-center gap-1" aria-current="page">
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate">{product.title}</span>
          </li>
        </ol>
      </nav>

      {notPublic && (
        <div className="container-page pt-4">
          <p className="notice notice-strong">
            Administrator preview: this listing is <strong>{PRODUCT_STATUS_LABELS[product.status]}</strong> and is not
            visible to the public.
          </p>
        </div>
      )}

      <div className="container-page grid gap-10 py-8 lg:grid-cols-2">
        <ProductGallery images={images} title={product.title} />

        <div>
          <p className="eyebrow">
            {product.brand?.name ?? "Unbranded"} · {product.category?.name}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{product.title}</h1>
          {product.is_demo && (
            <p className="mt-3 badge badge-info">Demonstration listing — not a real guitar for sale</p>
          )}

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <p className="font-display text-4xl font-semibold text-walnut">{formatZAR(product.price)}</p>
            {onOffer && (
              <p className="pb-1 text-lg text-ink-soft">
                <span className="sr-only">Was </span>
                <span className="line-through">{formatZAR(product.compare_at_price)}</span>
                <span className="badge badge-gold ml-2">Special offer</span>
              </p>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="card p-3">
              <dt className="text-ink-soft">Availability</dt>
              <dd className={`mt-0.5 font-semibold ${available ? "text-success" : "text-warning"}`}>
                {available ? "Available" : reserved ? (reservedForMe ? "Reserved for you" : "Reserved") : PRODUCT_STATUS_LABELS[product.status]}
              </dd>
            </div>
            <div className="card p-3">
              <dt className="text-ink-soft">Condition</dt>
              <dd className="mt-0.5 font-semibold text-walnut" title={CONDITION_DESCRIPTIONS[product.condition]}>
                {CONDITION_LABELS[product.condition]}
              </dd>
            </div>
            <div className="card p-3">
              <dt className="text-ink-soft">Working order</dt>
              <dd className="mt-0.5 font-semibold text-walnut">{FUNCTIONAL_LABELS[product.functional_status]}</dd>
            </div>
            <div className="card p-3">
              <dt className="text-ink-soft">Model</dt>
              <dd className="mt-0.5 font-semibold text-walnut">{product.model || "—"}</dd>
            </div>
            {product.colour && (
              <div className="card p-3">
                <dt className="text-ink-soft">Colour</dt>
                <dd className="mt-0.5 font-semibold text-walnut">{product.colour}</dd>
              </div>
            )}
            {product.year_made && (
              <div className="card p-3">
                <dt className="text-ink-soft">Year</dt>
                <dd className="mt-0.5 font-semibold text-walnut">{product.year_made}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-ink-soft">{CONDITION_DESCRIPTIONS[product.condition]}</p>

          <div className="mt-6 space-y-3">
            {available || reservedForMe ? (
              <AddToCartButton item={cartItem} />
            ) : (
              <>
                <p className="rounded-lg bg-warning-bg p-3 text-sm text-warning">
                  This guitar is currently {reserved ? "reserved" : "unavailable"} and cannot be requested right now.
                </p>
                {reserved && <ProductAlertButton productId={product.id} />}
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <WishlistButton productId={product.id} initialSaved={saved} />
              <ShareButton url={productUrl} title={product.title} productId={product.id} />
            </div>
            <WhatsAppProductLink
              productId={product.id}
              href={whatsappLink(
                settings.contact.whatsapp_number,
                `Hi Guitarz4U, I'm interested in "${product.title}" (${formatZAR(product.price)}): ${productUrl}`,
              )}
            />
          </div>

          <p className="notice mt-6 text-sm">{PAYMENT_NOTICE}</p>
          <p className="mt-3 text-sm text-ink-soft">{SECOND_HAND_NOTICE}</p>

          {available && (
            <details className="card mt-6 p-0" id="reserve">
              <summary className="cursor-pointer p-4 font-display text-lg text-walnut">Request a reservation</summary>
              <div className="px-4 pb-5">
                {user ? (
                  <ReservationForm productId={product.id} defaults={contactDefaults} holdDays={settings.reservations.hold_days} />
                ) : (
                  <p className="text-sm text-ink-soft">
                    Please{" "}
                    <Link href={`/login?next=/shop/${product.slug}%23reserve`} className="font-semibold text-gold-ink">
                      sign in
                    </Link>{" "}
                    to request a reservation, so you can track its status.
                  </p>
                )}
              </div>
            </details>
          )}
          <details className="card mt-3 p-0" id="question">
            <summary className="cursor-pointer p-4 font-display text-lg text-walnut">Ask a question about this guitar</summary>
            <div className="px-4 pb-5">
              <EnquiryForm
                compact
                productId={product.id}
                productTitle={product.title}
                defaults={{ name: profile?.full_name ?? "", email: profile?.email ?? "", phone: profile?.phone ?? "" }}
              />
            </div>
          </details>
        </div>
      </div>

      <div className="container-page grid gap-x-10 lg:grid-cols-2">
        <div>
          <DetailSection title="Description" text={product.description} />
          <DetailSection title="Specifications" text={product.specifications} />
          <DetailSection title="Included with the guitar" text={product.included_items} />
        </div>
        <div>
          <section className="border-t border-line py-6">
            <h2 className="text-xl">Disclosed defects and damage</h2>
            <p className="mt-2 whitespace-pre-line text-ink-soft">
              {product.defects.trim() || "No defects have been noted beyond normal signs of previous use. Please ask if you'd like more photographs."}
            </p>
          </section>
          <DetailSection title="Known history" text={product.history} />
          <p className="border-t border-line py-6 text-sm text-ink-soft">Listed on {formatDate(product.published_at ?? product.created_at)}</p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-page py-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-6 text-2xl">
            You might also like
          </h2>
          <ProductGrid products={related} />
        </section>
      )}

      <RecentlyViewed excludeId={product.id} />
      <TrackProductView item={cartItem} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: truncate(product.description || product.title, 500),
          image: images.filter((i) => !i.url.endsWith(".svg")).map((i) => (i.url.startsWith("http") ? i.url : `${SITE_URL}${i.url}`)),
          brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
          model: product.model ?? undefined,
          category: product.category?.name,
          itemCondition: "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            priceCurrency: "ZAR",
            price: product.price.toFixed(2),
            availability: available ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
            itemCondition: "https://schema.org/UsedCondition",
            url: productUrl,
            seller: { "@type": "Organization", name: "Guitarz4U" },
          },
        }}
      />
    </>
  );
}
