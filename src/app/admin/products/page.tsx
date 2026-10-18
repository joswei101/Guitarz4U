import Link from "next/link";
import { query } from "@/lib/db";
import { publicImageUrl } from "@/lib/storage";
import { conditionLabel, formatDate, formatRand, PRODUCT_STATUSES } from "@/lib/format";
import { StatusBadge, Empty } from "@/components/ui";
import { Flash } from "@/components/Flash";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; msg?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && sp.status in PRODUCT_STATUSES ? sp.status : "";
  const q = (sp.q ?? "").trim().slice(0, 100);
  const rows = await query<{ id: string; slug: string; title: string; brand: string | null; price_cents: number; condition: string; status: string; featured: boolean; is_demo: boolean; created_at: Date; sold_at: Date | null; image: string | null; requests: number }>(
    `select p.id, p.slug, p.title, b.name brand, p.price_cents, p.condition, p.status, p.featured, p.is_demo, p.created_at, p.sold_at,
       (select storage_key from product_images i where i.product_id=p.id order by sort_order limit 1) image,
       (select count(*)::int from purchase_request_items i join purchase_requests r on r.id=i.purchase_request_id where i.product_id=p.id and r.status not in ('declined','cancelled','completed')) requests
     from products p left join brands b on b.id=p.brand_id
     where ($1 = '' or p.status = $1) and ($2 = '' or p.title ilike '%'||$2||'%' or b.name ilike '%'||$2||'%' or p.serial_number ilike '%'||$2||'%')
     order by p.updated_at desc limit 300`,
    [status, q],
  );
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Inventory</h1>
        <Link className="btn btn-primary" href="/admin/products/new">+ Add product</Link>
      </div>
      <nav className="chips" aria-label="Filter by status">
        <Link className="chip" href="/admin/products" aria-current={!status ? "true" : undefined}>All</Link>
        {Object.entries(PRODUCT_STATUSES).map(([k, v]) => (
          <Link key={k} className="chip" href={`/admin/products?status=${k}`} aria-current={status === k ? "true" : undefined}>{k === "sold" ? "Sold archive" : v}</Link>
        ))}
      </nav>
      <form className="row" action="/admin/products">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="sr-only" htmlFor="q">Search inventory</label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="Search title, brand or serial number" style={{ maxWidth: 360 }} />
        <button className="btn btn-outline btn-sm">Search</button>
      </form>
      {rows.length === 0 ? <Empty title="No products here yet"><Link className="btn btn-primary btn-sm" href="/admin/products/new">Add your first guitar</Link></Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th></th><th>Product</th><th>Status</th><th className="num">Price</th><th>Condition</th><th>Added</th><th>Open requests</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 56 }}>{p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={publicImageUrl(p.image)} alt="" width={48} height={60} style={{ width: 48, height: 60, objectFit: "cover", borderRadius: 4 }} />
                  )}</td>
                  <td>
                    <Link href={`/admin/products/${p.id}`}><strong>{p.title}</strong></Link>
                    <div className="small muted">{p.brand ?? "—"}{p.featured ? " · Featured" : ""}{p.is_demo ? " · DEMO" : ""}</div>
                  </td>
                  <td><StatusBadge status={p.status} label={PRODUCT_STATUSES[p.status as keyof typeof PRODUCT_STATUSES]} />{p.sold_at && <div className="small muted">{formatDate(p.sold_at)}</div>}</td>
                  <td className="num">{formatRand(p.price_cents)}</td>
                  <td>{conditionLabel(p.condition)}</td>
                  <td>{formatDate(p.created_at)}</td>
                  <td>{p.requests > 0 ? <Link href={`/admin/requests?product=${p.id}`}>{p.requests}</Link> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
