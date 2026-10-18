import Link from "next/link";
import type { EnquiryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { ENQUIRY_STATUS_LABELS, OPEN_ENQUIRY_STATUSES } from "@/lib/enquiries/status";
import { AdminHeader, FilterBar, Pager, Table, qsWith } from "@/components/admin/admin-ui";
import { Input, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { EnquiryStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "Purchase enquiries" };
const PER = 30;

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermissionPage("enquiries:manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.PurchaseEnquiryWhereInput = {};
  if (sp.status === "open") where.status = { in: OPEN_ENQUIRY_STATUSES };
  else if (sp.status && sp.status in ENQUIRY_STATUS_LABELS) where.status = sp.status as EnquiryStatus;
  if (sp.q) where.OR = [{ reference: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { brand: { contains: sp.q, mode: "insensitive" } }, { model: { contains: sp.q, mode: "insensitive" } }];
  const [rows, total] = await Promise.all([
    prisma.purchaseEnquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { media: true } } } }),
    prisma.purchaseEnquiry.count({ where }),
  ]);
  return (
    <div>
      <AdminHeader title="Purchase enquiries"><ButtonLink href="/api/admin/export/enquiries" variant="outline">Export CSV</ButtonLink></AdminHeader>
      <FilterBar>
        <Input name="q" placeholder="Reference, name, email, brand" defaultValue={sp.q} className="w-64" aria-label="Search" />
        <Select name="status" defaultValue={sp.status ?? ""} className="w-56" aria-label="Status"><option value="">All</option><option value="open">Open</option>{Object.entries(ENQUIRY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Button type="submit" variant="subtle">Filter</Button>
      </FilterBar>
      <Table>
        <thead><tr><th>Ref</th><th>Received</th><th>Seller</th><th>Item</th><th>Files</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id}>
              <td><Link className="link" href={`/admin/enquiries/${e.id}`}>{e.reference}</Link></td>
              <td className="whitespace-nowrap">{fmtDate(e.createdAt)}</td>
              <td>{e.name}<span className="block text-xs text-bone-dim">{e.phone}</span></td>
              <td>{e.instrumentType}<span className="block text-xs text-bone-dim">{[e.brand, e.model].filter(Boolean).join(" ")} · {e.condition}</span></td>
              <td>{e._count.media}</td>
              <td><EnquiryStatusBadge status={e.status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/enquiries${qsWith(sp)}`} />
    </div>
  );
}
