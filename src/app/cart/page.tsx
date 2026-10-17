import type { Metadata } from "next";
import Link from "next/link";
import { getCart } from "@/lib/shop/cart";
import { formatZAR } from "@/lib/money";
import { fileUrl } from "@/lib/storage/uploads";
import { removeFromCart, updateCartQuantity } from "@/app/actions/shop";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const { user, items, subtotalCents, hasIssues } = await getCart();
  return (
    <>
      <PageHeader eyebrow="Checkout" title="Your cart" />
      <div className="container py-10">
        {items.length === 0 ? (
          <EmptyState title="Your cart is empty" action={<ButtonLink href="/shop">Browse the shop</ButtonLink>}>Find your next guitar in our inspected second-hand stock.</EmptyState>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <ul className="space-y-4" aria-label="Cart items">
              {items.map(({ product, quantity, lineTotalCents, purchasable, issue }) => (
                <li key={product.id} className="flex gap-4 rounded-xl border border-ink-500 bg-ink-800 p-4">
                  <div className="h-24 w-28 shrink-0 overflow-hidden rounded-md bg-ink-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {product.media[0] && <img src={fileUrl(product.media[0].fileId, "thumb")} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Link href={`/shop/${product.slug}`} className="font-semibold text-bone hover:text-amp">{product.title}</Link>
                    <p className="text-xs text-bone-dim">{product.category.name} · Ref {product.sku}</p>
                    {issue && <p className="text-sm text-danger">{issue}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      {product.quantity > 1 && purchasable && (
                        <form action={updateCartQuantity} className="flex items-center gap-2">
                          <input type="hidden" name="productId" value={product.id} />
                          <label className="text-xs text-bone-dim" htmlFor={`q-${product.id}`}>Qty</label>
                          <input id={`q-${product.id}`} name="quantity" type="number" min={1} max={product.quantity} defaultValue={quantity} className="w-16 rounded border border-ink-400 bg-ink-700 px-2 py-1 text-sm" />
                          <Button size="sm" variant="subtle" type="submit">Update</Button>
                        </form>
                      )}
                      <form action={removeFromCart}>
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" className="text-sm text-bone-dim underline hover:text-danger">Remove</button>
                      </form>
                    </div>
                  </div>
                  <p className="font-display text-lg">{purchasable ? formatZAR(lineTotalCents) : "—"}</p>
                </li>
              ))}
            </ul>
            <Card className="h-fit space-y-4">
              <h2 className="font-display text-xl uppercase tracking-wide">Summary</h2>
              <div className="flex justify-between text-bone-muted"><span>Subtotal</span><span className="text-bone">{formatZAR(subtotalCents)}</span></div>
              <p className="text-xs text-bone-dim">Discount codes can be applied at checkout. {site.collectionNote}</p>
              {hasIssues && <Alert tone="warn">Some items can't be bought right now. Remove them to continue.</Alert>}
              {user ? (
                hasIssues ? <Button disabled className="w-full">Checkout</Button> : <ButtonLink href="/checkout" size="lg" className="w-full">Checkout</ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/login?next=/checkout" size="lg" className="w-full">Sign in to check out</ButtonLink>
                  <p className="text-center text-xs text-bone-dim">An account is required so your receipt and private collection details stay secure. <Link href="/register?next=/checkout" className="link">Create one</Link> — your cart will be kept.</p>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
