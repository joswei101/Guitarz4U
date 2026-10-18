import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { CONDITION_LABELS } from "@/lib/catalog";
import { fileUrl } from "@/lib/storage/uploads";
import { Badge } from "../ui/misc";
import { GuitarGlyph } from "../ui/logo";
import { Price } from "./price";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const img = product.media.find((m) => m.file.kind === "IMAGE");
  const onSale = product.salePriceCents != null && product.salePriceCents < product.priceCents;
  const isNew = product.publishedAt && Date.now() - product.publishedAt.getTime() < 14 * 86400000;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-ink-500 bg-ink-700/50 transition duration-200 hover:-translate-y-0.5 hover:border-amp/60 hover:shadow-amp">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-800">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(img.fileId, "thumb")} alt={img.altText ?? product.title} loading={priority ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-ink-400"><GuitarGlyph className="h-24 w-auto" /></div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.status === "RESERVED" && <Badge tone="warn">Reserved</Badge>}
          {onSale && <Badge tone="amp">Sale</Badge>}
          {isNew && <Badge tone="info">New in</Badge>}
          {product.isLeftHanded && <Badge>Left-handed</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-widest text-bone-dim">{product.category.name}</p>
        <h3 className="text-base font-semibold leading-snug text-bone">
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.title}
          </Link>
        </h3>
        <p className="text-xs text-bone-muted">Condition: <span className="text-bone">{CONDITION_LABELS[product.condition]}</span></p>
        <div className="mt-auto pt-2"><Price priceCents={product.priceCents} salePriceCents={product.salePriceCents} /></div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
    </div>
  );
}
