import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { formatZAR } from "@/lib/money";
import { features } from "@/lib/env";
import { PAID_STATUSES } from "@/lib/shop/order-status";
import { ACTIVE_REPAIR_STATUSES } from "@/lib/repairs/status";
import { AdminHeader, Stat } from "@/components/admin/admin-ui";
import { Alert, Card } from "@/components/ui/misc";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const user = await requirePermissionPage("dashboard:view");
  const finance = can(user.role, "finance:view");
  const since = new Date(Date.now() - 30 * 86400000);
  const [paidAgg, paidCount, pendingOrders, unpaid, attention, newEnquiries, activeRepairs, awaitingApproval, awaitingReview, available, sold, parts, pendingReviews, pendingQuestions, newMessages, deletionReqs, recentUsers, recentOrders, soldItems, repairIncome, refunded] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "COMPLETE", purpose: "ORDER" }, _sum: { amountCents: true } }),
    prisma.order.count({ where: { status: { in: PAID_STATUSES } } }),
    prisma.order.count({ where: { status: { in: ["PAID", "COLLECTION_PENDING", "READY_FOR_COLLECTION", "CANCELLATION_REQUESTED"] } } }),
    prisma.order.count({ where: { status: { in: ["AWAITING_PAYMENT", "PAYMENT_PROCESSING"] } } }),
    prisma.order.count({ where: { requiresAttention: true, status: { notIn: ["REFUNDED", "CANCELLED"] } } }),
    prisma.purchaseEnquiry.count({ where: { status: "SUBMITTED" } }),
    prisma.repairRequest.count({ where: { status: { in: ACTIVE_REPAIR_STATUSES.filter((s) => !["SUBMITTED", "AWAITING_REVIEW"].includes(s)) } } }),
    prisma.repairRequest.count({ where: { status: "AWAITING_CUSTOMER_APPROVAL" } }),
    prisma.repairRequest.count({ where: { status: { in: ["SUBMITTED", "AWAITING_REVIEW"] } } }),
    prisma.product.count({ where: { status: "AVAILABLE" } }),
    prisma.product.count({ where: { status: "SOLD" } }),
    prisma.product.findMany({ where: { status: "AVAILABLE", lowStockThreshold: { not: null } }, select: { id: true, title: true, quantity: true, lowStockThreshold: true } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.productQuestion.count({ where: { status: "PENDING" } }),
    prisma.contactEnquiry.count({ where: { status: "NEW" } }),
    prisma.accountDeletionRequest.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({ where: { role: "CUSTOMER", createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, createdAt: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, orderNumber: true, customerName: true, status: true, totalCents: true, createdAt: true } }),
    prisma.orderItem.findMany({ where: { order: { status: { in: PAID_STATUSES.filter((s) => s !== "REFUNDED") } } }, select: { lineTotalCents: true, quantity: true, product: { select: { acquisitionCostCents: true, refurbishmentCostCents: true, quantity: true } } } }),
    prisma.repairPayment.aggregate({ _sum: { amountCents: true } }),
    prisma.refund.aggregate({ where: { status: "COMPLETED" }, _sum: { amountCents: true } }),
  ]);
  const lowStock = parts.filter((p) => p.quantity <= (p.lowStockThreshold ?? 0));
  const revenue = paidAgg._sum.amountCents ?? 0;
  const goodsRevenue = soldItems.reduce((s, i) => s + i.lineTotalCents, 0);
  const cost = soldItems.reduce((s, i) => s + ((i.product.acquisitionCostCents ?? 0) + (i.product.refurbishmentCostCents ?? 0)) * i.quantity, 0);

  return (
    <div className="space-y-8">
      <AdminHeader title="Overview" />
      {!features.payfast() && <Alert tone="warn" title="Payments not configured">Set the PAYFAST_* environment variables to accept card payments. See docs/DEPLOYMENT.md.</Alert>}
      {!features.email() && <Alert tone="warn" title="Email not configured">Transactional emails are being recorded but not sent. Configure SMTP_* variables.</Alert>}
      {attention > 0 && <Alert tone="danger" title={`${attention} order(s) need attention`}><Link href="/admin/orders?attention=1">Review flagged orders (e.g. late payments for unavailable stock) →</Link></Alert>}

      {finance && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-bone-dim">Sales</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total sales" value={paidCount} hint="Paid orders (all time)" href="/admin/orders" />
            <Stat label="Revenue received" value={formatZAR(revenue)} hint={`Verified card payments. Refunded: ${formatZAR(refunded._sum.amountCents ?? 0)}`} href="/admin/reports" />
            <Stat label="Estimated profit (goods)" value={formatZAR(goodsRevenue - cost)} hint="Sale prices minus recorded acquisition + refurbishment costs. Estimate only." href="/admin/reports" />
            <Stat label="Repair income" value={formatZAR(repairIncome._sum.amountCents ?? 0)} hint="Recorded repair payments" href="/admin/reports" />
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-bone-dim">Work queue</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {finance && <Stat label="Orders to fulfil" value={pendingOrders} href="/admin/orders?status=open" tone={pendingOrders ? "amp" : undefined} />}
          {finance && <Stat label="Unpaid / in checkout" value={unpaid} href="/admin/orders?status=AWAITING_PAYMENT" />}
          {finance && <Stat label="New purchase enquiries" value={newEnquiries} href="/admin/enquiries?status=SUBMITTED" tone={newEnquiries ? "amp" : undefined} />}
          {finance && <Stat label="Repairs to review" value={awaitingReview} href="/admin/repairs?status=AWAITING_REVIEW" tone={awaitingReview ? "amp" : undefined} />}
          {finance && <Stat label="Active repairs" value={activeRepairs} href="/admin/repairs?status=active" />}
          {finance && <Stat label="Quotes awaiting customer" value={awaitingApproval} href="/admin/repairs?status=AWAITING_CUSTOMER_APPROVAL" />}
          <Stat label="Available inventory" value={available} href="/admin/products?status=AVAILABLE" />
          <Stat label="Sold inventory" value={sold} href="/admin/products?status=SOLD" />
          {finance && <Stat label="Reviews to moderate" value={pendingReviews} href="/admin/reviews" tone={pendingReviews ? "warn" : undefined} />}
          <Stat label="Questions to answer" value={pendingQuestions} href="/admin/questions" tone={pendingQuestions ? "warn" : undefined} />
          <Stat label="New messages" value={newMessages} href="/admin/messages" tone={newMessages ? "warn" : undefined} />
          {finance && <Stat label="Deletion requests" value={deletionReqs} href="/admin/customers?deletion=1" tone={deletionReqs ? "warn" : undefined} />}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-display text-lg uppercase">Low-stock parts</h2>
          {lowStock.length === 0 ? <p className="mt-2 text-sm text-bone-muted">No low-stock alerts.</p> : (
            <ul className="mt-2 space-y-1 text-sm">{lowStock.map((p) => <li key={p.id}><Link className="link" href={`/admin/products/${p.id}`}>{p.title}</Link> — {p.quantity} left (alert at {p.lowStockThreshold})</li>)}</ul>
          )}
        </Card>
        {finance && (
          <Card>
            <h2 className="font-display text-lg uppercase">Recent orders</h2>
            <ul className="mt-2 space-y-1.5 text-sm">{recentOrders.map((o) => <li key={o.id}><Link className="link" href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link> · {o.customerName} · {formatZAR(o.totalCents)} <span className="text-bone-dim">({o.status.toLowerCase().replace(/_/g, " ")})</span></li>)}</ul>
          </Card>
        )}
        {finance && (
          <Card>
            <h2 className="font-display text-lg uppercase">New customers (30 days)</h2>
            {recentUsers.length === 0 ? <p className="mt-2 text-sm text-bone-muted">None yet.</p> : <ul className="mt-2 space-y-1 text-sm">{recentUsers.map((u) => <li key={u.id}>{u.name} <span className="text-bone-dim">· {fmtDate(u.createdAt)}</span></li>)}</ul>}
          </Card>
        )}
      </div>
    </div>
  );
}
