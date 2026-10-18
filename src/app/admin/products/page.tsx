import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { can } from "@/lib/permissions";
import { formatZAR } from "@/lib/money";
import { PRODUCT_STATUS_LABELS } from "@/lib/catalog";
import { AdminHeader, FilterBar, Pager, Table, qsWith } from "@/components/admin/admin-ui";
import { ButtonLink, Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { fmtDate } from "@/components/status-badges";

export const metadata = { title: "Inventory" };
const PER = 30;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePermissionPage("inventory:view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {};
  if (sp.status && sp.status in PRODUCT_STATUS_LABELS) where.status = sp.status as ProductStatus;
  if (sp.category) where.categoryId = sp.category;
  if (sp.q) where.OR = [{ title: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }, { brand: { contains: sp.q, mode: "insensitive" } }];
  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({ where, include: { category: true, _count: { select: { media: true } } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const finance = can(user.role, "finance:view");
  return (
    <div>
      <AdminHeader title="Inventory">
        {can(user.role, "inventory:edit-pricing") && <ButtonLink href="/admin/products/new">Add product</ButtonLink>}
        {finance && <ButtonLink href="/api/admin/export/inventory" variant="outline">Export CSV</ButtonLink>}
      </AdminHeader>
      <FilterBar>
        <Input name="q" placeholder="Search title, SKU, brand" defaultValue={sp.q} className="w-56" aria-label="Search" />
        <Select name="status" defaultValue={sp.status ?? ""} className="w-44" aria-label="Status"><option value="">All statuses</option>{Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="category" defaultValue={sp.category ?? ""} className="w-52" aria-label="Category"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Button type="submit" variant="subtle">Filter</Button>
      </FilterBar>
      <p className="mb-2 text-sm text-bone-dim">{total} product(s). Sold items stay here as private records.</p>
      <Table>
        <thead><tr><th>Item</th><th>SKU</th><th>Category</th><th>Price</th>{finance && <th>Cost</th>}<th>Qty</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/products/${p.id}`} className="link">{p.title}</Link>{p._count.media === 0 && <span className="ml-2 text-xs text-warn">no photos</span>}{p.isFeatured && <Badge tone="amp" className="ml-2">Featured</Badge>}</td>
              <td className="font-mono text-xs">{p.sku}</td>
              <td>{p.category.name}</td>
              <td>{formatZAR(p.salePriceCents ?? p.priceCents)}</td>
              {finance && <td>{formatZAR((p.acquisitionCostCents ?? 0) + (p.refurbishmentCostCents ?? 0))}</td>}
              <td>{p.quantity}{p.lowStockThreshold != null && p.quantity <= p.lowStockThreshold && <span className="ml-1 text-xs text-warn">low</span>}</td>
              <td><Badge tone={p.status === "AVAILABLE" ? "ok" : p.status === "SOLD" ? "info" : p.status === "DRAFT" ? "neutral" : "warn"}>{PRODUCT_STATUS_LABELS[p.status]}</Badge></td>
              <td className="whitespace-nowrap">{fmtDate(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={page} pages={Math.ceil(total / PER)} base={`/admin/products${qsWith(sp)}`} />
    </div>
  );
}
