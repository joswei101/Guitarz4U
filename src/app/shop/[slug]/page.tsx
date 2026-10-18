import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { CONDITION_DESCRIPTIONS, CONDITION_LABELS, productCardSelect } from "@/lib/catalog";
import { publicProductWhere, reservedCounts } from "@/lib/shop/inventory";
import { getCurrentUser } from "@/lib/auth/session";
import { effectivePrice, centsToDecimalString } from "@/lib/money";
import { site, whatsappLink } from "@/lib/site";
import { appUrl } from "@/lib/env";
import { Gallery } from "@/components/shop/gallery";
import { Price } from "@/components/shop/price";
import { AddToCartForm, QuestionForm, WishlistButton } from "@/components/shop/product-actions";
import { ProductGrid } from "@/components/shop/product-card";
import { Alert, Badge, Card, SectionHeading, Stars } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/layout/icons";
import { JsonLd } from "@/components/json-ld";

const getProduct = cache((slug: string) =>
  prisma.product.findFirst({
    where: { slug, ...publicProductWhere },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" }, include: { file: { select: { kind: true, mimeType: true } } } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" } },
      questions: { where: { status: "APPROVED", answer: { not: null } }, orderBy: { createdAt: "desc" } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Item not found" };
  const img = p.media.find((m) => m.file.kind === "IMAGE");
  return {
    title: `${p.title} — ${CONDITION_LABELS[p.condition]} condition`,
    description: `${p.brand} ${p.model}, second-hand, ${CONDITION_LABELS[p.condition].toLowerCase()} condition. ${p.description.slice(0, 120)}`,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: p.title, images: img ? [{ url: `/api/files/${img.fileId}` }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const user = await getCurrentUser();
  const [saved, reserved, related] = await Promise.all([
    user ? prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId: product.id } } }) : null,
    reservedCounts([product.id]),
    prisma.product.findMany({ where: { ...publicProductWhere, categoryId: product.categoryId, id: { not: product.id } }, select: productCardSelect, orderBy: { publishedAt: "desc" }, take: 4 }),
  ]);
  prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);

  const free = Math.max(0, product.quantity - (reserved.get(product.id) ?? 0));
  const purchasable = product.status === "AVAILABLE" && free > 0;
  const specs = Object.entries((product.specifications ?? {}) as Record<string, string>);
  const avg = product.reviews.length ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length : 0;
  const img = product.media.find((m) => m.file.kind === "IMAGE");

  return (
    <div className="container py-8 sm:py-12">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Product", name: product.title, brand: { "@type": "Brand", name: product.brand }, model: product.model, sku: product.sku, category: product.category.name,
        description: product.description, image: img ? appUrl(`/api/files/${img.fileId}`) : undefined, itemCondition: "https://schema.org/UsedCondition",
        offers: { "@type": "Offer", priceCurrency: "ZAR", price: centsToDecimalString(effectivePrice(product)), availability: purchasable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: appUrl(`/shop/${product.slug}`), itemCondition: "https://schema.org/UsedCondition" },
        ...(product.reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: product.reviews.length } } : {}),
      }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-bone-dim">
        <ol className="flex flex-wrap gap-1">
          <li><Link href="/shop" className="hover:text-amp">Shop</Link> /</li>
          <li><Link href={`/shop?category=${product.category.slug}`} className="hover:text-amp">{product.category.name}</Link> /</li>
          <li aria-current="page" className="text-bone-muted">{product.title}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        <Gallery title={product.title} media={product.media.map((m) => ({ fileId: m.fileId, altText: m.altText, kind: m.file.kind, mimeType: m.file.mimeType }))} />
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amp">{product.brand} · {product.category.name}</p>
            <h1 className="mt-2 font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl">{product.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="amp">Condition: {CONDITION_LABELS[product.condition]}</Badge>
              {product.isLeftHanded && <Badge>Left-handed</Badge>}
              {product.status === "RESERVED" && <Badge tone="warn">Reserved</Badge>}
              {product.reviews.length > 0 && <span className="flex items-center gap-1 text-sm text-bone-muted"><Stars rating={Math.round(avg)} /> ({product.reviews.length})</span>}
            </div>
          </div>
          <Price priceCents={product.priceCents} salePriceCents={product.salePriceCents} size="lg" />

          {purchasable ? (
            <AddToCartForm productId={product.id} maxQty={free} />
          ) : (
            <Alert tone="warn" title={product.status === "RESERVED" ? "Reserved" : "Currently in another customer's checkout"}>
              {product.status === "RESERVED" ? "This item is reserved and can't be bought right now." : "Someone is completing checkout for this item. If they don't, it becomes available again shortly — check back soon."}
            </Alert>
          )}
          <div className="flex flex-wrap gap-3">
            <WishlistButton productId={product.id} initiallySaved={Boolean(saved)} />
            <a href={whatsappLink(`Hi Guitarz4U, I'm interested in the ${product.title} (${product.sku}).`)} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "lg")}>
              <WhatsAppIcon className="h-5 w-5" /> Ask on WhatsApp
            </a>
          </div>

          <Card className="space-y-2 text-sm">
            <p className="font-semibold text-bone">Collection only · {site.area}</p>
            <p className="text-bone-muted">After your card payment is verified, we contact you privately with the collection address and to arrange a time. {site.hoursNote}</p>
            <p className="text-bone-dim">Ref: {product.sku}</p>
          </Card>

          <section aria-labelledby="cond-h">
            <h2 id="cond-h" className="font-display text-xl uppercase tracking-wide">Condition</h2>
            <p className="mt-1 text-sm text-bone-dim">{CONDITION_LABELS[product.condition]}: {CONDITION_DESCRIPTIONS[product.condition]}</p>
            {product.conditionNotes && <p className="mt-3 whitespace-pre-line text-bone-muted">{product.conditionNotes}</p>}
            <p className="mt-2 text-xs text-bone-dim">Read our <Link href="/policies/condition" className="link">condition disclosure</Link>.</p>
          </section>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        <section aria-labelledby="desc-h">
          <h2 id="desc-h" className="font-display text-2xl uppercase tracking-wide">Description</h2>
          <p className="mt-3 whitespace-pre-line text-bone-muted">{product.description || "Description coming soon. Ask us anything about this item."}</p>
        </section>
        {specs.length > 0 && (
          <section aria-labelledby="spec-h">
            <h2 id="spec-h" className="font-display text-2xl uppercase tracking-wide">Specifications</h2>
            <dl className="mt-3 divide-y divide-ink-500 rounded-xl border border-ink-500">
              {specs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[40%_1fr] gap-3 px-4 py-2.5 text-sm">
                  <dt className="text-bone-dim">{k}</dt>
                  <dd className="text-bone">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section id="questions" aria-labelledby="q-h">
          <h2 id="q-h" className="font-display text-2xl uppercase tracking-wide">Questions & answers</h2>
          <div className="mt-4 space-y-4">
            {product.questions.length === 0 && <p className="text-sm text-bone-muted">No questions answered yet.</p>}
            {product.questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-ink-500 p-4">
                <p className="font-semibold text-bone">Q: {q.question}</p>
                <p className="mt-2 text-bone-muted">A: {q.answer}</p>
              </div>
            ))}
            {user ? (user.emailVerifiedAt ? <QuestionForm productId={product.id} /> : <Alert tone="info">Verify your email address to ask questions.</Alert>) : (
              <p className="text-sm text-bone-muted"><Link href={`/login?next=/shop/${product.slug}`} className="link">Sign in</Link> to ask a question.</p>
            )}
          </div>
        </section>
        <section aria-labelledby="r-h">
          <h2 id="r-h" className="font-display text-2xl uppercase tracking-wide">Reviews</h2>
          <div className="mt-4 space-y-4">
            {product.reviews.length === 0 && <p className="text-sm text-bone-muted">No reviews for this item yet.</p>}
            {product.reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-ink-500 p-4">
                <Stars rating={r.rating} />
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 text-sm text-bone-muted">{r.body}</p>
                <p className="mt-2 text-xs text-bone-dim">— {r.displayName}{r.isVerifiedPurchase ? " · Verified purchase" : ""}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="rel-h">
          <SectionHeading eyebrow="You might also like" title="Related gear" />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
