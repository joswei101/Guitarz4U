import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatZAR } from "@/lib/format";
import { productImageUrl } from "@/lib/images";
import { CONDITION_LABELS, type ProductCondition } from "@/lib/constants";
import { EmptyState } from "@/components/ui/EmptyState";
import { removeWishlistAction } from "@/app/(site)/account/actions";

export const metadata: Metadata = { title: "My wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlists")
    .select("product_id, created_at, product:products(id, slug, title, price, status, condition, images:product_images(storage_path, sort_order))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as {
    product_id: string;
    product: { id: string; slug: string; title: string; price: number; status: string; condition: ProductCondition; images: { storage_path: string; sort_order: number }[] } | null;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Wishlist</h1>
      {rows.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ product_id, product }) => (
            <li key={product_id} className="card flex gap-4 p-3">
              {product ? (
                <>
                  <Link href={`/shop/${product.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-cream">
                    <Image src={productImageUrl([...product.images].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path)} alt="" fill sizes="6rem" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/shop/${product.slug}`} className="font-semibold text-walnut hover:text-gold-ink">
                      {product.title}
                    </Link>
                    <p className="text-sm">{formatZAR(product.price)}</p>
                    <p className="text-xs text-ink-soft">{CONDITION_LABELS[product.condition]}</p>
                    {product.status === "reserved" && <p className="text-xs font-semibold text-warning">Currently reserved</p>}
                    <form action={removeWishlistAction} className="mt-auto">
                      <input type="hidden" name="product_id" value={product_id} />
                      <button type="submit" className="text-sm text-ink-soft underline underline-offset-2 hover:text-danger">
                        Remove
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex w-full items-center justify-between gap-3 p-2">
                  <p className="text-sm text-ink-soft">This guitar is no longer available.</p>
                  <form action={removeWishlistAction}>
                    <input type="hidden" name="product_id" value={product_id} />
                    <button type="submit" className="btn btn-outline btn-sm">
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Your wishlist is empty" action={{ href: "/shop", label: "Browse guitars" }}>
          <p>Tap &ldquo;Add to wishlist&rdquo; on any guitar to save it here.</p>
        </EmptyState>
      )}
    </div>
  );
}
