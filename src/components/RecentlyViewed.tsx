'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// "Recently viewed" lives only in this browser's local storage.
const KEY = 'g4u_recent';
type Card = { id: string; slug: string; name: string; price: string; status: string; image: string | null };

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]').filter((x: unknown) => typeof x === 'string'); } catch { return []; }
}

/** Remembers a viewed product and (if analytics are allowed) counts the view. */
export function TrackView({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const list = [productId, ...read().filter((id) => id !== productId)].slice(0, 8);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch { /* storage unavailable */ }
    if (/(?:^|; )g4u_consent=all/.test(document.cookie)) {
      const body = JSON.stringify({ productId });
      navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }));
    }
  }, [productId]);
  return null;
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  useEffect(() => {
    const ids = read().filter((id) => id !== excludeId).slice(0, 4);
    if (!ids.length) return;
    fetch('/api/products/cards?ids=' + ids.join(','))
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Card[]) => setCards(d))
      .catch(() => {});
  }, [excludeId]);
  if (!cards.length) return null;
  return (
    <section style={{ marginTop: 36 }} aria-labelledby="recent-h">
      <h2 id="recent-h" style={{ fontSize: '1.3rem' }}>Recently viewed</h2>
      <div className="grid-3">
        {cards.map((c) => (
          <Link key={c.id} href={`/shop/${c.slug}`} className="card-plain row" style={{ textDecoration: 'none', color: 'inherit', flexWrap: 'nowrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.image ? <img src={c.image} alt="" width={56} height={70} style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 4 }} /> : null}
            <span><strong>{c.name}</strong><br /><span className="muted small">{c.status === 'sold' ? 'Sold' : c.price}{c.status === 'reserved' ? ' · Reserved' : ''}</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
