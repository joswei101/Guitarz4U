import Link from 'next/link';
import { toggleWishlist } from '@/app/actions/public';
import { ProductCard } from '@/components/ProductCard';
import { SubmitButton } from '@/components/forms';
import { Flash } from '@/components/Flash';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ProductWithImages } from '@/lib/products';

export default async function WishlistPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user } = await requireUser('/account/wishlist');
  const supabase = await createClient();
  const { data } = await supabase.from('wishlist_items')
    .select('created_at, products(*, product_images(id, path, thumb_path, alt, sort_order, width, height))')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  const items = (data ?? []).map((d) => d.products as unknown as ProductWithImages).filter(Boolean);
  return (
    <div className="stack">
      <h1>Wishlist</h1>
      <Flash ok={sp.ok} error={sp.error} />
      {items.length ? (
        <div className="product-grid">
          {items.map((p) => (
            <div key={p.id} className="stack">
              <ProductCard product={p} />
              <form action={toggleWishlist}>
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="back" value="/account/wishlist" />
                <SubmitButton className="btn btn-outline btn-small btn-block" pendingText="Removing…">Remove from wishlist</SubmitButton>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><h2>Your wishlist is empty</h2><p>Tap &quot;Save to wishlist&quot; on any guitar to keep track of it here.</p><Link href="/shop" className="btn btn-primary">Browse guitars</Link></div>
      )}
    </div>
  );
}
