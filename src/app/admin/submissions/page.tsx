import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateTime, formatRand, SELLER_STATUSES, WORKS_OPTIONS, conditionLabel } from "@/lib/format";
import { StatusBadge, Empty } from "@/components/ui";

export default async function AdminSubmissions({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && sp.status in SELLER_STATUSES ? sp.status : sp.status === "all" ? "" : "open";
  const rows = await query<{ id: string; reference: string; status: keyof typeof SELLER_STATUSES; seller_name: string; brand: string; model: string; condition: string; works: keyof typeof WORKS_OPTIONS; asking_price_cents: number | null; created_at: Date; photos: number }>(
    `select s.id, s.reference, s.status, s.seller_name, s.brand, s.model, s.condition, s.works, s.asking_price_cents, s.created_at,
       (select count(*)::int from seller_submission_images i where i.submission_id=s.id) photos
     from seller_submissions s
     where ($1='' or ($1='open' and s.status not in ('purchased','rejected','withdrawn','offer_declined')) or s.status=$1)
     order by s.created_at desc limit 300`,
    [status],
  );
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Seller submissions &amp; offers</h1>
      <nav className="chips" aria-label="Filter">
        <Link className="chip" href="/admin/submissions" aria-current={status === "open" ? "true" : undefined}>Open</Link>
        <Link className="chip" href="/admin/submissions?status=all" aria-current={status === "" ? "true" : undefined}>All</Link>
        {Object.entries(SELLER_STATUSES).map(([k, v]) => <Link key={k} className="chip" href={`/admin/submissions?status=${k}`} aria-current={status === k ? "true" : undefined}>{v}</Link>)}
      </nav>
      {rows.length === 0 ? <Empty title="No submissions in this view" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Reference</th><th>Guitar</th><th>Seller</th><th>Condition</th><th>Works?</th><th className="num">Asking</th><th>Status</th><th>Received</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/submissions/${r.id}`}><strong>{r.reference}</strong></Link></td>
              <td>{r.brand} {r.model}<div className="small muted">{r.photos} photo(s)</div></td>
              <td>{r.seller_name}</td>
              <td>{conditionLabel(r.condition)}</td>
              <td>{WORKS_OPTIONS[r.works]}</td>
              <td className="num">{r.asking_price_cents !== null ? formatRand(r.asking_price_cents) : "—"}</td>
              <td><StatusBadge status={r.status} label={SELLER_STATUSES[r.status]} /></td>
              <td className="small">{formatDateTime(r.created_at)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
