import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Info } from "lucide-react";
import { getProductBySlug, searchProducts } from "@/lib/data/products";
import { getUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductActions } from "@/components/shop/ProductActions";
import { ProductGrid } from "@/components/shop/ProductCard";
import { RecentlyViewed } from "@/components/shop/RecentlyViewed";
import { AvailabilityBadge, DemoBadge } from "@/components/ui/Badges";
import { Price } from "@/components/ui/Price";
import { Alert } from "@/components/ui/Alert";
import { CONDITIONS, conditionLabel } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import { publicImageUrl } from "@/lib/images";
import { formatDate, formatDateTime, truncate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Item not found" };
  const desc = truncate(
    `${conditionLabel(p.condition)} condition ${p.category?.name?.toLowerCase() ?? "item"}${p.brand ? ` by ${p.brand.name}` : ""}. ${p.description}`.replace(/\s+/g, " "),
    155,
  );
  const image = publicImageUrl(p.images?.[0]?.storage_path);
  return {
    title: `${p.title}${p.status === "sold" ? " (sold)" : ""}`,
    description: desc,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: p.title, description: desc, type: "website", images: image && !image.endsWith(".svg") ? [{ url: image }] : undefined },
    robots: p.is_demo ? { index: false } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const supabase = await createClient();
  const [user, settings, related] = await Promise.all([
    getUser(),
    getSettings(),
    searchProducts({ category: product.category?.slug, perPage: 5 }),
  ]);
  let inWishlist = false;
  let alertActive = false;
  if (user) {
    const [w, a] = await Promise.all([
      supabase.from("wishlists").select("product_id").eq("product_id", product.id).eq("user_id", user.id).maybeSingle(),
      supabase
        .from("availability_alerts")
        .select("id")
        .eq("product_id", product.id)
        .eq("user_id", user.id)
        .is("notified_at", null)
        .maybeSingle(),
    ]);
    inWishlist = Boolean(w.data);
    alertActive = Boolean(a.data);
  }

  const images = product.images ?? [];
  const url = `${SITE_URL}/shop/${product.slug}`;
  const cond = CONDITIONS.find((c) => c.value === product.condition);
  const relatedProducts = related.products.filter((p) => p.id !== product.id).slice(0, 4);
  const available = product.status === "published" && product.quantity > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || undefined,
    image: images.map((i) => publicImageUrl(i.storage_path)).filter((u) => u && !u.startsWith("/")),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    model: product.model || undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "ZAR",
      price: Number(product.price).toFixed(2),
      itemCondition: "https://schema.org/UsedCondition",
      availability:
        product.status === "sold"
          ? "https://schema.org/SoldOut"
          : available
            ? "https://schema.org/InStock"
            : "https://schema.org/LimitedAvailability",
      seller: { "@type": "Organization", name: "Guitarz4U" },
    },
  };

  return (
    <>
      {!product.is_demo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <div className="container-page py-6">
        <nav aria-label="Breadcrumb" className="text-sm text-tan">
          <ol className="flex flex-wrap gap-1">
            <li>
              <Link href="/shop" className="link">
                Shop
              </Link>{" "}
              /
            </li>
            {product.category && (
              <li>
                <Link href={`/shop?category=${product.category.slug}`} className="link">
                  {product.category.name}
                </Link>{" "}
                /
              </li>
            )}
            <li aria-current="page" className="text-walnut">
              {truncate(product.title, 50)}
            </li>
          </ol>
        </nav>
      </div>

      <div className="container-page grid gap-10 pb-12 lg:grid-cols-[1.1fr_1fr]">
        <ProductGallery images={images} title={product.title} />

        <div>
          {product.is_demo && (
            <Alert tone="info" title="Demo listing" className="mb-4">
              This is demonstration content used to preview the shop. It is not a real item for sale.
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <AvailabilityBadge status={product.status} quantity={product.quantity} />
            {product.featured && available && <span className="badge badge-gold">Featured</span>}
            {product.is_demo && <DemoBadge />}
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl">{product.title}</h1>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {product.brand && (
              <>
                <dt className="text-tan">Brand</dt>
                <dd>{product.brand.name}</dd>
              </>
            )}
            {product.model && (
              <>
                <dt className="text-tan">Model</dt>
                <dd>{product.model}</dd>
              </>
            )}
            {product.category && (
              <>
                <dt className="text-tan">Category</dt>
                <dd>{product.category.name}</dd>
              </>
            )}
            {product.year_made && (
              <>
                <dt className="text-tan">Year</dt>
                <dd>{product.year_made}</dd>
              </>
            )}
            {product.quantity > 1 && available && (
              <>
                <dt className="text-tan">In stock</dt>
                <dd>{product.quantity}</dd>
              </>
            )}
            <dt className="text-tan">Listed</dt>
            <dd>{formatDate(product.published_at ?? product.created_at)}</dd>
          </dl>

          <div className="mt-5">
            <Price price={Number(product.price)} compareAt={product.compare_at_price ? Number(product.compare_at_price) : null} size="lg" />
          </div>

          <div className="mt-4 rounded-lg border border-gold/40 bg-ivory p-4">
            <p className="font-semibold">Condition: {conditionLabel(product.condition)}</p>
            {cond && <p className="text-sm text-walnut/80">{cond.description}</p>}
          </div>

          {product.status === "reserved" && (
            <Alert tone="warning" className="mt-4" title="Currently reserved">
              This item is reserved for another customer
              {product.reserved_until ? ` until ${formatDateTime(product.reserved_until)}` : ""}. If the reservation
              lapses it will become available again — ask to be notified below.
            </Alert>
          )}
          {product.status === "sold" && (
            <Alert tone="error" className="mt-4" title="Sold">
              This item has been sold and is kept here for reference. Looking for something similar? Ask us on WhatsApp.
            </Alert>
          )}

          <div className="mt-6">
            <ProductActions
              product={{
                id: product.id,
                slug: product.slug,
                title: product.title,
                price: Number(product.price),
                status: product.status,
                quantity: product.quantity,
                image: images[0]?.storage_path ?? null,
              }}
              signedIn={Boolean(user)}
              inWishlist={inWishlist}
              alertActive={alertActive}
              whatsappNumber={settings.whatsapp_number}
              productUrl={url}
            />
          </div>

          <div className="mt-2 flex gap-3 rounded-lg bg-cream-2 p-4 text-sm">
            <Info className="mt-0.5 h-5 w-5 flex-none text-tan" aria-hidden />
            <p>
              <strong>No payment is taken online.</strong> Requests are reviewed personally; we&apos;ll confirm
              availability and arrange payment (normally EFT) and collection with you directly.
            </p>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-8 pb-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="desc-h">
            <h2 id="desc-h" className="text-2xl">
              Description
            </h2>
            <p className="mt-3 whitespace-pre-line">{product.description || "Ask us for more details about this item."}</p>
          </section>
          <section aria-labelledby="defects-h" className="rounded-xl border border-warning/30 bg-[#fbf2df] p-5">
            <h2 id="defects-h" className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-warning" aria-hidden /> Defects &amp; wear
            </h2>
            <p className="mt-2 whitespace-pre-line">
              {product.defects || "No specific defects noted beyond normal signs of use for its age. Please check the photos."}
            </p>
            <p className="mt-3 text-sm text-walnut/80">
              Second-hand instruments may have cosmetic wear or defects. Please read the description carefully and
              ask us for extra photos or a viewing before you buy.
            </p>
          </section>
          {product.history && (
            <section aria-labelledby="history-h">
              <h2 id="history-h" className="text-2xl">
                Known history
              </h2>
              <p className="mt-3 whitespace-pre-line">{product.history}</p>
            </section>
          )}
        </div>
        <aside className="card h-fit p-5 text-sm">
          <h2 className="text-lg">Buying from Guitarz4U</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Add the item to your request cart or request a reservation.</li>
            <li>We check availability and contact you personally.</li>
            <li>Pay directly by EFT once confirmed — never by card on this site.</li>
            <li>Collect by appointment; the address is shared privately after confirmation.</li>
          </ol>
          <p className="mt-4">
            <Link href="/policies/returns" className="link">
              Returns, condition &amp; reservation policy
            </Link>
          </p>
        </aside>
      </div>

      {relatedProducts.length > 0 && (
        <section className="border-t border-gold/30 py-12" aria-labelledby="related-h">
          <div className="container-page">
            <h2 id="related-h" className="text-2xl">
              You might also like
            </h2>
            <div className="mt-5">
              <ProductGrid products={relatedProducts} />
            </div>
          </div>
        </section>
      )}
      <RecentlyViewed excludeId={product.id} />
    </>
  );
}
