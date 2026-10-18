"use client";

import { useEffect, useState } from "react";
import { Alert } from "../ui/misc";
import { ButtonLink } from "../ui/button";

const PAID = ["PAID", "COLLECTION_PENDING", "READY_FOR_COLLECTION", "COLLECTED"];
const FAILED = ["PAYMENT_FAILED", "EXPIRED", "CANCELLED"];

/** Polls the order's server-side status until the gateway's verified notification has been processed. */
export function PaymentStatusPoller({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (status && (PAID.includes(status) || FAILED.includes(status) || status === "REFUND_PENDING")) return;
    if (tries > 40) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) setStatus(((await res.json()) as { status: string }).status);
      } finally {
        setTries((n) => n + 1);
      }
    }, tries === 0 ? 300 : 3000);
    return () => clearTimeout(t);
  }, [orderId, status, tries]);

  if (status && PAID.includes(status))
    return (
      <div className="space-y-6">
        <Alert tone="ok" title="Payment confirmed">Your payment for order {orderNumber} has been verified. A confirmation email is on its way, and we'll contact you privately to arrange collection.</Alert>
        <div className="flex gap-3"><ButtonLink href={`/account/orders/${orderId}`}>View order & receipt</ButtonLink><ButtonLink href="/shop" variant="outline">Keep shopping</ButtonLink></div>
      </div>
    );
  if (status === "REFUND_PENDING") return <Alert tone="warn" title="Payment received — item unavailable">Your payment arrived after the item was no longer available. The owner has been alerted and will refund you in full. Please see your order for details.</Alert>;
  if (status && FAILED.includes(status))
    return (
      <div className="space-y-6">
        <Alert tone="danger" title="Payment not completed">The payment gateway did not confirm a successful payment for order {orderNumber}. No order has been placed.</Alert>
        <ButtonLink href="/cart">Return to cart</ButtonLink>
      </div>
    );
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-400 border-t-amp" />
      <p className="text-bone">We're waiting for PayFast to confirm your payment for order {orderNumber}…</p>
      <p className="text-sm text-bone-muted">This usually takes a few seconds. Your order is only confirmed once the payment is verified directly with the gateway.</p>
      {tries > 40 && <Alert tone="info">Still waiting. You can safely close this page — your order status will update in <a href={`/account/orders/${orderId}`}>your account</a> and you'll get an email once payment is confirmed.</Alert>}
    </div>
  );
}
