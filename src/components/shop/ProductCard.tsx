import Link from "next/link";
import { ProductImage } from "./ProductImage";
import { Price } from "@/components/ui/Price";
import { AvailabilityBadge, DemoBadge } from "@/components/ui/Badges";
import { conditionLabel } from "@/lib/constants";
import type { ProductCardData } from "@/lib/data/products";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const unavailable = product.status !== "published" || product.quantity < 1;
  return (
    <article className="group card relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/5] overflow-hidden">
        <ProductImage
          path={product.image_path}
          alt={product.image_alt || product.title}
          priority={priority}
          className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${unavailable ? "opacity-75 grayscale-[35%]" : ""}`}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.featured && !unavailable && <span className="badge badge-gold">Featured</span>}
          {product.is_demo && <DemoBadge />}
        </div>
        {unavailable && (
          <div className="absolute right-3 top-3">
            <AvailabilityBadge status={product.status} quantity={product.quantity} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-xs uppercase tracking-wider text-tan">
          {[product.brand_name, product.category_name].filter(Boolean).join(" · ")}
        </p>
        <h3 className="text-base leading-snug sm:text-lg">
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.title}
          </Link>
        </h3>
        <p className="text-sm text-tan">Condition: {conditionLabel(product.condition)}</p>
        <div className="mt-auto pt-3">
          <Price price={Number(product.price)} compareAt={product.compare_at_price ? Number(product.compare_at_price) : null} size="sm" />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="card overflow-hidden">
          <div className="skeleton aspect-[4/5] rounded-none" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-5 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
