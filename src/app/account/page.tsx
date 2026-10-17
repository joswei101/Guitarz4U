import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { Alert, Card } from "@/components/ui/misc";
import { ResendVerification } from "@/components/auth/forms";
import { OrderStatusBadge, RepairStatusBadge, fmtDate } from "@/components/status-badges";
import { ACTIVE_REPAIR_STATUSES } from "@/lib/repairs/status";
import { formatZAR } from "@/lib/money";

export const metadata = { title: "My account" };

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUserPage("/account");
  const { welcome } = await searchParams;
  const [orders, repairs, quotesWaiting] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id, status: { notIn: ["CANCELLED", "EXPIRED"] } }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.repairRequest.findMany({ where: { userId: user.id, status: { in: ACTIVE_REPAIR_STATUSES } }, orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.repairQuote.count({ where: { status: "SENT", repair: { userId: user.id } } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">Hi, {user.name.split(" ")[0]}</h1>
      {welcome && <Alert tone="ok" title="Welcome to Guitarz4U!">Your account has been created.</Alert>}
      {!user.emailVerifiedAt && (
        <Alert tone="warn" title="Please verify your email address">
          We sent a link to {user.email}. Verification is required for checkout, reviews, questions and quote approval.
          <div className="mt-3"><ResendVerification /></div>
        </Alert>
      )}
      {quotesWaiting > 0 && <Alert tone="amp" title="A repair quote is waiting for you"><Link href="/account/repairs">Review and accept or decline it →</Link></Alert>}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-display text-xl uppercase">Recent orders</h2><Link href="/account/orders" className="link text-sm">All</Link></div>
          {orders.length === 0 ? <p className="mt-3 text-sm text-bone-muted">No orders yet. <Link href="/shop" className="link">Browse the shop</Link>.</p> : (
            <ul className="mt-3 divide-y divide-ink-500">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <Link href={`/account/orders/${o.id}`} className="text-bone hover:text-amp">{o.orderNumber}<span className="block text-xs text-bone-dim">{fmtDate(o.createdAt)} · {formatZAR(o.totalCents)}</span></Link>
                  <OrderStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="font-display text-xl uppercase">Active repairs</h2><Link href="/account/repairs" className="link text-sm">All</Link></div>
          {repairs.length === 0 ? <p className="mt-3 text-sm text-bone-muted">No active repairs. <Link href="/repairs/book" className="link">Request an assessment</Link>.</p> : (
            <ul className="mt-3 divide-y divide-ink-500">
              {repairs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <Link href="/account/repairs" className="text-bone hover:text-amp">{r.reference}<span className="block text-xs text-bone-dim">{r.instrumentType}</span></Link>
                  <RepairStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
