import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { formatZAR } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/shop/order-status";
import { AdminHeader, FilterBar, Pager, Table, qsWith } from "@/components/admin/admin-ui";
import { Input, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { OrderStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "Orders" };
const PER = 30;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermissionPage("orders:manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.status === "open") where.status = { in: ["PAID", "COLLECTION_PENDING", "READY_FOR_COLLECTION", "CANCELLATION_REQUESTED", "REFUND_PENDING"] };
  else if (sp.status && sp.status in ORDER_STATUS_LABELS) where.status = sp.status as OrderStatus;
  if (sp.attention) where.requiresAttention = true;
  if (sp.q) where.OR = [{ orderNumber: { contains: sp.q, mode: "insensitive" } }, { customerName: { contains: sp.q, mode: "insensitive" } }, { customerEmail: { contains: sp.q, mode: "insensitive" } }, { items: { some: { title: { contains: sp.q, mode: "insensitive" } } } }];
  if (sp.from) where.createdAt = { ...(where.createdAt as object), gte: new Date(`${sp.from}T00:00:00+02:00`) };
  if (sp.to) where.createdAt = { ...(where.createdAt as object), lte: new Date(`${sp.to}T23:59:59+02:00`) };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include: { items: { select: { title: true } }, payments: { select: { status: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.order.count({ where }),
  ]);
  return (
    <div>
      <AdminHeader title="Orders"><ButtonLink href={`/api/admin/export/orders${qsWith(sp)}`} variant="outline">Export CSV</ButtonLink></AdminHeader>
      <FilterBar>
        <Input name="q" placeholder="Order #, customer, item" defaultValue={sp.q} className="w-56" aria-label="Search" />
        <Select name="status" defaultValue={sp.status ?? ""} className="w-56" aria-label="Status"><option value="">All statuses</option><option value="open">Open (to fulfil)</option>{Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label className="text-xs text-bone-dim">From<Input type="date" name="from" defaultValue={sp.from} className="w-40" /></label>
        <label className="text-xs text-bone-dim">To<Input type="date" name="to" defaultValue={sp.to} className="w-40" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="attention" value="1" defaultChecked={Boolean(sp.attention)} className="accent-amp" /> Needs attention</label>
        <Button type="submit" variant="subtle">Filter</Button>
      </FilterBar>
      <p className="mb-2 text-sm text-bone-dim">{total} order(s)</p>
      <Table>
        <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><Link className="link" href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>{o.requiresAttention && <Badge tone="danger" className="ml-2">!</Badge>}</td>
              <td className="whitespace-nowrap">{fmtDate(o.createdAt, true)}</td>
              <td>{o.customerName}<span className="block text-xs text-bone-dim">{o.customerEmail}</span></td>
              <td className="max-w-xs text-xs">{o.items.map((i) => i.title).join(", ")}</td>
              <td>{formatZAR(o.totalCents)}</td>
              <td>{o.payments.some((p) => p.status === "COMPLETE") ? <Badge tone="ok">Verified</Badge> : <Badge>None</Badge>}</td>
              <td><OrderStatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/orders${qsWith(sp)}`} />
    </div>
  );
}
