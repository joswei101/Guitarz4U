import Link from "next/link";
import type { ProductCard as Card } from "@/lib/products";
import { conditionLabel, formatRand } from "@/lib/format";
import { IconGuitar } from "./icons";

export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const title = [p.brand, p.model].filter(Boolean).join(" ");
  return (
    <article className="product-card" data-testid="product-card">
      <div className="media">
        <div className="badges">
          {p.status === "reserved" && <span className="tag tag-dark">Reserved</span>}
          {p.compareAtPriceCents && <span className="tag tag-gold">Special offer</span>}
          {p.featured && p.status !== "reserved" && <span className="tag">Featured</span>}
          {p.isDemo && <span className="tag tag-demo">Demo listing</span>}
        </div>
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image.url} alt={p.image.alt} loading={priority ? "eager" : "lazy"} decoding="async" width={400} height={500} />
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted)" }}>
            <IconGuitar className="brand-mark" />
            <span className="sr-only">No photo yet</span>
          </div>
        )}
      </div>
      <div className="body">
        <span className="brandline">{p.category}</span>
        <h3><Link href={`/shop/${p.slug}`}>{p.title}</Link></h3>
        {title && title !== p.title && <span className="small muted">{title}</span>}
        <span className="condition">{conditionLabel(p.condition)}</span>
        <div className="price-row">
          <span className="price">{formatRand(p.priceCents)}</span>
          {p.compareAtPriceCents && <span className="price-was">{formatRand(p.compareAtPriceCents)}</span>}
        </div>
      </div>
    </article>
  );
}
