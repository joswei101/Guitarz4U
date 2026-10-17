import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserPage } from "@/lib/auth/guards";
import { getCart } from "@/lib/shop/cart";
import { formatZAR } from "@/lib/money";
import { features } from "@/lib/env";
import { site } from "@/lib/site";
import { RESERVATION_MINUTES } from "@/lib/shop/inventory";
import { Alert, Card, PageHeader } from "@/components/ui/misc";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { ResendVerification } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Secure checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUserPage("/checkout");
  const { items, subtotalCents, hasIssues } = await getCart();
  if (items.length === 0 || hasIssues) redirect("/cart");
  return (
    <>
      <PageHeader eyebrow="Secure checkout" title="Review & pay" />
      <div className="container grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {!user.emailVerifiedAt && (
            <Alert tone="warn" title="Please verify your email to check out">
              We sent a verification link to {user.email}. <div className="mt-3"><ResendVerification /></div>
            </Alert>
          )}
          {!features.payfast() && <Alert tone="warn" title="Card payments not yet enabled">Online payments haven't been configured yet. Please WhatsApp us on {site.whatsappDisplay} to buy this item.</Alert>}
          <Card>
            <h2 className="font-display text-xl uppercase tracking-wide">Items</h2>
            <table className="table-base mt-3">
              <thead><tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Price</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.product.id}><td className="text-bone">{i.product.title}<br /><span className="text-xs text-bone-dim">Ref {i.product.sku}</span></td><td className="text-right">{i.quantity}</td><td className="text-right">{formatZAR(i.lineTotalCents)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="space-y-2 text-sm">
            <h2 className="font-display text-xl uppercase tracking-wide">Collection only</h2>
            <p className="text-bone-muted">{site.collectionNote} {site.hoursNote}</p>
            <p className="text-bone-muted">Your items are held for {RESERVATION_MINUTES} minutes while you complete payment. Your order is confirmed only once PayFast verifies the payment with us.</p>
            <p className="text-bone-dim">Read: <Link href="/policies/terms" className="link" target="_blank">Terms</Link> · <Link href="/policies/returns" className="link" target="_blank">Returns, refunds & cancellations</Link> · <Link href="/policies/collection" className="link" target="_blank">Collection policy</Link> · <Link href="/policies/condition" className="link" target="_blank">Condition disclosure</Link></p>
          </Card>
        </div>
        <CheckoutForm subtotal={formatZAR(subtotalCents)} defaultPhone={user.phone ?? ""} disabled={!user.emailVerifiedAt || !features.payfast()} />
      </div>
    </>
  );
}
