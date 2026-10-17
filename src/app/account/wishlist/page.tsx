import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { productCardSelect } from "@/lib/catalog";
import { ProductGrid } from "@/components/shop/product-card";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await requireUserPage("/account/wishlist");
  const items = await prisma.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: productCardSelect } } });
  const visible = items.filter((i) => ["AVAILABLE", "RESERVED"].includes(i.product.status) && i.product.publishedAt);
  const gone = items.length - visible.length;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">Wishlist & favourites</h1>
      {visible.length ? <ProductGrid products={visible.map((i) => i.product)} /> : <EmptyState title="Nothing saved yet" action={<ButtonLink href="/shop">Browse the shop</ButtonLink>}>Tap “Save to wishlist” on any product to keep track of it.</EmptyState>}
      {gone > 0 && <p className="text-sm text-bone-dim">{gone} saved item{gone === 1 ? " has" : "s have"} since been sold or removed.</p>}
    </div>
  );
}
