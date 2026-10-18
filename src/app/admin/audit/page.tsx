import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { AdminHeader, FilterBar, Pager, Table, qsWith } from "@/components/admin/admin-ui";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Audit log" };
const PER = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePermissionPage("audit:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { OR: [{ action: { contains: sp.q } }, { entityType: { contains: sp.q } }, { entityId: sp.q }] } : {};
  const [rows, total] = await Promise.all([prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true } } } }), prisma.auditLog.count({ where })]);
  return (
    <div>
      <AdminHeader title="Audit log" />
      <FilterBar><Input name="q" defaultValue={sp.q} placeholder="action, entity type or id" className="w-64" aria-label="Search" /><Button type="submit" variant="subtle">Search</Button></FilterBar>
      <Table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap">{fmtDate(r.createdAt, true)}</td><td>{r.actor?.name ?? "system"}</td><td className="font-mono text-xs">{r.action}</td><td className="text-xs">{r.entityType} {r.entityId}</td><td className="max-w-md break-all font-mono text-[11px]">{r.details ? JSON.stringify(r.details) : ""}</td></tr>)}</tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/audit${qsWith(sp)}`} />
    </div>
  );
}
