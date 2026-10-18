import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/shop/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ProductCardData } from "@/lib/data/products";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const { user } = await requireUser("/account/wishlist");
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select("created_at, product:products(id, slug, title, model, price, compare_at_price, condition, status, featured, is_demo, quantity, brand:brands(name), category:categories(name), images:product_images(storage_path, alt_text, sort_order))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const products: ProductCardData[] = (data ?? [])
    .map((w) => w.product)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => {
      const img = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        ...p,
        brand_name: p.brand?.name ?? null,
        category_name: p.category?.name ?? null,
        image_path: img?.storage_path ?? null,
        image_alt: img?.alt_text ?? null,
      };
    });
  return (
    <div>
      <h2 className="mb-4 text-2xl">Wishlist</h2>
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState title="Your wishlist is empty" action={{ href: "/shop", label: "Browse the shop" }}>
          Tap &ldquo;Add to wishlist&rdquo; on any item to save it here.
        </EmptyState>
      )}
    </div>
  );
}
