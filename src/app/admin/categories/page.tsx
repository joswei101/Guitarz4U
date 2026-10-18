import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { saveCategoryAction } from "@/app/actions/admin/misc";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ActionForm } from "@/components/forms/action-form";
import { Card } from "@/components/ui/misc";
import { Checkbox, Field, Input } from "@/components/ui/form";

export const metadata = { title: "Categories" };

function CategoryFields({ c }: { c?: { id: string; name: string; description: string | null; sortOrder: number; isActive: boolean; isPartsCategory: boolean } }) {
  const k = c?.id ?? "new";
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_3fr_100px] sm:items-end">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name" htmlFor={`n-${k}`} required><Input id={`n-${k}`} name="name" defaultValue={c?.name} required /></Field>
      <Field label="Description" htmlFor={`d-${k}`}><Input id={`d-${k}`} name="description" defaultValue={c?.description ?? ""} /></Field>
      <Field label="Order" htmlFor={`o-${k}`}><Input id={`o-${k}`} name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} /></Field>
      <div className="flex gap-6 sm:col-span-3">
        <Checkbox id={`a-${k}`} name="isActive" defaultChecked={c?.isActive ?? true} label="Active (shown in shop)" />
        <Checkbox id={`p-${k}`} name="isPartsCategory" defaultChecked={c?.isPartsCategory ?? false} label="Parts category (stock quantities & low-stock alerts)" />
      </div>
    </div>
  );
}

export default async function CategoriesPage() {
  await requirePermissionPage("categories:manage");
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <div className="max-w-4xl space-y-4">
      <AdminHeader title="Categories" />
      {categories.map((c) => (
        <Card key={c.id}>
          <p className="mb-2 text-xs text-bone-dim">/shop?category={c.slug} · {c._count.products} product(s)</p>
          <ActionForm action={saveCategoryAction} submitLabel="Save" variant="subtle"><CategoryFields c={c} /></ActionForm>
        </Card>
      ))}
      <Card>
        <h2 className="mb-3 font-display text-lg uppercase">Add category</h2>
        <ActionForm action={saveCategoryAction} submitLabel="Add category"><CategoryFields /></ActionForm>
      </Card>
    </div>
  );
}
