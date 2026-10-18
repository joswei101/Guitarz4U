import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateTime, formatRand, PURCHASE_STATUSES, CONTACT_METHODS, type PurchaseStatus } from "@/lib/format";
import { StatusBadge, Empty } from "@/components/ui";

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ status?: string; product?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && sp.status in PURCHASE_STATUSES ? sp.status : sp.status === "open" || !sp.status ? "open" : "";
  const product = sp.product && /^[0-9a-f-]{36}$/i.test(sp.product) ? sp.product : null;
  const rows = await query<{ id: string; reference: string; status: PurchaseStatus; contact_name: string; preferred_contact: keyof typeof CONTACT_METHODS; estimated_total_cents: number; created_at: Date; items: string; payment_confirmed_at: Date | null }>(
    `select r.id, r.reference, r.status, r.contact_name, r.preferred_contact, r.estimated_total_cents, r.created_at, r.payment_confirmed_at,
       (select string_agg(title_snapshot, ', ') from purchase_request_items where purchase_request_id=r.id) items
     from purchase_requests r
     where ($1 = '' or ($1 = 'open' and r.status not in ('completed','declined','cancelled')) or r.status = $1)
       and ($2::uuid is null or exists (select 1 from purchase_request_items i where i.purchase_request_id=r.id and i.product_id=$2::uuid))
     order by r.created_at desc limit 300`,
    [status, product],
  );
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Purchase requests &amp; EFT tracking</h1>
      <p className="muted">Requests are never paid online. Record EFT details as sent, and mark payments as received only after checking your own bank account.</p>
      <nav className="chips" aria-label="Filter">
        <Link className="chip" href="/admin/requests?status=open" aria-current={status === "open" ? "true" : undefined}>Open</Link>
        <Link className="chip" href="/admin/requests?status=all" aria-current={status === "" ? "true" : undefined}>All</Link>
        {Object.entries(PURCHASE_STATUSES).map(([k, v]) => <Link key={k} className="chip" href={`/admin/requests?status=${k}`} aria-current={status === k ? "true" : undefined}>{v}</Link>)}
      </nav>
      {rows.length === 0 ? <Empty title="No purchase requests in this view" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Guitars</th><th className="num">Estimate</th><th>Status</th><th>EFT</th><th>Received</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/requests/${r.id}`}><strong>{r.reference}</strong></Link></td>
                  <td>{r.contact_name}<div className="small muted">{CONTACT_METHODS[r.preferred_contact]}</div></td>
                  <td>{r.items}</td>
                  <td className="num">{formatRand(r.estimated_total_cents)}</td>
                  <td><StatusBadge status={r.status} label={PURCHASE_STATUSES[r.status]} /></td>
                  <td>{r.payment_confirmed_at ? <span className="tag tag-good">Received</span> : <span className="tag tag-neutral">Not received</span>}</td>
                  <td className="small">{formatDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
