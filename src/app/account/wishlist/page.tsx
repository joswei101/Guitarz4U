import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { getProductsByIds } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Empty } from "@/components/ui";

export default async function MyWishlist() {
  const user = await requireUser();
  const rows = await query<{ product_id: string; status: string; title: string }>(
    "select w.product_id, p.status, p.title from wishlists w join products p on p.id=w.product_id where w.user_id=$1 order by w.created_at desc",
    [user.id],
  );
  const live = await getProductsByIds(rows.map((r) => r.product_id));
  const gone = rows.filter((r) => !live.find((p) => p.id === r.product_id));
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Wishlist</h1>
      {rows.length === 0 ? <Empty title="Your wishlist is empty"><p className="muted">Tap “Add to wishlist” on any guitar to save it here.</p><Link className="btn btn-primary btn-sm" href="/shop">Browse guitars</Link></Empty> : (
        <div className="product-grid">{live.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      )}
      {gone.length > 0 && (
        <div className="card-flat"><strong>No longer available:</strong> {gone.map((g) => g.title).join(", ")}</div>
      )}
    </div>
  );
}
