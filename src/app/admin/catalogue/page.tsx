import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { BrandForm, CategoryForm } from "@/components/admin/CatalogueForms";
import { ActionButton } from "@/components/account/ActionButton";
import { deleteCatalogueItem } from "@/app/actions/admin";

export const metadata = { title: "Categories & brands" };

export default async function CataloguePage() {
  const supabase = await createClient();
  const [cats, brands] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("brands").select("*").order("name"),
  ]);
  return (
    <div className="space-y-8">
      <AdminTitle title="Categories & brands" />
      <section className="card space-y-4 p-5">
        <h2 className="text-xl">Categories</h2>
        <p className="text-sm text-tan">Inactive categories are hidden from shop filters. Categories in use cannot be deleted.</p>
        {(cats.data ?? []).map((c) => (
          <div key={c.id} className="rounded-md border border-gold/30 bg-white p-3">
            <CategoryForm cat={c} />
            <div className="mt-2 text-right">
              <ActionButton action={deleteCatalogueItem.bind(null, "categories", c.id)} confirm={`Delete category "${c.name}"?`} className="btn btn-ghost btn-sm text-danger">Delete</ActionButton>
            </div>
          </div>
        ))}
        <div className="rounded-md border-2 border-dashed border-gold/40 p-3">
          <p className="mb-2 text-sm font-semibold">Add a category</p>
          <CategoryForm />
        </div>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="text-xl">Brands</h2>
        <BrandForm />
        <ul className="divide-y divide-gold/20">
          {(brands.data ?? []).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <BrandForm brand={b} />
              <ActionButton action={deleteCatalogueItem.bind(null, "brands", b.id)} confirm={`Delete brand "${b.name}"? Products keep their listing but lose the brand.`} className="btn btn-ghost btn-sm text-danger">Delete</ActionButton>
            </li>
          ))}
          {!brands.data?.length && <li className="py-2 text-sm text-tan">No brands yet.</li>}
        </ul>
      </section>
    </div>
  );
}
