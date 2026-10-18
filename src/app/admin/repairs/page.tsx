import Link from "next/link";
import type { Prisma, RepairStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { ACTIVE_REPAIR_STATUSES, REPAIR_STATUS_LABELS } from "@/lib/repairs/status";
import { AdminHeader, FilterBar, Pager, Table, qsWith } from "@/components/admin/admin-ui";
import { Input, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { RepairStatusBadge, fmtDate } from "@/components/status-badges";

export const metadata = { title: "Repairs" };
const PER = 30;

export default async function AdminRepairs({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermissionPage("repairs:manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.RepairRequestWhereInput = {};
  if (sp.status === "active") where.status = { in: ACTIVE_REPAIR_STATUSES };
  else if (sp.status === "AWAITING_REVIEW") where.status = { in: ["SUBMITTED", "AWAITING_REVIEW"] };
  else if (sp.status && sp.status in REPAIR_STATUS_LABELS) where.status = sp.status as RepairStatus;
  if (sp.q) where.OR = [{ reference: { contains: sp.q, mode: "insensitive" } }, { name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { brand: { contains: sp.q, mode: "insensitive" } }];
  const [rows, total] = await Promise.all([
    prisma.repairRequest.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.repairRequest.count({ where }),
  ]);
  return (
    <div>
      <AdminHeader title="Repairs"><ButtonLink href="/api/admin/export/repairs" variant="outline">Export CSV</ButtonLink></AdminHeader>
      <FilterBar>
        <Input name="q" placeholder="Reference, customer, brand" defaultValue={sp.q} className="w-56" aria-label="Search" />
        <Select name="status" defaultValue={sp.status ?? ""} className="w-60" aria-label="Status"><option value="">All</option><option value="active">Active</option>{Object.entries(REPAIR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Button type="submit" variant="subtle">Filter</Button>
      </FilterBar>
      <Table>
        <thead><tr><th>Ref</th><th>Submitted</th><th>Customer</th><th>Instrument</th><th>Services</th><th>Appointment</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><Link className="link" href={`/admin/repairs/${r.id}`}>{r.reference}</Link></td>
              <td className="whitespace-nowrap">{fmtDate(r.createdAt)}</td>
              <td>{r.name}<span className="block text-xs text-bone-dim">{r.phone}</span></td>
              <td>{r.instrumentType}<span className="block text-xs text-bone-dim">{[r.brand, r.model].filter(Boolean).join(" ")}</span></td>
              <td className="max-w-xs text-xs">{r.services.join(", ")}</td>
              <td className="whitespace-nowrap">{fmtDate(r.appointmentAt ?? r.preferredDate, true)}</td>
              <td><RepairStatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/repairs${qsWith(sp)}`} />
    </div>
  );
}
