import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/env';

// Only public pages and published guitars. Never account/admin pages or drafts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ['', '/shop', '/sell', '/repairs', '/about', '/how-it-works', '/contact', '/faq', '/reviews', '/sold', '/legal',
    '/legal/privacy', '/legal/terms', '/legal/collection-reservation', '/legal/seller-terms', '/legal/repair-terms', '/legal/returns', '/legal/cookies', '/legal/account-data'];
  const categories = ['electric', 'bass', 'acoustic', 'classical', 'electro-acoustic'];
  let products: { slug: string; updated_at: string; status: string }[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('products').select('slug, updated_at, status').in('status', ['available', 'reserved', 'sold']);
    products = data ?? [];
  } catch { /* database unavailable: static pages only */ }
  return [
    ...staticPages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...categories.map((c) => ({ url: `${SITE_URL}/shop?category=${c}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE_URL}/shop/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: 'weekly' as const, priority: p.status === 'sold' ? 0.3 : 0.9 })),
  ];
}
