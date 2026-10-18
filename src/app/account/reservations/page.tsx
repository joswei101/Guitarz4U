import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { formatDate, formatDateTime, RESERVATION_STATUSES } from "@/lib/format";
import { StatusBadge, Empty } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { cancelReservation } from "../actions";

export default async function MyReservations({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const rows = await query<{ id: string; reference: string; status: keyof typeof RESERVATION_STATUSES; title: string; slug: string; expires_at: Date | null; customer_update: string; created_at: Date }>(
    `select r.id, r.reference, r.status, p.title, p.slug, r.expires_at, r.customer_update, r.created_at
     from reservations r join products p on p.id=r.product_id where r.user_id=$1 order by r.created_at desc`,
    [user.id],
  );
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <h1 style={{ fontSize: "2rem" }}>Reservations</h1>
      <p className="muted">A reservation is only confirmed once Guitarz4U approves it. Approved reservations expire on the date shown.</p>
      {rows.length === 0 ? <Empty title="No reservations"><p className="muted">Use “Request reservation” on any available guitar.</p></Empty> : rows.map((r) => (
        <article key={r.id} className="card stack">
          <div className="row between">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}><Link href={`/shop/${r.slug}`}>{r.title}</Link></h2>
            <StatusBadge status={r.status} label={RESERVATION_STATUSES[r.status]} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>Reference {r.reference} · requested {formatDate(r.created_at)}{r.status === "approved" && r.expires_at ? ` · held until ${formatDateTime(r.expires_at)}` : ""}</p>
          {r.customer_update && <div className="notice"><strong>Message from Guitarz4U</strong><p className="pre-line">{r.customer_update}</p></div>}
          {["requested", "approved"].includes(r.status) && (
            <form action={cancelReservation}><input type="hidden" name="id" value={r.id} /><button className="btn btn-outline btn-sm">Cancel reservation</button></form>
          )}
        </article>
      ))}
    </div>
  );
}
