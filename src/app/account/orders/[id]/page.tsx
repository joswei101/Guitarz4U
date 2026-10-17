import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { CUSTOMER_CANCELLABLE, ORDER_STATUS_LABELS, PAID_STATUSES } from "@/lib/shop/order-status";
import { requestOrderCancellationAction } from "@/app/actions/account";
import { Alert, Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/forms/action-form";
import { OrderStatusBadge, fmtDate } from "@/components/status-badges";
import { site } from "@/lib/site";

export const metadata = { title: "Order details" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/account/orders/${id}`);
  const order = await prisma.order.findFirst({ where: { id, userId: user.id }, include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } }, payments: true, refunds: true } });
  if (!order) notFound();
  const paid = PAID_STATUSES.includes(order.status) && order.payments.some((p) => p.status === "COMPLETE");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-wide">Order {order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.status === "AWAITING_PAYMENT" && order.reservationExpiresAt && order.reservationExpiresAt > new Date() && (
        <Alert tone="warn">Awaiting payment confirmation from PayFast. If you closed the payment page, <a href={`/checkout/pay/${order.id}`}>continue to payment</a> before your reservation expires.</Alert>
      )}
      {order.requiresAttention && order.status === "REFUND_PENDING" && <Alert tone="warn">Your payment arrived after the item was no longer available. A full refund has been approved and will be processed via the payment gateway.</Alert>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl uppercase">Items</h2>
          <ul className="mt-3 divide-y divide-ink-500 text-sm">
            {order.items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-2"><span>{i.title} × {i.quantity}</span><span>{formatZAR(i.lineTotalCents)}</span></li>)}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-ink-500 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-bone-muted">Subtotal</dt><dd>{formatZAR(order.subtotalCents)}</dd></div>
            {order.discountCents > 0 && <div className="flex justify-between"><dt className="text-bone-muted">Discount</dt><dd>−{formatZAR(order.discountCents)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatZAR(order.totalCents)}</dd></div>
          </dl>
          {paid && <a href={`/api/receipts/${order.id}`} className={buttonClass("outline", "sm", "mt-4")}>Download receipt (PDF)</a>}
        </Card>
        <Card>
          <h2 className="font-display text-xl uppercase">Collection</h2>
          {order.collectionDetails ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="whitespace-pre-line text-bone">{order.collectionDetails}</p>
              {order.collectionScheduledFor && <p className="text-bone-muted">Scheduled: {fmtDate(order.collectionScheduledFor, true)}</p>}
            </div>
          ) : (
            <p className="mt-3 text-sm text-bone-muted">{paid ? "We'll contact you privately to arrange collection. The address will appear here once arranged." : site.collectionNote}</p>
          )}
        </Card>
      </div>
      <Card>
        <h2 className="font-display text-xl uppercase">Status history</h2>
        <ol className="mt-3 space-y-3 border-l border-ink-400 pl-5 text-sm">
          {order.statusHistory.map((h) => (
            <li key={h.id}>
              <p className="text-bone">{ORDER_STATUS_LABELS[h.toStatus]}</p>
              <p className="text-xs text-bone-dim">{fmtDate(h.createdAt, true)}{h.note ? ` — ${h.note}` : ""}</p>
            </li>
          ))}
        </ol>
      </Card>
      {order.refunds.length > 0 && (
        <Card>
          <h2 className="font-display text-xl uppercase">Refunds</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {order.refunds.map((r) => <li key={r.id}>{formatZAR(r.amountCents)} — {r.status === "COMPLETED" ? `Refunded (gateway ref ${r.gatewayReference})` : r.status === "DECLINED" ? "Declined" : "In progress"}{r.decisionNote ? ` · ${r.decisionNote}` : ""}</li>)}
          </ul>
        </Card>
      )}
      {CUSTOMER_CANCELLABLE.includes(order.status) && (
        <Card>
          <h2 className="font-display text-xl uppercase">Request cancellation</h2>
          <p className="mt-2 text-sm text-bone-muted">The owner reviews every cancellation request. See the <a className="link" href="/policies/returns">returns, refunds & cancellations policy</a>.</p>
          <ActionForm action={requestOrderCancellationAction} submitLabel="Request cancellation" variant="outline" hideOnSuccess className="mt-4 space-y-4">
            <input type="hidden" name="orderId" value={order.id} />
            <Field label="Reason" htmlFor="reason" required><Textarea id="reason" name="reason" required minLength={5} /></Field>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
