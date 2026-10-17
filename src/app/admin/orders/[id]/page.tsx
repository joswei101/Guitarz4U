import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { ADMIN_ORDER_TRANSITIONS, ORDER_STATUS_LABELS, PAID_STATUSES } from "@/lib/shop/order-status";
import { createRefundAction, saveCollectionAction, saveOrderNotesAction, updateOrderStatusAction, updateRefundAction } from "@/app/actions/admin/orders";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Alert, Badge, Card } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/button";
import { OrderStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "Order" };

function toLocalInput(d: Date | null) {
  if (!d) return "";
  return new Date(d.getTime() + 2 * 3600000).toISOString().slice(0, 16);
}

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requirePermissionPage("orders:manage");
  const { id } = await params;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { id: true, acquisitionCostCents: true, refurbishmentCostCents: true } } } }, payments: { orderBy: { createdAt: "asc" } }, refunds: { orderBy: { createdAt: "asc" } }, statusHistory: { orderBy: { createdAt: "asc" } }, reservations: true, discountCode: true, user: { select: { id: true, email: true, status: true } } } });
  if (!o) notFound();
  const events = await prisma.paymentEvent.findMany({ where: { reference: { in: o.payments.map((p) => p.reference) } }, orderBy: { createdAt: "asc" } });
  const transitions = ADMIN_ORDER_TRANSITIONS[o.status] ?? [];
  const paidCents = o.payments.filter((p) => p.status === "COMPLETE").reduce((s, p) => s + p.amountCents, 0);
  const paid = PAID_STATUSES.includes(o.status) && paidCents > 0;
  const cost = o.items.reduce((s, i) => s + ((i.product.acquisitionCostCents ?? 0) + (i.product.refurbishmentCostCents ?? 0)) * i.quantity, 0);
  return (
    <div className="max-w-6xl space-y-6">
      <AdminHeader title={`Order ${o.orderNumber}`} back={{ href: "/admin/orders", label: "Orders" }}>
        <OrderStatusBadge status={o.status} />
        {paid && <a href={`/api/receipts/${o.id}`} className={buttonClass("outline", "sm")}>Receipt PDF</a>}
      </AdminHeader>
      {o.requiresAttention && <Alert tone="danger" title="Needs attention">{o.attentionReason ?? "Flagged for review."}</Alert>}
      {o.status === "CANCELLATION_REQUESTED" && <Alert tone="warn" title="Customer requested cancellation">{o.cancellationReason} — choose “Cancelled” or “Refund pending” to approve, or move it back to its collection status to decline (and tell the customer why).</Alert>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-lg uppercase">Items</h2>
            <div className="mt-3"><Table>
              <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>{o.items.map((i) => <tr key={i.id}><td><Link className="link" href={`/admin/products/${i.product.id}`}>{i.title}</Link></td><td className="font-mono text-xs">{i.sku}</td><td>{i.quantity}</td><td>{formatZAR(i.lineTotalCents)}</td></tr>)}</tbody>
            </Table></div>
            <dl className="mt-3 grid grid-cols-2 gap-1 text-sm sm:w-80 sm:ml-auto">
              <dt className="text-bone-dim">Subtotal</dt><dd className="text-right">{formatZAR(o.subtotalCents)}</dd>
              {o.discountCents > 0 && <><dt className="text-bone-dim">Discount ({o.discountCode?.code})</dt><dd className="text-right">−{formatZAR(o.discountCents)}</dd></>}
              <dt className="font-semibold">Total</dt><dd className="text-right font-semibold">{formatZAR(o.totalCents)}</dd>
              <dt className="text-bone-dim">Recorded item cost</dt><dd className="text-right">{formatZAR(cost)}</dd>
              <dt className="text-bone-dim">Est. gross profit</dt><dd className="text-right">{formatZAR(o.totalCents - cost)}</dd>
            </dl>
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">Payments (gateway-verified only)</h2>
            <div className="mt-3"><Table>
              <thead><tr><th>Reference</th><th>Gateway ID</th><th>Amount</th><th>Fee</th><th>Status</th><th>Verified</th></tr></thead>
              <tbody>{o.payments.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.reference}</td><td className="font-mono text-xs">{p.providerPaymentId ?? "—"}</td><td>{formatZAR(p.amountCents)}</td><td>{p.feeCents != null ? formatZAR(p.feeCents) : "—"}</td><td><Badge tone={p.status === "COMPLETE" ? "ok" : p.status === "PENDING" ? "warn" : "danger"}>{p.status.toLowerCase()}</Badge></td><td className="whitespace-nowrap">{fmtDate(p.verifiedAt, true)}</td></tr>)}</tbody>
            </Table></div>
            {events.length > 0 && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-amp">Gateway notifications ({events.length})</summary>
                <ul className="mt-2 space-y-1 text-bone-muted">{events.map((ev) => <li key={ev.id}>{fmtDate(ev.createdAt, true)} · {ev.eventKey} · signature {ev.signatureValid ? "valid" : "INVALID"} · {ev.outcome ?? "pending"}</li>)}</ul>
              </details>
            )}
          </Card>
          <Card className="space-y-4">
            <h2 className="font-display text-lg uppercase">Refunds</h2>
            <p className="text-xs text-bone-dim">Record decisions here. Refunds are processed in your PayFast dashboard; a refund is only marked complete once you enter the gateway&apos;s reference confirming it.</p>
            {o.refunds.map((r) => (
              <div key={r.id} className="rounded-lg border border-ink-500 p-3 text-sm">
                <p><strong>{formatZAR(r.amountCents)}</strong> · <Badge tone={r.status === "COMPLETED" ? "ok" : r.status === "DECLINED" || r.status === "FAILED" ? "danger" : "warn"}>{r.status.toLowerCase()}</Badge> · {r.reason}</p>
                {r.gatewayReference && <p className="text-xs text-bone-dim">Gateway ref {r.gatewayReference} · confirmed {fmtDate(r.gatewayConfirmedAt, true)}</p>}
                {!["COMPLETED", "DECLINED"].includes(r.status) && (
                  <ActionForm action={updateRefundAction} submitLabel="Update refund" variant="subtle" className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={r.id} />
                    <Field label="Status" htmlFor={`rs-${r.id}`}><Select id={`rs-${r.id}`} name="status" defaultValue="COMPLETED"><option value="PROCESSING">Processing</option><option value="COMPLETED">Completed (gateway confirmed)</option><option value="FAILED">Failed</option><option value="DECLINED">Declined</option></Select></Field>
                    <Field label="Gateway refund reference" htmlFor={`rg-${r.id}`}><Input id={`rg-${r.id}`} name="gatewayReference" /></Field>
                    <Field label="Note" htmlFor={`rn-${r.id}`} className="sm:col-span-2"><Input id={`rn-${r.id}`} name="note" /></Field>
                    <Checkbox id={`rc-${r.id}`} name="confirmed" className="sm:col-span-2" label="I confirm the payment gateway shows this refund as completed." />
                  </ActionForm>
                )}
              </div>
            ))}
            {paid && (
              <details>
                <summary className="cursor-pointer text-sm text-amp">Approve a new refund</summary>
                <ActionForm action={createRefundAction} submitLabel="Record refund decision" className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <Field label="Amount (R)" htmlFor="amount" required><Input id="amount" name="amount" inputMode="decimal" defaultValue={(paidCents / 100).toFixed(2)} required /></Field>
                  <Field label="Reason" htmlFor="reason" required><Input id="reason" name="reason" required /></Field>
                </ActionForm>
              </details>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-lg uppercase">History</h2>
            <ol className="mt-3 space-y-2 border-l border-ink-400 pl-5 text-sm">
              {o.statusHistory.map((h) => <li key={h.id}><span className="text-bone">{ORDER_STATUS_LABELS[h.toStatus]}</span><span className="block text-xs text-bone-dim">{fmtDate(h.createdAt, true)}{h.note ? ` — ${h.note}` : ""}{h.actorId ? " (staff)" : ""}</span></li>)}
            </ol>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="space-y-1 text-sm">
            <h2 className="font-display text-lg uppercase">Customer</h2>
            <p>{o.customerName}</p>
            <p><a className="link" href={`mailto:${o.customerEmail}?subject=${encodeURIComponent(`Your Guitarz4U order ${o.orderNumber}`)}`}>{o.customerEmail}</a></p>
            <p>{o.customerPhone ?? "No phone"}</p>
            {o.customerNotes && <p className="mt-2 rounded bg-ink-700 p-2 text-bone-muted">“{o.customerNotes}”</p>}
            <p className="text-xs text-bone-dim">Placed {fmtDate(o.createdAt, true)} · terms accepted {fmtDate(o.termsAcceptedAt, true)}{o.paidAt ? ` · paid ${fmtDate(o.paidAt, true)}` : ""}</p>
          </Card>
          {transitions.length > 0 && (
            <Card>
              <h2 className="font-display text-lg uppercase">Update status</h2>
              <ActionForm action={updateOrderStatusAction} submitLabel="Update status" className="mt-3 space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <Select name="status" aria-label="New status">{transitions.map((t) => <option key={t} value={t}>{ORDER_STATUS_LABELS[t]}</option>)}</Select>
                <Field label="Note (shown to customer)" htmlFor="note"><Textarea id="note" name="note" className="min-h-16" /></Field>
                {o.paidAt && <Checkbox id="restock" name="restock" label="If cancelling: return items to stock (makes them available again)" />}
                <Checkbox id="notify" name="notify" defaultChecked label="Email the customer about this change" />
              </ActionForm>
              <p className="mt-2 text-xs text-bone-dim">Payment statuses can only be set by verified gateway notifications.</p>
            </Card>
          )}
          {paid && (
            <Card>
              <h2 className="font-display text-lg uppercase">Private collection details</h2>
              <ActionForm action={saveCollectionAction} submitLabel="Save collection details" className="mt-3 space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <Field label="Address & instructions (only this customer sees this)" htmlFor="collectionDetails"><Textarea id="collectionDetails" name="collectionDetails" defaultValue={o.collectionDetails ?? ""} /></Field>
                <Field label="Scheduled for" htmlFor="collectionScheduledFor"><Input id="collectionScheduledFor" name="collectionScheduledFor" type="datetime-local" defaultValue={toLocalInput(o.collectionScheduledFor)} /></Field>
                <Checkbox id="notifyc" name="notify" defaultChecked label="Email the customer that details are ready" />
              </ActionForm>
            </Card>
          )}
          <Card>
            <h2 className="font-display text-lg uppercase">Internal notes</h2>
            <ActionForm action={saveOrderNotesAction} submitLabel="Save notes" variant="subtle" className="mt-3 space-y-3">
              <input type="hidden" name="id" value={o.id} />
              <Textarea name="adminNotes" defaultValue={o.adminNotes ?? ""} aria-label="Internal notes" />
              <Checkbox id="ra" name="requiresAttention" defaultChecked={o.requiresAttention} label="Flag as needing attention" />
            </ActionForm>
          </Card>
          {o.reservations.length > 0 && <p className="text-xs text-bone-dim">Reservations: {o.reservations.map((r) => `${r.status.toLowerCase()} (exp ${fmtDate(r.expiresAt, true)})`).join(", ")}</p>}
        </div>
      </div>
    </div>
  );
}
