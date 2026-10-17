import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guards";
import { cancelCheckout } from "@/lib/shop/orders";
import { Alert, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

export default async function CancelPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const user = await requireUserPage("/cart");
  if (order) await cancelCheckout(order, user.id);
  return (
    <>
      <PageHeader eyebrow="Checkout" title="Payment cancelled" />
      <div className="container max-w-2xl space-y-6 py-10">
        <Alert tone="warn">You cancelled the payment, so no money was taken and your order was not placed. The items are back in your cart if they're still available.</Alert>
        <div className="flex gap-3"><ButtonLink href="/cart">Return to cart</ButtonLink><ButtonLink href="/shop" variant="outline">Keep shopping</ButtonLink></div>
      </div>
    </>
  );
}
