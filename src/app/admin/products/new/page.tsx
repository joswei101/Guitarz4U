import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/guards";
import { createProductAction } from "@/app/actions/admin/products";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ProductFields } from "@/components/admin/product-form";
import { ActionForm } from "@/components/forms/action-form";
import { Card } from "@/components/ui/misc";

export const metadata = { title: "Add product" };

export default async function NewProduct() {
  await requirePermissionPage("inventory:edit-pricing");
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Add product" back={{ href: "/admin/products", label: "Inventory" }} />
      <Card>
        <p className="mb-4 text-sm text-bone-muted">New products are saved as hidden drafts. Add photos and condition notes, then publish.</p>
        <ActionForm action={createProductAction} submitLabel="Create draft">
          <ProductFields categories={categories} canPrice />
        </ActionForm>
      </Card>
    </div>
  );
}
