import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { resolveDeletionAction, setCustomerStatusAction, setRoleAction } from "@/app/actions/admin/customers";
import { AdminHeader, FilterBar, Pager, Table, qsWith } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Badge, Card } from "@/components/ui/misc";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Customers" };
const PER = 40;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requirePermissionPage("customers:manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = { status: { not: "DELETED" } };
  if (sp.role) where.role = sp.role as Role;
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }];
  const [users, total, deletions] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { orders: true, repairRequests: true } } } }),
    prisma.user.count({ where }),
    prisma.accountDeletionRequest.findMany({ where: { status: "PENDING" }, include: { user: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const canRoles = can(me.role, "settings:manage");
  return (
    <div className="space-y-6">
      <AdminHeader title="Customers & staff"><ButtonLink href="/api/admin/export/customers" variant="outline">Export CSV</ButtonLink></AdminHeader>
      {deletions.length > 0 && (
        <Card className="space-y-4">
          <h2 className="font-display text-lg uppercase text-warn">Pending deletion requests</h2>
          {deletions.map((d) => (
            <div key={d.id} className="rounded-lg border border-ink-500 p-3 text-sm">
              <p><strong>{d.user.name}</strong> ({d.user.email}) · requested {fmtDate(d.createdAt)}{d.reason ? ` · “${d.reason}”` : ""}</p>
              <ActionForm action={resolveDeletionAction} submitLabel="Submit decision" variant="subtle" className="mt-2 grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={d.id} />
                <Select name="decision" aria-label="Decision"><option value="complete">Delete & anonymise</option><option value="reject">Reject / keep account</option></Select>
                <Textarea name="resolution" aria-label="Resolution note" placeholder="Resolution note (e.g. what was retained and why)" className="min-h-10" />
              </ActionForm>
            </div>
          ))}
        </Card>
      )}
      <FilterBar>
        <Input name="q" placeholder="Name, email, phone" defaultValue={sp.q} className="w-56" aria-label="Search" />
        <Select name="role" defaultValue={sp.role ?? ""} className="w-48" aria-label="Role"><option value="">All roles</option><option value="CUSTOMER">Customers</option><option value="CONTENT_MANAGER">Content managers</option><option value="ADMIN">Admins</option></Select>
        <Button type="submit" variant="subtle">Filter</Button>
      </FilterBar>
      <Table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Orders / repairs</th><th>Manage</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}<span className="block text-xs text-bone-dim">{u.phone}</span></td>
              <td>{u.email}{u.emailVerifiedAt ? "" : <Badge tone="warn" className="ml-1">unverified</Badge>}</td>
              <td>{u.role.replace("_", " ").toLowerCase()}</td>
              <td><Badge tone={u.status === "ACTIVE" ? "ok" : "danger"}>{u.status.toLowerCase().replace("_", " ")}</Badge>{u.suspendedReason && <span className="block text-xs">{u.suspendedReason}</span>}</td>
              <td className="whitespace-nowrap">{fmtDate(u.createdAt)}</td>
              <td>{u._count.orders} / {u._count.repairRequests}</td>
              <td className="min-w-64">
                {u.id !== me.id && (
                  <details>
                    <summary className="cursor-pointer text-amp">Manage</summary>
                    <ActionForm action={setCustomerStatusAction} submitLabel={u.status === "SUSPENDED" ? "Reactivate" : "Suspend"} variant={u.status === "SUSPENDED" ? "subtle" : "danger"} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="status" value={u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"} />
                      {u.status !== "SUSPENDED" && <Field label="Reason" htmlFor={`r-${u.id}`}><Input id={`r-${u.id}`} name="reason" /></Field>}
                    </ActionForm>
                    {canRoles && (
                      <ActionForm action={setRoleAction} submitLabel="Change role" variant="subtle" className="mt-2 flex items-end gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <Select name="role" defaultValue={u.role} aria-label="Role"><option value="CUSTOMER">Customer</option><option value="CONTENT_MANAGER">Content manager</option><option value="ADMIN">Admin</option></Select>
                      </ActionForm>
                    )}
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/customers${qsWith(sp)}`} />
    </div>
  );
}
