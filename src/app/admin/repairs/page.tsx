import Link from "next/link";
import { query } from "@/lib/db";
import { formatDate, formatDateTime, formatRand, REPAIR_STATUSES, REPAIR_SERVICES } from "@/lib/format";
import { StatusBadge, Empty } from "@/components/ui";

export default async function AdminRepairs({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status && sp.status in REPAIR_STATUSES ? sp.status : sp.status === "all" ? "" : "open";
  const rows = await query<{ id: string; reference: string; status: keyof typeof REPAIR_STATUSES; customer_name: string; guitar_brand: string; guitar_model: string; services: (keyof typeof REPAIR_SERVICES)[]; preferred_date: Date | null; confirmed_date: Date | null; quote_amount_cents: number | null; quote_response: string | null; created_at: Date }>(
    `select id, reference, status, customer_name, guitar_brand, guitar_model, services, preferred_date, confirmed_date, quote_amount_cents, quote_response, created_at
     from repair_bookings where ($1='' or ($1='open' and status not in ('completed','cancelled')) or status=$1) order by created_at desc limit 300`,
    [status],
  );
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Repairs</h1>
      <nav className="chips" aria-label="Filter">
        <Link className="chip" href="/admin/repairs" aria-current={status === "open" ? "true" : undefined}>Open</Link>
        <Link className="chip" href="/admin/repairs?status=all" aria-current={status === "" ? "true" : undefined}>All</Link>
        {Object.entries(REPAIR_STATUSES).map(([k, v]) => <Link key={k} className="chip" href={`/admin/repairs?status=${k}`} aria-current={status === k ? "true" : undefined}>{v}</Link>)}
      </nav>
      {rows.length === 0 ? <Empty title="No repairs in this view" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Reference</th><th>Guitar</th><th>Customer</th><th>Work</th><th>Dates</th><th>Quote</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/repairs/${r.id}`}><strong>{r.reference}</strong></Link><div className="small muted">{formatDateTime(r.created_at)}</div></td>
              <td>{r.guitar_brand} {r.guitar_model}</td>
              <td>{r.customer_name}</td>
              <td className="small">{r.services.map((s) => REPAIR_SERVICES[s]).join(", ") || "—"}</td>
              <td className="small">{r.preferred_date ? `Wants ${formatDate(r.preferred_date)}` : "—"}{r.confirmed_date && <div><strong>Confirmed {formatDate(r.confirmed_date)}</strong></div>}</td>
              <td>{r.quote_amount_cents !== null ? formatRand(r.quote_amount_cents) : "—"}{r.quote_response && <div className="small"><span className={`tag tag-${r.quote_response === "accepted" ? "good" : "bad"}`}>{r.quote_response}</span></div>}</td>
              <td><StatusBadge status={r.status} label={REPAIR_STATUSES[r.status]} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
