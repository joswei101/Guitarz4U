import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getCategories } from "@/lib/products";
import { publicImageUrl } from "@/lib/storage";
import { formatDate, formatRand, PURCHASE_STATUSES, RESERVATION_STATUSES, type PurchaseStatus } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { updateProduct, updateImage, deleteProduct } from "../../actions";
import { ProductForm } from "../ProductForm";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await queryOne<{ id: string; slug: string; title: string; brand: string | null; model: string; category_id: number; price_cents: number; compare_at_price_cents: number | null; condition: string; description: string; defects: string; history: string; serial_number: string | null; status: string; featured: boolean; is_demo: boolean; created_at: Date }>(
    "select p.*, b.name brand from products p left join brands b on b.id=p.brand_id where p.id=$1",
    [id],
  );
  if (!p) notFound();
  const [categories, brands, images, requests, reservations, alerts] = await Promise.all([
    getCategories(),
    query<{ name: string }>("select name from brands order by name"),
    query<{ id: string; storage_key: string; alt_text: string }>("select id, storage_key, alt_text from product_images where product_id=$1 order by sort_order, created_at", [id]),
    query<{ id: string; reference: string; status: PurchaseStatus; contact_name: string; created_at: Date }>(
      "select r.id, r.reference, r.status, r.contact_name, r.created_at from purchase_request_items i join purchase_requests r on r.id=i.purchase_request_id where i.product_id=$1 order by r.created_at desc", [id]),
    query<{ reference: string; status: keyof typeof RESERVATION_STATUSES; contact_name: string }>("select reference, status, contact_name from reservations where product_id=$1 order by created_at desc", [id]),
    queryOne<{ n: number }>("select count(*)::int n from availability_alerts where product_id=$1 and notified_at is null", [id]),
  ]);
  const toRand = (c: number | null) => (c === null ? "" : String(c / 100));
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      {sp.error && <div className="notice notice-bad" role="alert"><p>{sp.error}</p></div>}
      <p className="small"><Link href="/admin/products">← Inventory</Link></p>
      <div className="row between">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{p.title}</h1>
        <Link className="btn btn-outline btn-sm" href={`/shop/${p.slug}`} target="_blank">View / preview page ↗</Link>
      </div>
      {p.is_demo && <div className="notice notice-warn"><p>This is a <strong>demonstration</strong> product. Remove demo data before launch.</p></div>}
      <p className="small muted">Added {formatDate(p.created_at)} · {alerts?.n ?? 0} customer(s) waiting for an availability alert</p>

      <section className="card">
        <h2 style={{ fontSize: "1.2rem" }}>Photos ({images.length})</h2>
        {images.length === 0 && <p className="muted">No photos yet — add some below. The first photo is used on product cards.</p>}
        <div className="grid-3">
          {images.map((img, i) => (
            <div key={img.id} className="card-flat stack" style={{ padding: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicImageUrl(img.storage_key)} alt={img.alt_text} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 6 }} />
              <form action={updateImage} className="row" style={{ flexWrap: "nowrap" }}>
                <input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="op" value="alt" />
                <label className="sr-only" htmlFor={`alt-${img.id}`}>Photo description</label>
                <input id={`alt-${img.id}`} name="alt" className="input" defaultValue={img.alt_text} placeholder="Describe photo (alt text)" maxLength={200} />
                <button className="btn btn-ghost btn-sm">Save</button>
              </form>
              <div className="row">
                {i > 0 && <form action={updateImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="op" value="first" /><button className="btn btn-ghost btn-sm">Make main</button></form>}
                {i > 0 && <form action={updateImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="op" value="up" /><button className="btn btn-ghost btn-sm">Move left</button></form>}
                <form action={updateImage}><input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="op" value="delete" /><ConfirmButton className="btn btn-ghost btn-sm" message="Delete this photo?">Delete</ConfirmButton></form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ProductForm
        values={{
          id: p.id, title: p.title, brand: p.brand ?? "", model: p.model, categoryId: p.category_id, price: toRand(p.price_cents), compareAt: toRand(p.compare_at_price_cents),
          condition: p.condition, description: p.description, defects: p.defects, history: p.history, serialNumber: p.serial_number ?? "", status: p.status, featured: p.featured,
        }}
        categories={categories}
        brands={brands.map((b) => b.name)}
        action={updateProduct}
        submitLabel="Save changes"
      />

      <div className="detail-grid">
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Purchase requests for this guitar</h2>
          {requests.length === 0 ? <p className="muted">None.</p> : (
            <ul>{requests.map((r) => <li key={r.id}><Link href={`/admin/requests/${r.id}`}>{r.reference}</Link> — {r.contact_name} — <StatusBadge status={r.status} label={PURCHASE_STATUSES[r.status]} /></li>)}</ul>
          )}
          <h3>Reservations</h3>
          {reservations.length === 0 ? <p className="muted">None.</p> : <ul>{reservations.map((r) => <li key={r.reference}>{r.reference} — {r.contact_name} — {RESERVATION_STATUSES[r.status]}</li>)}</ul>}
        </section>
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Delete product</h2>
          <p className="small muted">Only products that were never requested or reserved can be deleted. Otherwise set the status to Archived or Sold — this keeps your business history. Current price: {formatRand(p.price_cents)}.</p>
          <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Delete this product and its photos permanently? This cannot be undone.">Delete permanently</ConfirmButton></form>
        </section>
      </div>
    </div>
  );
}
