import type { DiscountCode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { saveDiscountAction } from "@/app/actions/admin/misc";
import { formatZAR } from "@/lib/money";
import { AdminHeader, Table } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Badge, Card } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Discount codes" };

const d = (x: Date | null) => (x ? new Date(x.getTime() + 2 * 3600000).toISOString().slice(0, 10) : "");

function DiscountFields({ c, categories }: { c?: DiscountCode; categories: { id: string; name: string }[] }) {
  const k = c?.id ?? "new";
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Code" htmlFor={`code-${k}`} required><Input id={`code-${k}`} name="code" defaultValue={c?.code} required /></Field>
      <Field label="Type" htmlFor={`t-${k}`}><Select id={`t-${k}`} name="type" defaultValue={c?.type ?? "PERCENTAGE"}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount (R)</option></Select></Field>
      <Field label="Value (% or R)" htmlFor={`v-${k}`} required><Input id={`v-${k}`} name="value" defaultValue={c ? (c.type === "PERCENTAGE" ? c.value : (c.value / 100).toFixed(2)) : ""} required /></Field>
      <Field label="Minimum order (R)" htmlFor={`m-${k}`}><Input id={`m-${k}`} name="minOrder" defaultValue={c?.minOrderCents ? (c.minOrderCents / 100).toFixed(2) : ""} /></Field>
      <Field label="Total uses allowed" htmlFor={`u-${k}`}><Input id={`u-${k}`} name="maxUses" type="number" min={1} defaultValue={c?.maxUses ?? ""} /></Field>
      <Field label="Uses per customer" htmlFor={`pu-${k}`}><Input id={`pu-${k}`} name="maxUsesPerUser" type="number" min={1} defaultValue={c?.maxUsesPerUser ?? 1} /></Field>
      <Field label="Valid from" htmlFor={`f-${k}`}><Input id={`f-${k}`} name="validFrom" type="date" defaultValue={d(c?.validFrom ?? null)} /></Field>
      <Field label="Valid until" htmlFor={`to-${k}`}><Input id={`to-${k}`} name="validUntil" type="date" defaultValue={d(c?.validUntil ?? null)} /></Field>
      <Field label="Only for category" htmlFor={`cat-${k}`}><Select id={`cat-${k}`} name="categoryId" defaultValue={c?.categoryId ?? ""}><option value="">All categories</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
      <Field label="Description (internal)" htmlFor={`desc-${k}`} className="sm:col-span-2"><Input id={`desc-${k}`} name="description" defaultValue={c?.description ?? ""} /></Field>
      <Checkbox id={`act-${k}`} name="isActive" defaultChecked={c?.isActive ?? true} label="Active" />
    </div>
  );
}

export default async function DiscountsPage() {
  await requirePermissionPage("discounts:manage");
  const [codes, categories] = await Promise.all([prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }), prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })]);
  return (
    <div className="max-w-5xl space-y-6">
      <AdminHeader title="Discount codes" />
      <Table>
        <thead><tr><th>Code</th><th>Discount</th><th>Used</th><th>Valid</th><th>Status</th></tr></thead>
        <tbody>{codes.map((c) => <tr key={c.id}><td className="font-mono">{c.code}</td><td>{c.type === "PERCENTAGE" ? `${c.value}%` : formatZAR(c.value)}</td><td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td><td className="text-xs">{fmtDate(c.validFrom)} – {fmtDate(c.validUntil)}</td><td><Badge tone={c.isActive ? "ok" : "neutral"}>{c.isActive ? "active" : "inactive"}</Badge></td></tr>)}</tbody>
      </Table>
      {codes.map((c) => (
        <details key={c.id} className="rounded-xl border border-ink-500 p-4">
          <summary className="cursor-pointer font-mono text-sm text-amp">Edit {c.code}</summary>
          <ActionForm action={saveDiscountAction} submitLabel="Save" variant="subtle" className="mt-3 space-y-3"><DiscountFields c={c} categories={categories} /></ActionForm>
        </details>
      ))}
      <Card>
        <h2 className="mb-3 font-display text-lg uppercase">New discount code</h2>
        <ActionForm action={saveDiscountAction} submitLabel="Create code" className="space-y-3"><DiscountFields categories={categories} /></ActionForm>
      </Card>
    </div>
  );
}
