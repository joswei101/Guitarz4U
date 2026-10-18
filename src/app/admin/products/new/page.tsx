import Link from "next/link";
import { query } from "@/lib/db";
import { getCategories } from "@/lib/products";
import { createProduct } from "../../actions";
import { ProductForm } from "../ProductForm";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const [categories, brands] = await Promise.all([getCategories(), query<{ name: string }>("select name from brands order by name")]);
  return (
    <div className="stack">
      <p className="small"><Link href="/admin/products">← Inventory</Link></p>
      <h1 style={{ fontSize: "2rem" }}>Add a product</h1>
      {sp.error && <div className="notice notice-bad" role="alert"><p>{sp.error}</p></div>}
      <p className="muted">Tip: save as <strong>Draft</strong> first, check the preview, then change the status to <strong>Available</strong> to publish it.</p>
      <ProductForm
        values={{ title: "", brand: "", model: "", categoryId: "", price: "", compareAt: "", condition: "good", description: "", defects: "", history: "", serialNumber: "", status: "draft", featured: false }}
        categories={categories}
        brands={brands.map((b) => b.name)}
        action={createProduct}
        submitLabel="Save product"
      />
    </div>
  );
}
