import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { OrderStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requireUserPage("/account/orders");
  const orders = await prisma.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">Order history</h1>
      {orders.length === 0 ? <EmptyState title="No orders yet" action={<ButtonLink href="/shop">Shop now</ButtonLink>} /> : (
        <div className="overflow-x-auto rounded-xl border border-ink-500">
          <table className="table-base">
            <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/account/orders/${o.id}`} className="link">{o.orderNumber}</Link></td>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td className="max-w-xs">{o.items.map((i) => i.title).join(", ")}</td>
                  <td>{formatZAR(o.totalCents)}</td>
                  <td><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
