import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { getBrands, getCategories } from "@/lib/data/products";

export const metadata = { title: "Add a product" };

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);
  return (
    <div className="max-w-4xl">
      <Link href="/admin/products" className="text-sm text-gold-ink">
        ← Inventory
      </Link>
      <AdminPageHeader title="Add a product" description="Save the listing first (as a draft is fine), then add photographs. Publish when it's ready." />
      <ProductEditor values={{ status: "draft" }} categories={categories} brands={brands.map((b) => b.name)} />
    </div>
  );
}
