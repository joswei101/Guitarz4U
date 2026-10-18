import Link from "next/link";
import { query } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatDateTime, RESERVATION_STATUSES, CONTACT_METHODS, PRODUCT_STATUSES } from "@/lib/format";
import { StatusBadge, Empty } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { updateReservation } from "../actions";

export default async function AdminReservations({ searchParams }: { searchParams: Promise<{ msg?: string; all?: string }> }) {
  const sp = await searchParams;
  const all = sp.all === "1";
  const [rows, s] = await Promise.all([
    query<{ id: string; reference: string; status: keyof typeof RESERVATION_STATUSES; contact_name: string; contact_email: string; contact_phone: string; preferred_contact: keyof typeof CONTACT_METHODS; message: string; admin_notes: string; expires_at: Date | null; created_at: Date; product_id: string; title: string; product_status: string }>(
      `select r.*, p.title, p.status product_status from reservations r join products p on p.id=r.product_id
       where $1 or r.status in ('requested','approved') order by (r.status='requested') desc, r.created_at desc limit 300`,
      [all],
    ),
    getSettings(),
  ]);
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Reservations</h1>
        <Link className="btn btn-ghost btn-sm" href={all ? "/admin/reservations" : "/admin/reservations?all=1"}>{all ? "Show active only" : "Show all (history)"}</Link>
      </div>
      <p className="muted">Approving a reservation marks the guitar as Reserved for the number of days you choose. Only one reservation per guitar can be approved. Overdue reservations expire automatically.</p>
      {rows.length === 0 ? <Empty title="No reservations to review" /> : rows.map((r) => (
        <article key={r.id} id={r.id} className="card stack" data-testid="admin-reservation">
          <div className="row between">
            <h2 style={{ fontSize: "1.15rem", margin: 0 }}><Link href={`/admin/products/${r.product_id}`}>{r.title}</Link> <span className="small muted">({PRODUCT_STATUSES[r.product_status as keyof typeof PRODUCT_STATUSES]})</span></h2>
            <StatusBadge status={r.status} label={RESERVATION_STATUSES[r.status]} />
          </div>
          <p className="small" style={{ margin: 0 }}>
            <strong>{r.reference}</strong> · {r.contact_name} · {r.contact_email} · {r.contact_phone || "no phone"} · prefers {CONTACT_METHODS[r.preferred_contact]} · {formatDateTime(r.created_at)}
            {r.expires_at && r.status === "approved" && <> · <strong>expires {formatDateTime(r.expires_at)}</strong></>}
          </p>
          {r.message && <p className="pre-line" style={{ margin: 0 }}>“{r.message}”</p>}
          <form action={updateReservation} className="form">
            <input type="hidden" name="id" value={r.id} />
            <div className="form-grid">
              <div className="field"><label htmlFor={`cu-${r.id}`}>Message to customer (optional)</label><input id={`cu-${r.id}`} name="customerUpdate" type="text" maxLength={2000} /></div>
              <div className="field"><label htmlFor={`days-${r.id}`}>Hold for (days, when approving)</label><input id={`days-${r.id}`} name="days" type="number" min={1} max={30} defaultValue={s.reservationDays} /></div>
              <div className="field field-full"><label htmlFor={`an-${r.id}`}>Private admin notes</label><input id={`an-${r.id}`} name="adminNotes" type="text" defaultValue={r.admin_notes} /></div>
            </div>
            <div className="row">
              {r.status === "requested" && <button className="btn btn-primary btn-sm" name="op" value="approve">Approve</button>}
              {r.status === "requested" && <button className="btn btn-outline btn-sm" name="op" value="decline">Decline</button>}
              {r.status === "approved" && <button className="btn btn-outline btn-sm" name="op" value="convert">Converted to purchase</button>}
              {r.status === "approved" && <button className="btn btn-outline btn-sm" name="op" value="expire">Mark expired</button>}
              {["requested", "approved"].includes(r.status) && <button className="btn btn-ghost btn-sm" name="op" value="cancel">Cancel</button>}
              <button className="btn btn-ghost btn-sm" name="op" value="note">Save notes only</button>
            </div>
          </form>
        </article>
      ))}
    </div>
  );
}
