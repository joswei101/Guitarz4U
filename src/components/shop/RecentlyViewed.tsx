"use client";

import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/local-store";
import { formatZAR } from "@/lib/format";

export type RecentItem = { id: string; slug: string; title: string; price: number; image: string };

export const recentStore = createLocalStore<RecentItem[]>("g4u-recently-viewed", [], (v) =>
  Array.isArray(v) ? v.filter((i) => i && typeof i.slug === "string").slice(0, 8) : [],
);

export function rememberViewed(item: RecentItem) {
  recentStore.set((prev) => [item, ...prev.filter((p) => p.id !== item.id)].slice(0, 8));
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const items = useSyncExternalStore(recentStore.subscribe, recentStore.get, recentStore.getServer).filter(
    (i) => i.id !== excludeId,
  );
  if (!items.length) return null;
  return (
    <section className="container-page py-12" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="mb-5 text-2xl">
        Recently viewed
      </h2>
      <ul className="flex snap-x gap-4 overflow-x-auto pb-2">
        {items.map((i) => (
          <li key={i.id} className="w-40 shrink-0 snap-start sm:w-48">
            <Link href={`/shop/${i.slug}`} className="group block no-underline">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-cream">
                <Image src={i.image} alt="" fill sizes="12rem" className="object-cover transition-transform group-hover:scale-105" />
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-walnut">{i.title}</p>
              <p className="text-sm text-ink-soft">{formatZAR(i.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-soft">
        Stored only in this browser. Items may have sold since you viewed them.
      </p>
    </section>
  );
}
