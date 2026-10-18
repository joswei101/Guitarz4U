import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { formatDate, formatRand, PURCHASE_STATUSES, type PurchaseStatus } from "@/lib/format";
import { StatusBadge, Empty, EftNotice } from "@/components/ui";

export default async function MyRequests() {
  const user = await requireUser();
  const rows = await query<{ id: string; reference: string; status: PurchaseStatus; estimated_total_cents: number; created_at: Date; items: string }>(
    `select r.id, r.reference, r.status, r.estimated_total_cents, r.created_at,
       (select string_agg(title_snapshot, ', ') from purchase_request_items where purchase_request_id=r.id) as items
     from purchase_requests r where r.user_id=$1 order by r.created_at desc`,
    [user.id],
  );
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Purchase requests</h1>
      <EftNotice />
      {rows.length === 0 ? (
        <Empty title="No purchase requests yet"><Link className="btn btn-primary btn-sm" href="/shop">Browse guitars</Link></Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>Guitars</th><th>Date</th><th>Status</th><th className="num">Estimated total</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/account/requests/${r.id}`}>{r.reference}</Link></td>
                  <td>{r.items}</td>
                  <td>{formatDate(r.created_at)}</td>
                  <td><StatusBadge status={r.status} label={PURCHASE_STATUSES[r.status]} /></td>
                  <td className="num">{formatRand(r.estimated_total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
