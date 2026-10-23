import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { StatusBadge } from "@/components/ui/Badge";
import { getBrands, getCategories } from "@/lib/data/products";
import { deleteProductAction, setProductStatusAction } from "@/app/admin/actions";
import { formatDateTime, formatZAR } from "@/lib/format";
import { PRODUCT_STATUS_LABELS, PURCHASE_STATUS_LABELS, type ProductStatus, type PurchaseStatus } from "@/lib/constants";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();
  const [{ data: product }, { data: priv }, categories, brands, { data: requests }, { count: alerts }, { count: wishes }] = await Promise.all([
    supabase.from("products").select("*, brand:brands(name), images:product_images(id, storage_path, alt_text, sort_order)").eq("id", id).maybeSingle(),
    supabase.from("product_private").select("*").eq("product_id", id).maybeSingle(),
    getCategories(),
    getBrands(),
    supabase.from("purchase_request_items").select("request:purchase_requests(id, reference, status, contact_name, created_at)").eq("product_id", id),
    supabase.from("availability_alerts").select("id", { count: "exact", head: true }).eq("product_id", id).eq("is_active", true),
    supabase.from("wishlists").select("product_id", { count: "exact", head: true }).eq("product_id", id),
  ]);
  if (!product) notFound();
  const p = product as unknown as {
    id: string; slug: string; title: string; price: number; compare_at_price: number | null; status: ProductStatus; is_demo: boolean; created_at: string; sold_at: string | null;
    brand: { name: string } | null; images: { id: string; storage_path: string; alt_text: string | null; sort_order: number }[];
    model: string | null; category_id: number; condition: string; functional_status: string; description: string; defects: string; history: string;
    specifications: string; included_items: string; year_made: string | null; colour: string | null; is_featured: boolean;
  };
  const images = [...p.images].sort((a, b) => a.sort_order - b.sort_order);
  const linked = ((requests ?? []) as unknown as { request: { id: string; reference: string; status: PurchaseStatus; contact_name: string; created_at: string } | null }[])
    .map((r) => r.request)
    .filter(Boolean) as { id: string; reference: string; status: PurchaseStatus; contact_name: string; created_at: string }[];

  const quick: { status: ProductStatus; label: string }[] = [
    { status: "published", label: "Publish (available)" },
    { status: "reserved", label: "Mark reserved" },
    { status: "sold", label: "Mark sold" },
    { status: "archived", label: "Archive" },
    { status: "draft", label: "Back to draft" },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/products" className="text-sm text-gold-ink">
        ← Inventory
      </Link>
      {created && <p role="status" className="rounded-lg bg-success-bg p-3 text-sm text-success">Product created. Now add photographs, then publish it when ready.</p>}
      <AdminPageHeader
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} label={PRODUCT_STATUS_LABELS[p.status]} /> {formatZAR(p.price)} · added {formatDateTime(p.created_at)}
            {p.sold_at && ` · sold ${formatDateTime(p.sold_at)}`} · {wishes ?? 0} wishlist(s) · {alerts ?? 0} availability alert(s)
          </span>
        }
        actions={
          <Link href={`/shop/${p.slug}`} className="btn btn-outline btn-sm" target="_blank">
            Preview listing
          </Link>
        }
      />

      <section className="card flex flex-wrap items-center gap-2 p-4" aria-label="Quick status">
        <span className="mr-2 text-sm font-semibold">Quick status:</span>
        {quick
          .filter((q) => q.status !== p.status)
          .map((q) => (
            <form key={q.status} action={setProductStatusAction}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="status" value={q.status} />
              <button className="btn btn-outline btn-sm">{q.label}</button>
            </form>
          ))}
        {(p.status === "draft" || p.is_demo) && (
          <form action={deleteProductAction} className="ml-auto">
            <input type="hidden" name="id" value={p.id} />
            <button className="btn btn-sm text-danger hover:bg-danger-bg">Delete permanently</button>
          </form>
        )}
      </section>
      <p className="text-xs text-ink-soft">
        Tip: purchase requests update inventory automatically — approving a request reserves the guitar, completing it marks it sold, and
        declining/cancelling releases it. Real (non-draft) stock can&apos;t be deleted; archive it instead so your sales history is preserved.
      </p>

      {linked.length > 0 && (
        <section className="card p-5">
          <h2 className="text-lg">Purchase requests for this guitar</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {linked.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/requests/${r.id}`} className="text-walnut hover:text-gold-ink">
                  {r.reference}
                </Link>{" "}
                — {r.contact_name} — {PURCHASE_STATUS_LABELS[r.status]} ({formatDateTime(r.created_at)})
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductImageManager productId={p.id} productTitle={p.title} images={images} />

      <ProductEditor
        categories={categories}
        brands={brands.map((b) => b.name)}
        values={{
          ...p,
          brand_name: p.brand?.name ?? "",
          price: Number(p.price),
          compare_at_price: p.compare_at_price === null ? null : Number(p.compare_at_price),
          serial_number: priv?.serial_number,
          acquisition_notes: priv?.acquisition_notes,
          internal_notes: priv?.internal_notes,
        }}
      />
    </div>
  );
}
