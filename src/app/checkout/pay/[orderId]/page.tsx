import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { buildPaymentForm } from "@/lib/payfast";
import { appUrl } from "@/lib/env";
import { centsToDecimalString, formatZAR } from "@/lib/money";
import { AutoSubmitForm } from "@/components/shop/auto-submit-form";
import { Card, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Redirecting to secure payment", robots: { index: false } };

/** Builds the signed PayFast request on the server (amount and reference come from the database). */
export default async function PayOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await requireUserPage(`/checkout/pay/${orderId}`);
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id }, include: { items: true, payments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) notFound();
  if (order.status !== "AWAITING_PAYMENT" || !order.payments[0] || (order.reservationExpiresAt && order.reservationExpiresAt < new Date())) redirect(`/account/orders/${order.id}`);
  const payment = order.payments[0];
  const [first, ...rest] = order.customerName.split(" ");
  const form = buildPaymentForm({
    reference: payment.reference,
    amount: centsToDecimalString(payment.amountCents),
    itemName: `Guitarz4U order ${order.orderNumber}`,
    itemDescription: order.items.map((i) => i.title).join(", "),
    firstName: first,
    lastName: rest.join(" ") || undefined,
    email: order.customerEmail,
    returnUrl: appUrl(`/checkout/return?order=${order.id}`),
    cancelUrl: appUrl(`/checkout/cancel?order=${order.id}`),
    notifyUrl: appUrl(`/api/payments/payfast/notify`),
    customStr1: order.id,
  });
  return (
    <>
      <PageHeader eyebrow="Secure payment" title="Taking you to PayFast" />
      <div className="container max-w-xl py-10">
        <Card className="space-y-4 text-center">
          <p className="text-bone-muted">Order <span className="text-bone">{order.orderNumber}</span> · Total <span className="text-bone">{formatZAR(order.totalCents)}</span></p>
          <p className="text-sm text-bone-dim">Your items are reserved until {order.reservationExpiresAt?.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })}.</p>
          <AutoSubmitForm action={form.action} fields={form.fields} />
        </Card>
      </div>
    </>
  );
}
