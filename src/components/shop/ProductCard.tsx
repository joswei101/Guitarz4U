import Image from "next/image";
import Link from "next/link";
import { CONDITION_LABELS } from "@/lib/constants";
import { formatZAR } from "@/lib/format";
import { productImageUrl } from "@/lib/images";
import type { ProductSummary } from "@/lib/data/products";

export function ProductCard({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  const image = product.images[0];
  const onOffer = product.compare_at_price !== null && product.compare_at_price > product.price;
  const reserved = product.status === "reserved";

  return (
    <article className="group card relative flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      <Link href={`/shop/${product.slug}`} className="block no-underline" aria-label={product.title}>
        <div className="relative aspect-[4/5] overflow-hidden bg-cream">
          <Image
            src={productImageUrl(image?.storage_path)}
            alt={image?.alt_text || product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            priority={priority}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {reserved && <span className="badge badge-warning shadow-sm">Reserved</span>}
            {onOffer && !reserved && <span className="badge badge-gold shadow-sm">Special offer</span>}
            {product.is_featured && !reserved && !onOffer && <span className="badge bg-deep/85 text-cream shadow-sm">Featured</span>}
          </div>
          {product.is_demo && (
            <span className="absolute bottom-3 left-3 badge bg-white/90 text-walnut shadow-sm">Demonstration listing</span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {product.brand?.name ?? "Unbranded"} · {product.category?.name.replace(" guitars", "") ?? "Guitar"}
        </p>
        <h3 className="font-display text-lg leading-snug">
          <Link href={`/shop/${product.slug}`} className="no-underline after:absolute after:inset-0 hover:text-gold-ink">
            {product.title}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="font-display text-xl font-semibold text-walnut">{formatZAR(product.price)}</p>
            {onOffer && (
              <p className="text-sm text-ink-soft line-through" aria-label={`Was ${formatZAR(product.compare_at_price)}`}>
                {formatZAR(product.compare_at_price)}
              </p>
            )}
          </div>
          <span className="badge badge-neutral">{CONDITION_LABELS[product.condition]}</span>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductSummary[]; priorityCount?: number }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
