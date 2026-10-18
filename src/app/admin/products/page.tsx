import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminTitle, cleanSearch } from "@/components/admin/AdminUi";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import { ProductImage } from "@/components/shop/ProductImage";
import { AvailabilityBadge, DemoBadge } from "@/components/ui/Badges";
import { Alert } from "@/components/ui/Alert";
import { Pagination } from "@/components/ui/Pagination";
import { PRODUCT_STATUSES, conditionLabel } from "@/lib/constants";
import { formatDate, formatRand } from "@/lib/format";

export const metadata = { title: "Inventory" };
const PER = 30;

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const status = typeof sp.status === "string" ? sp.status : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, slug, title, price, status, condition, featured, quantity, is_demo, created_at, sold_at, category:categories(name), brand:brands(name), images:product_images(storage_path, sort_order)", { count: "exact" })
    .order(status === "sold" ? "sold_at" : "created_at", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (status) query = query.eq("status", status);
  else query = query.neq("status", "archived");
  if (category) query = query.eq("category_id", Number(category));
  if (q) query = query.or(`title.ilike.%${q}%,model.ilike.%${q}%`);
  const [{ data, count }, cats] = await Promise.all([query, supabase.from("categories").select("id, name").order("sort_order")]);

  return (
    <div>
      <AdminTitle title="Inventory" actions={<Link href="/admin/products/new" className="btn btn-primary">Add product</Link>}>
        {count ?? 0} products{status ? ` · ${PRODUCT_STATUSES.find((s) => s.value === status)?.label}` : " (archived hidden)"}. The sold archive keeps sold items for your records.
      </AdminTitle>
      {sp.deleted && <Alert tone="success" className="mb-4">Product deleted.</Alert>}
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-3" action="/admin/products">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="pq">Search</label>
          <input id="pq" name="q" defaultValue={q} className="input" placeholder="Title or model" />
        </div>
        <div>
          <label className="label" htmlFor="ps">Status</label>
          <select id="ps" name="status" defaultValue={status} className="select">
            <option value="">All except archived</option>
            {PRODUCT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.value === "sold" ? "Sold archive" : s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pc">Category</label>
          <select id="pc" name="category" defaultValue={category} className="select">
            <option value="">All</option>
            {(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary">Filter</button>
        <Link href="/admin/products" className="btn btn-ghost">Reset</Link>
      </form>
      {data?.length ? (
        <div className="card overflow-x-auto">
          <table className="table-g4u">
            <thead>
              <tr><th>Product</th><th>Price</th><th>Status</th><th>Added</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.map((p) => {
                const img = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0];
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <ProductImage path={img?.storage_path} alt="" className="h-14 w-12 flex-none rounded" />
                        <div>
                          <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.title}</Link>
                          <p className="text-xs text-tan">
                            {[p.brand?.name, p.category?.name, conditionLabel(p.condition)].filter(Boolean).join(" · ")}
                            {p.quantity !== 1 && ` · qty ${p.quantity}`}
                          </p>
                          <div className="mt-1 flex gap-1">
                            {p.featured && <span className="badge badge-gold">Featured</span>}
                            {p.is_demo && <DemoBadge />}
                            {!img && <span className="badge badge-warning">No photo</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{formatRand(p.price)}</td>
                    <td>{p.status === "draft" || p.status === "archived" ? <span className="badge badge-neutral">{p.status === "draft" ? "Draft" : "Archived"}</span> : <AvailabilityBadge status={p.status} quantity={p.quantity} />}</td>
                    <td className="whitespace-nowrap text-xs">{formatDate(p.status === "sold" ? p.sold_at : p.created_at)}</td>
                    <td><ProductRowActions id={p.id} slug={p.slug} status={p.status} featured={p.featured} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p>No products found.</p>
          <Link href="/admin/products/new" className="btn btn-primary mt-4">Add your first product</Link>
        </div>
      )}
      <Pagination page={page} totalPages={Math.ceil((count ?? 0) / PER)} makeHref={(n) => `/admin/products?${new URLSearchParams({ q, status, category, page: String(n) })}`} />
    </div>
  );
}
