import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatZAR } from "@/lib/format";
import { productImageUrl } from "@/lib/images";
import { CONDITION_LABELS, PRODUCT_STATUS_LABELS, type ProductCondition, type ProductStatus } from "@/lib/constants";
import { sanitiseSearch } from "@/lib/data/products";

export const metadata = { title: "Inventory" };

type Row = {
  id: string; slug: string; title: string; price: number; status: ProductStatus; condition: ProductCondition; is_featured: boolean; is_demo: boolean;
  created_at: string; sold_at: string | null; brand: { name: string } | null; category: { name: string } | null;
  images: { storage_path: string; sort_order: number }[];
};

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, slug, title, price, status, condition, is_featured, is_demo, created_at, sold_at, brand:brands(name), category:categories(name), images:product_images(storage_path, sort_order)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && status in PRODUCT_STATUS_LABELS) query = query.eq("status", status);
  else query = query.in("status", ["draft", "published", "reserved"]);
  const term = q ? sanitiseSearch(q) : "";
  if (term) query = query.or(`title.ilike.%${term}%,model.ilike.%${term}%`);
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  const tabs: { value?: string; label: string }[] = [
    { label: "Active (draft, available, reserved)" },
    { value: "draft", label: "Drafts" },
    { value: "published", label: "Available" },
    { value: "reserved", label: "Reserved" },
    { value: "sold", label: "Sold archive" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Inventory"
        description="Add, edit, publish, reserve, archive or mark guitars as sold. Sold guitars are hidden from the shop and kept here as a private archive."
        actions={
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            Add a product
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter" className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={t.value ? `/admin/products?status=${t.value}` : "/admin/products"}
              className={`rounded-full px-3 py-1.5 text-sm no-underline ${status === t.value ? "bg-walnut text-cream-light" : "bg-white text-walnut hover:bg-cream"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="admin-q" className="sr-only">
            Search inventory
          </label>
          <input id="admin-q" name="q" defaultValue={q} placeholder="Search title or model" className="input h-10 min-h-0 py-1" />
          <button className="btn btn-outline btn-sm">Search</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-g4u">
          <thead>
            <tr>
              <th>Guitar</th>
              <th>Price</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const img = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 no-underline">
                      <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded bg-cream">
                        <Image src={productImageUrl(img?.storage_path)} alt="" fill sizes="3rem" className="object-cover" />
                      </span>
                      <span>
                        <span className="font-semibold text-walnut hover:text-gold-ink">{p.title}</span>
                        <span className="block text-xs text-ink-soft">
                          {p.brand?.name ?? "No brand"} · {p.category?.name}
                          {p.is_featured && " · Featured"}
                          {p.is_demo && " · DEMO"}
                          {!p.images.length && " · No photos"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{formatZAR(p.price)}</td>
                  <td className="whitespace-nowrap">{CONDITION_LABELS[p.condition]}</td>
                  <td>
                    <StatusBadge status={p.status} label={PRODUCT_STATUS_LABELS[p.status]} />
                  </td>
                  <td className="whitespace-nowrap text-ink-soft">{formatDate(p.sold_at ?? p.created_at)}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-ink-soft">
                  No products here yet.{" "}
                  <Link href="/admin/products/new" className="text-gold-ink">
                    Add your first guitar
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
