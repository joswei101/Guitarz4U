"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";
import { publicImageUrl } from "@/lib/images";
import { formatRand } from "@/lib/format";

export type RecentItem = { id: string; slug: string; title: string; price: number; image: string | null };
const KEY = "g4u-recently-viewed-v1";

export function rememberViewed(item: RecentItem) {
  try {
    const list: RecentItem[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [item, ...list.filter((i) => i.id !== item.id)].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Recently viewed items are stored only in this browser (never sent to us). */
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);
  useEffect(() => {
    try {
      const list: RecentItem[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only storage after mount
      setItems(list.filter((i) => i.id !== excludeId).slice(0, 4));
    } catch {
      /* ignore */
    }
  }, [excludeId]);
  if (!items.length) return null;
  return (
    <section className="py-12" aria-labelledby="recent-heading">
      <div className="container-page">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-2xl">
            Recently viewed
          </h2>
          <button
            type="button"
            className="link text-sm"
            onClick={() => {
              localStorage.removeItem(KEY);
              setItems([]);
            }}
          >
            Clear
          </button>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/shop/${i.slug}`} className="card group flex h-full flex-col overflow-hidden">
                {i.image ? (
                  <img src={publicImageUrl(i.image)!} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square w-full bg-cream-2" />
                )}
                <span className="p-3 text-sm">
                  <span className="line-clamp-2 font-semibold group-hover:underline">{i.title}</span>
                  <span className="text-tan">{formatRand(i.price)} when viewed</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
