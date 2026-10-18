import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getHistory } from "@/lib/workflow";
import { whatsappLink } from "@/lib/settings";
import { formatDate, formatDateTime, formatRand, REPAIR_STATUSES, REPAIR_SERVICES, CONTACT_METHODS } from "@/lib/format";
import { StatusBadge, Timeline } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { updateRepair, provideQuote } from "../../actions";

export default async function AdminRepair({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await queryOne<{ id: string; reference: string; status: keyof typeof REPAIR_STATUSES; user_id: string | null; customer_name: string; contact_phone: string; email: string; preferred_contact: keyof typeof CONTACT_METHODS; guitar_brand: string; guitar_model: string; category: string; problem: string; services: (keyof typeof REPAIR_SERVICES)[]; preferred_date: Date | null; confirmed_date: Date | null; notes: string; quote_amount_cents: number | null; quote_message: string; quote_provided_at: Date | null; quote_response: string | null; quote_responded_at: Date | null; admin_notes: string; created_at: Date }>(
    "select r.*, c.name category from repair_bookings r join categories c on c.id=r.category_id where r.id=$1",
    [id],
  );
  if (!r) notFound();
  const [images, history] = await Promise.all([
    query<{ id: string }>("select id from repair_images where repair_id=$1 order by created_at", [id]),
    getHistory("repair_booking", id),
  ]);
  const closed = ["completed", "cancelled"].includes(r.status);
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <p className="small"><Link href="/admin/repairs">← Repairs</Link></p>
      <div className="row between">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{r.guitar_brand} {r.guitar_model} <span className="small muted">{r.reference}</span></h1>
        <StatusBadge status={r.status} label={REPAIR_STATUSES[r.status]} />
      </div>
      <div className="detail-grid">
        <div className="stack">
          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Booking</h2>
            <dl className="kv">
              <dt>Type</dt><dd>{r.category}</dd>
              <dt>Work requested</dt><dd>{r.services.map((s) => REPAIR_SERVICES[s]).join(", ") || "—"}</dd>
              <dt>Problem</dt><dd className="pre-line">{r.problem}</dd>
              <dt>Preferred date</dt><dd>{r.preferred_date ? `${formatDate(r.preferred_date)} (request only)` : "—"}</dd>
              <dt>Notes</dt><dd className="pre-line">{r.notes || "—"}</dd>
            </dl>
            {images.length > 0 && (<><h3 style={{ marginTop: 16 }}>Photos — private</h3><div className="thumb-row">
              {images.map((img) => (
                <a key={img.id} href={`/api/private-image/repair/${img.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/private-image/repair/${img.id}`} alt="Repair photo" loading="lazy" />
                </a>
              ))}
            </div></>)}
          </section>
          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Update repair</h2>
            <form action={updateRepair} className="form">
              <input type="hidden" name="id" value={r.id} />
              <div className="form-grid">
                <div className="field"><label htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={r.status}>
                    {Object.entries(REPAIR_STATUSES).map(([k, v]) => (
                      <option key={k} value={k} disabled={["approved", "in_progress", "awaiting_collection", "completed"].includes(k) && !r.quote_provided_at}>{v}{["approved", "in_progress", "awaiting_collection", "completed"].includes(k) && !r.quote_provided_at ? " — quote first" : ""}</option>
                    ))}
                  </select></div>
                <div className="field"><label htmlFor="confirmedDate">Confirmed drop-off date</label>
                  <input id="confirmedDate" name="confirmedDate" type="date" defaultValue={r.confirmed_date ? r.confirmed_date.toISOString().slice(0, 10) : ""} /></div>
              </div>
              <div className="field"><label htmlFor="customerUpdate">Message to customer (visible to them)</label><textarea id="customerUpdate" name="customerUpdate" rows={3} maxLength={2000} /></div>
              <div className="private-box"><h3>Private admin notes</h3>
                <label className="sr-only" htmlFor="adminNotes">Private admin notes</label>
                <textarea id="adminNotes" name="adminNotes" className="input" rows={3} defaultValue={r.admin_notes} style={{ width: "100%" }} /></div>
              <p className="small muted" style={{ margin: 0 }}>Only mark a repair as Approved or In progress once the customer has agreed to the quote{r.quote_response ? ` (customer ${r.quote_response} on ${formatDateTime(r.quote_responded_at)})` : r.quote_provided_at ? " (no response recorded in the account yet — confirm with them personally)" : ""}.</p>
              <button className="btn btn-primary">Save</button>
            </form>
          </section>
        </div>
        <div className="stack">
          <section className="card stack">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Customer</h2>
            <dl className="kv">
              <dt>Name</dt><dd>{r.customer_name}</dd>
              <dt>Phone</dt><dd>{r.contact_phone}</dd>
              <dt>Email</dt><dd>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : "—"}</dd>
              <dt>Prefers</dt><dd>{CONTACT_METHODS[r.preferred_contact]}</dd>
              <dt>Account</dt><dd>{r.user_id ? <Link href={`/admin/customers/${r.user_id}`}>View customer</Link> : "Guest"}</dd>
              <dt>Booked</dt><dd>{formatDateTime(r.created_at)}</dd>
            </dl>
            <a className="btn btn-whatsapp btn-sm" href={whatsappLink(r.contact_phone, `Hi ${r.customer_name.split(" ")[0]}, this is Guitarz4U about your repair booking ${r.reference}. `)} target="_blank" rel="noopener noreferrer">WhatsApp customer</a>
          </section>
          <section className="card stack">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Quote</h2>
            {r.quote_provided_at ? (
              <p style={{ margin: 0 }}><strong>{r.quote_amount_cents !== null ? formatRand(r.quote_amount_cents) : "See message"}</strong> sent {formatDateTime(r.quote_provided_at)}. {r.quote_response ? <span className={`tag tag-${r.quote_response === "accepted" ? "good" : "bad"}`}>Customer {r.quote_response}</span> : <span className="tag tag-warn">Awaiting response</span>}</p>
            ) : <p className="muted" style={{ margin: 0 }}>No quote yet.</p>}
            {!closed && (
              <form action={provideQuote} className="form card-flat">
                <input type="hidden" name="id" value={r.id} />
                <div className="field"><label htmlFor="amount">Quote amount (R)</label><input id="amount" name="amount" type="text" inputMode="decimal" defaultValue={r.quote_amount_cents !== null ? r.quote_amount_cents / 100 : ""} /></div>
                <div className="field"><label htmlFor="message">Quote details</label><textarea id="message" name="message" rows={3} maxLength={2000} defaultValue={r.quote_message} placeholder="What the quote includes, parts, estimated turnaround…" /></div>
                <button className="btn btn-primary btn-sm">{r.quote_provided_at ? "Send revised quote" : "Send quote"}</button>
              </form>
            )}
          </section>
          <section className="card"><h2 style={{ fontSize: "1.2rem" }}>Customer-visible history</h2><Timeline events={history} labels={REPAIR_STATUSES} /></section>
        </div>
      </div>
    </div>
  );
}
