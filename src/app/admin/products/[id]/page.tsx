import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { ProductForm } from "@/components/admin/ProductForm";
import { ImageManager } from "@/components/admin/ImageManager";
import { ActionButton } from "@/components/account/ActionButton";
import { Alert } from "@/components/ui/Alert";
import { deleteProduct } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: p }, cats, brands, priv, reservations, requests] = await Promise.all([
    supabase.from("products").select("*, images:product_images(id, storage_path, alt_text, sort_order)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("product_private").select("*").eq("product_id", id).maybeSingle(),
    supabase.from("reservations").select("id, reference, status, contact_name, created_at").eq("product_id", id).order("created_at", { ascending: false }),
    supabase.from("purchase_request_items").select("request:purchase_requests(id, reference, status, contact_name, created_at)").eq("product_id", id),
  ]);
  if (!p) notFound();
  const images = [...p.images].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="max-w-4xl space-y-6">
      <AdminTitle
        title={p.title}
        actions={
          <>
            {["published", "reserved", "sold"].includes(p.status) && <Link href={`/shop/${p.slug}`} target="_blank" className="btn btn-outline">View on site</Link>}
            <ActionButton action={deleteProduct.bind(null, p.id)} confirm="Permanently delete this product and its photos? (Archive instead to keep history.)" className="btn btn-ghost text-danger">
              Delete
            </ActionButton>
          </>
        }
      >
        Created {formatDateTime(p.created_at)} · Updated {formatDateTime(p.updated_at)}
        {p.sold_at && ` · Sold ${formatDateTime(p.sold_at)}`}
      </AdminTitle>
      {sp.created && <Alert tone="success">Product created as {p.status}. Now add photos below, then set it to Available to publish.</Alert>}
      {p.is_demo && <Alert tone="info">This is demo data. Remove all demo data from Settings before launch.</Alert>}
      <ImageManager productId={p.id} productTitle={p.title} images={images} />
      <ProductForm
        values={{ ...p, price: Number(p.price), compare_at_price: p.compare_at_price ? Number(p.compare_at_price) : null, ...(priv.data ?? {}), acquisition_cost: priv.data?.acquisition_cost ? Number(priv.data.acquisition_cost) : null }}
        categories={cats.data ?? []}
        brands={brands.data ?? []}
      />
      {(reservations.data?.length || requests.data?.length) ? (
        <section className="card p-5">
          <h2 className="text-xl">History</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {reservations.data?.map((r) => (
              <li key={r.id}><Link className="link" href={`/admin/reservations/${r.id}`}>{r.reference}</Link> — reservation by {r.contact_name} ({r.status}), {formatDateTime(r.created_at)}</li>
            ))}
            {requests.data?.map((x) => x.request && (
              <li key={x.request.id}><Link className="link" href={`/admin/requests/${x.request.id}`}>{x.request.reference}</Link> — purchase request by {x.request.contact_name} ({x.request.status}), {formatDateTime(x.request.created_at)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
