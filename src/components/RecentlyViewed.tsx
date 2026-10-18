"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRecentlyViewed } from "@/lib/cart-store";
import type { ProductCard } from "@/lib/products";
import { formatRand } from "@/lib/format";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const ids = useRecentlyViewed().filter((id) => id !== excludeId).slice(0, 4);
  const key = ids.join(",");
  const [items, setItems] = useState<ProductCard[]>([]);
  useEffect(() => {
    if (!key) return setItems([]);
    fetch(`/api/products?ids=${key}`)
      .then((r) => r.json())
      .then((d) => setItems(d.products ?? []))
      .catch(() => setItems([]));
  }, [key]);
  if (items.length === 0) return null;
  return (
    <section style={{ marginTop: 40 }} aria-labelledby="recent-h">
      <h2 id="recent-h" style={{ fontSize: "1.3rem" }}>Recently viewed</h2>
      <div className="grid-3">
        {items.map((p) => (
          <Link key={p.id} href={`/shop/${p.slug}`} className="card-flat row" style={{ textDecoration: "none", flexWrap: "nowrap" }}>
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image.url} alt="" width={64} height={80} loading="lazy" style={{ width: 64, height: 80, objectFit: "cover", borderRadius: 6 }} />
            )}
            <span>
              <strong style={{ display: "block" }}>{p.title}</strong>
              <span className="small muted">{formatRand(p.priceCents)}{p.status === "reserved" ? " · Reserved" : ""}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
