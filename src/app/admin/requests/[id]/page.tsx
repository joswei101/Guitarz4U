import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getHistory } from "@/lib/workflow";
import { getSettings, whatsappLink } from "@/lib/settings";
import { formatDateTime, formatRand, PURCHASE_STATUSES, CONTACT_METHODS, PRODUCT_STATUSES, type PurchaseStatus } from "@/lib/format";
import { StatusBadge, Timeline } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { updatePurchaseRequest, recordEftInstructions, confirmPayment } from "../../actions";

export default async function AdminRequest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await queryOne<{
    id: string; reference: string; status: PurchaseStatus; user_id: string | null; contact_name: string; contact_email: string; contact_phone: string;
    preferred_contact: keyof typeof CONTACT_METHODS; message: string; estimated_total_cents: number; agreed_total_cents: number | null;
    customer_update: string; admin_notes: string; eft_instructions_sent_at: Date | null; eft_by: string | null;
    payment_confirmed_at: Date | null; paid_by: string | null; created_at: Date;
  }>(
    `select r.*, e.name eft_by, p.name paid_by from purchase_requests r
     left join "user" e on e.id=r.eft_instructions_sent_by left join "user" p on p.id=r.payment_confirmed_by where r.id=$1`,
    [id],
  );
  if (!r) notFound();
  const [items, history, s, other] = await Promise.all([
    query<{ product_id: string | null; title_snapshot: string; price_cents_snapshot: number; status: string | null; price_cents: number | null }>(
      "select i.product_id, i.title_snapshot, i.price_cents_snapshot, p.status, p.price_cents from purchase_request_items i left join products p on p.id=i.product_id where i.purchase_request_id=$1",
      [id],
    ),
    getHistory("purchase_request", id),
    getSettings(),
    query<{ id: string; reference: string; status: PurchaseStatus }>(
      `select distinct r2.id, r2.reference, r2.status from purchase_request_items i join purchase_request_items i2 on i2.product_id=i.product_id and i2.purchase_request_id<>i.purchase_request_id
       join purchase_requests r2 on r2.id=i2.purchase_request_id where i.purchase_request_id=$1 and r2.status not in ('declined','cancelled')`,
      [id],
    ),
  ]);
  const closed = ["completed", "declined", "cancelled"].includes(r.status);
  const wa = whatsappLink(r.contact_phone || "", `Hi ${r.contact_name.split(" ")[0]}, this is Guitarz4U about your purchase request ${r.reference}. `);
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <p className="small"><Link href="/admin/requests">← Purchase requests</Link></p>
      <div className="row between">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{r.reference}</h1>
        <StatusBadge status={r.status} label={PURCHASE_STATUSES[r.status]} />
      </div>
      {other.length > 0 && (
        <div className="notice notice-warn"><strong>Other customers also requested these guitars</strong><p>{other.map((o) => <Link key={o.id} href={`/admin/requests/${o.id}`} style={{ marginRight: 10 }}>{o.reference} ({PURCHASE_STATUSES[o.status]})</Link>)}</p></div>
      )}
      <div className="detail-grid">
        <div className="stack">
          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Requested guitars</h2>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Guitar</th><th>Current status</th><th className="num">Price when requested</th></tr></thead>
              <tbody>
                {items.map((i, n) => (
                  <tr key={n}>
                    <td>{i.product_id ? <Link href={`/admin/products/${i.product_id}`}>{i.title_snapshot}</Link> : i.title_snapshot}{i.price_cents !== null && i.price_cents !== i.price_cents_snapshot && <div className="small muted">Price now {formatRand(i.price_cents)}</div>}</td>
                    <td>{i.status ? <StatusBadge status={i.status} label={PRODUCT_STATUSES[i.status as keyof typeof PRODUCT_STATUSES]} /> : "Deleted"}</td>
                    <td className="num">{formatRand(i.price_cents_snapshot)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <p style={{ marginTop: 10 }}><strong>Estimated total:</strong> {formatRand(r.estimated_total_cents)}{r.agreed_total_cents !== null && <> · <strong>Agreed:</strong> {formatRand(r.agreed_total_cents)}</>}</p>
            {r.message && <><h3>Customer message</h3><p className="pre-line">{r.message}</p></>}
          </section>

          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Update status</h2>
            <form action={updatePurchaseRequest} className="form">
              <input type="hidden" name="id" value={r.id} />
              <div className="form-grid">
                <div className="field"><label htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={r.status}>
                    {Object.entries(PURCHASE_STATUSES).map(([k, v]) => (
                      <option key={k} value={k} disabled={["payment_confirmed", "ready_for_collection", "completed"].includes(k) && !r.payment_confirmed_at}>
                        {v}{["payment_confirmed", "ready_for_collection", "completed"].includes(k) && !r.payment_confirmed_at ? " — record payment first" : ""}
                      </option>
                    ))}
                  </select></div>
                <div className="field"><label htmlFor="agreedTotal">Agreed price (R)</label>
                  <input id="agreedTotal" name="agreedTotal" type="text" inputMode="decimal" defaultValue={r.agreed_total_cents !== null ? r.agreed_total_cents / 100 : ""} /></div>
              </div>
              <div className="field"><label htmlFor="customerUpdate">Message to customer (visible to them)</label>
                <textarea id="customerUpdate" name="customerUpdate" rows={3} maxLength={2000} placeholder="Optional. Never include bank details here — send those privately." /></div>
              <div className="private-box">
                <h3>Private admin notes</h3>
                <label className="sr-only" htmlFor="adminNotes">Private admin notes</label>
                <textarea id="adminNotes" name="adminNotes" className="input" rows={4} defaultValue={r.admin_notes} style={{ width: "100%" }} />
                <p className="small muted" style={{ margin: 0 }}>Never shown to customers.</p>
              </div>
              <p className="small muted" style={{ margin: 0 }}>Approving holds the guitars as “Reserved”. Completing marks them “Sold”. Declining or cancelling returns them to the shop if nothing else holds them.</p>
              <button className="btn btn-primary">Save update</button>
            </form>
          </section>
        </div>

        <div className="stack">
          <section className="card stack">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Customer</h2>
            <dl className="kv">
              <dt>Name</dt><dd>{r.contact_name}</dd>
              <dt>Email</dt><dd>{r.contact_email ? <a href={`mailto:${r.contact_email}?subject=${encodeURIComponent(`Guitarz4U purchase request ${r.reference}`)}`}>{r.contact_email}</a> : "—"}</dd>
              <dt>Phone</dt><dd>{r.contact_phone || "—"}</dd>
              <dt>Prefers</dt><dd>{CONTACT_METHODS[r.preferred_contact]}</dd>
              <dt>Account</dt><dd>{r.user_id ? <Link href={`/admin/customers/${r.user_id}`}>View customer</Link> : "Guest"}</dd>
              <dt>Submitted</dt><dd>{formatDateTime(r.created_at)}</dd>
            </dl>
            {r.contact_phone && <a className="btn btn-whatsapp btn-sm" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp customer</a>}
          </section>

          <section className="card stack">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Private EFT tracking</h2>
            <p className="small muted" style={{ margin: 0 }}>This website does not process or verify payments. Bank details are shared by you, privately, outside the website.</p>
            <dl className="kv">
              <dt>EFT details sent</dt><dd>{r.eft_instructions_sent_at ? `${formatDateTime(r.eft_instructions_sent_at)} by ${r.eft_by ?? "admin"}` : "Not yet"}</dd>
              <dt>Payment received</dt><dd>{r.payment_confirmed_at ? <><span className="tag tag-good">Confirmed</span> {formatDateTime(r.payment_confirmed_at)} by {r.paid_by ?? "admin"}</> : <span className="tag tag-neutral">Not confirmed</span>}</dd>
            </dl>
            {!closed && !r.payment_confirmed_at && (
              <form action={recordEftInstructions} className="form card-flat">
                <input type="hidden" name="id" value={r.id} />
                <strong>1. Record that EFT details were sent</strong>
                <div className="field"><label htmlFor="method">Sent by</label>
                  <select id="method" name="method" defaultValue={r.preferred_contact}><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="phone">Phone</option><option value="in person">In person</option></select></div>
                <label className="check"><input type="checkbox" name="confirm" required /> I have sent my EFT details to this customer privately.</label>
                <button className="btn btn-outline btn-sm">Record EFT details as sent</button>
              </form>
            )}
            {!closed && !r.payment_confirmed_at && (
              <form action={confirmPayment} className="form card-flat" style={{ borderColor: "var(--good)" }}>
                <input type="hidden" name="id" value={r.id} />
                <strong>2. Mark EFT payment as received</strong>
                <div className="field"><label htmlFor="amount">Amount received (R, optional)</label><input id="amount" name="amount" type="text" inputMode="decimal" /></div>
                <label className="check"><input type="checkbox" name="verified" required /> I have personally checked my bank account and the funds have reflected.</label>
                <ConfirmButton className="btn btn-primary btn-sm" message="Confirm that you have checked your bank account and the EFT has reflected?">Mark payment as received</ConfirmButton>
              </form>
            )}
          </section>

          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Customer-visible history</h2>
            <Timeline events={history} labels={PURCHASE_STATUSES} />
            {r.customer_update && <p className="small muted">Latest message shown to the customer: “{r.customer_update}”</p>}
          </section>
          <p className="small muted">WhatsApp from: {s.whatsappNumber}</p>
        </div>
      </div>
    </div>
  );
}
