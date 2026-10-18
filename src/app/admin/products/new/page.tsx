import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Add product" };

export default async function NewProduct() {
  const supabase = await createClient();
  const [cats, brands] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("brands").select("id, name").order("name"),
  ]);
  return (
    <div className="max-w-4xl">
      <AdminTitle title="Add product">Save the details first, then add photos. New products start as drafts until you publish them.</AdminTitle>
      <ProductForm values={{ status: "draft", quantity: 1 }} categories={cats.data ?? []} brands={brands.data ?? []} />
    </div>
  );
}
