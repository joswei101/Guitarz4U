import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { SUPABASE_URL } from '@/lib/env';
import type { Database } from '@/lib/database.types';

export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ImageRow = Pick<Database['public']['Tables']['product_images']['Row'], 'id' | 'path' | 'thumb_path' | 'alt' | 'sort_order' | 'width' | 'height'>;
export type ProductWithImages = ProductRow & { product_images: ImageRow[] };

export const PUBLIC_STATUSES = ['available', 'reserved', 'sold'] as const;

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export function sortImages(images: ImageRow[] | null | undefined): ImageRow[] {
  return [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

const SELECT = '*, product_images(id, path, thumb_path, alt, sort_order, width, height)';

/**
 * Expires overdue reservations. Safe and cheap to call on page loads; runs at
 * most once per request. It must run BEFORE any product query in a request
 * (including generateMetadata), because Next.js re-uses identical data
 * requests within one render and would otherwise show a stale status.
 */
export const expireReservations = cache(async () => {
  try {
    const supabase = await createClient();
    await supabase.rpc('expire_reservations');
  } catch {
    // Non-fatal: the scheduled job will catch up.
  }
});

export type ShopFilters = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  availability?: string; // available | reserved | all
  min?: string;
  max?: string;
  sort?: string; // newest | price-asc | price-desc
  page?: string;
};

export const PAGE_SIZE = 24;

function cleanSearch(q: string) {
  return q.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export async function listShopProducts(f: ShopFilters) {
  const supabase = await createClient();
  let query = supabase.from('products').select(SELECT, { count: 'exact' });

  if (f.availability === 'available') query = query.eq('status', 'available');
  else if (f.availability === 'reserved') query = query.eq('status', 'reserved');
  else query = query.in('status', ['available', 'reserved']);

  if (f.category) query = query.eq('category', f.category);
  if (f.condition) query = query.eq('condition', f.condition);
  if (f.brand) query = query.ilike('brand', cleanSearch(f.brand));
  const min = Number(f.min);
  const max = Number(f.max);
  if (f.min && Number.isFinite(min)) query = query.gte('price', min);
  if (f.max && Number.isFinite(max)) query = query.lte('price', max);
  const q = cleanSearch(f.q ?? '');
  if (q) {
    const words = q.split(' ').filter(Boolean).join(' ');
    query = query.or(`brand.ilike.%${words}%,model.ilike.%${words}%,search.wfts(english).${words}`);
  }

  if (f.sort === 'price-asc') query = query.order('price', { ascending: true });
  else if (f.sort === 'price-desc') query = query.order('price', { ascending: false });
  else query = query.order('published_at', { ascending: false, nullsFirst: false });

  const page = Math.max(1, Number(f.page) || 1);
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) console.error('listShopProducts', error.message);
  return { products: (data ?? []) as ProductWithImages[], total: count ?? 0, page };
}

export async function listBrands(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('products').select('brand').in('status', ['available', 'reserved']);
  return [...new Set((data ?? []).map((r) => r.brand.trim()))].sort((a, b) => a.localeCompare(b));
}

export async function listHomeProducts() {
  const supabase = await createClient();
  const [featured, latest] = await Promise.all([
    supabase.from('products').select(SELECT).in('status', ['available', 'reserved']).eq('is_featured', true)
      .order('published_at', { ascending: false }).limit(4),
    supabase.from('products').select(SELECT).in('status', ['available', 'reserved'])
      .order('published_at', { ascending: false }).limit(8),
  ]);
  const latestRows = (latest.data ?? []) as ProductWithImages[];
  const newArrivals = latestRows.filter((p) => p.is_new_arrival).slice(0, 4);
  return {
    featured: (featured.data ?? []) as ProductWithImages[],
    newArrivals: newArrivals.length ? newArrivals : latestRows.slice(0, 4),
    anyStock: latestRows.length > 0,
  };
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('products').select(SELECT).eq('slug', slug).maybeSingle();
  return (data as ProductWithImages | null) ?? null;
}

export async function listRelated(p: ProductRow) {
  const supabase = await createClient();
  const { data } = await supabase.from('products').select(SELECT)
    .in('status', ['available', 'reserved']).eq('category', p.category).neq('id', p.id)
    .order('published_at', { ascending: false }).limit(4);
  return (data ?? []) as ProductWithImages[];
}

export async function listSold(page = 1) {
  const supabase = await createClient();
  const { data, count } = await supabase.from('products').select(SELECT, { count: 'exact' })
    .eq('status', 'sold').order('sold_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return { products: (data ?? []) as ProductWithImages[], total: count ?? 0 };
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from('products').select(SELECT).in('id', ids);
  const rows = (data ?? []) as ProductWithImages[];
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as ProductWithImages[];
}
