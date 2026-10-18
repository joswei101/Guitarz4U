import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getHistory } from "@/lib/workflow";
import { whatsappLink } from "@/lib/settings";
import { formatDateTime, formatRand, SELLER_STATUSES, WORKS_OPTIONS, conditionLabel } from "@/lib/format";
import { StatusBadge, Timeline } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { updateSubmission, makeOffer, withdrawOffer } from "../../actions";

export default async function AdminSubmission({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await queryOne<{ id: string; reference: string; status: keyof typeof SELLER_STATUSES; user_id: string | null; seller_name: string; contact_phone: string; email: string; brand: string; model: string; category: string; condition: string; works: keyof typeof WORKS_OPTIONS; faults: string; asking_price_cents: number | null; notes: string; admin_notes: string; customer_update: string; created_at: Date }>(
    "select s.*, c.name category from seller_submissions s join categories c on c.id=s.category_id where s.id=$1",
    [id],
  );
  if (!s) notFound();
  const [images, offers, history] = await Promise.all([
    query<{ id: string }>("select id from seller_submission_images where submission_id=$1 order by created_at", [id]),
    query<{ id: string; amount_cents: number; message: string; status: string; created_at: Date; responded_at: Date | null }>("select id, amount_cents, message, status, created_at, responded_at from seller_offers where submission_id=$1 order by created_at desc", [id]),
    getHistory("seller_submission", id),
  ]);
  const pending = offers.find((o) => o.status === "pending");
  const closed = ["purchased", "rejected", "withdrawn"].includes(s.status);
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <p className="small"><Link href="/admin/submissions">← Seller submissions</Link></p>
      <div className="row between">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{s.brand} {s.model} <span className="small muted">{s.reference}</span></h1>
        <StatusBadge status={s.status} label={SELLER_STATUSES[s.status]} />
      </div>
      <div className="detail-grid">
        <div className="stack">
          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Guitar details</h2>
            <dl className="kv">
              <dt>Category</dt><dd>{s.category}</dd>
              <dt>Condition</dt><dd>{conditionLabel(s.condition)}</dd>
              <dt>Works?</dt><dd>{WORKS_OPTIONS[s.works]}</dd>
              <dt>Asking price</dt><dd>{s.asking_price_cents !== null ? formatRand(s.asking_price_cents) : "Wants an offer"}</dd>
              <dt>Faults</dt><dd className="pre-line">{s.faults || "—"}</dd>
              <dt>Notes</dt><dd className="pre-line">{s.notes || "—"}</dd>
            </dl>
            <h3 style={{ marginTop: 16 }}>Photos ({images.length}) — private</h3>
            <div className="thumb-row">
              {images.map((img) => (
                <a key={img.id} href={`/api/private-image/seller/${img.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/private-image/seller/${img.id}`} alt={`Seller photo of ${s.brand} ${s.model}`} loading="lazy" />
                </a>
              ))}
            </div>
          </section>
          <section className="card">
            <h2 style={{ fontSize: "1.2rem" }}>Review &amp; respond</h2>
            <form action={updateSubmission} className="form">
              <input type="hidden" name="id" value={s.id} />
              <div className="field"><label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={s.status}>{Object.entries(SELLER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="field"><label htmlFor="customerUpdate">Message to seller (visible to them)</label>
                <textarea id="customerUpdate" name="customerUpdate" rows={3} maxLength={2000} placeholder="e.g. Could you send a photo of the back of the neck?" /></div>
              <div className="private-box"><h3>Private admin notes</h3>
                <label className="sr-only" htmlFor="adminNotes">Private admin notes</label>
                <textarea id="adminNotes" name="adminNotes" className="input" rows={3} defaultValue={s.admin_notes} style={{ width: "100%" }} /></div>
              <button className="btn btn-primary">Save</button>
            </form>
          </section>
        </div>
        <div className="stack">
          <section className="card stack">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Seller</h2>
            <dl className="kv">
              <dt>Name</dt><dd>{s.seller_name}</dd>
              <dt>Phone</dt><dd>{s.contact_phone}</dd>
              <dt>Email</dt><dd>{s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : "—"}</dd>
              <dt>Account</dt><dd>{s.user_id ? <Link href={`/admin/customers/${s.user_id}`}>View customer</Link> : "Guest (offer replies via WhatsApp)"}</dd>
              <dt>Received</dt><dd>{formatDateTime(s.created_at)}</dd>
            </dl>
            <a className="btn btn-whatsapp btn-sm" href={whatsappLink(s.contact_phone, `Hi ${s.seller_name.split(" ")[0]}, this is Guitarz4U about the ${s.brand} ${s.model} you submitted (${s.reference}). `)} target="_blank" rel="noopener noreferrer">WhatsApp seller</a>
          </section>
          <section className="card stack">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Offers</h2>
            {pending && (
              <div className="notice notice-info"><strong>Pending offer: {formatRand(pending.amount_cents)}</strong><p>Waiting for the seller to respond.</p>
                <form action={withdrawOffer}><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost btn-sm">Withdraw offer</button></form></div>
            )}
            {!closed && (
              <form action={makeOffer} className="form card-flat">
                <input type="hidden" name="id" value={s.id} />
                <strong>{pending ? "Replace with a new offer" : "Make a personal offer"}</strong>
                <div className="field"><label htmlFor="amount">Offer amount (R)</label><input id="amount" name="amount" type="text" inputMode="decimal" required /></div>
                <div className="field"><label htmlFor="message">Message (optional)</label><textarea id="message" name="message" rows={3} maxLength={2000} placeholder="e.g. Subject to inspection; includes the case." /></div>
                <button className="btn btn-primary btn-sm">Send offer</button>
              </form>
            )}
            {offers.length > 0 && (
              <ul>{offers.map((o) => <li key={o.id}>{formatRand(o.amount_cents)} — {o.status} ({formatDateTime(o.created_at)}{o.responded_at ? `, responded ${formatDateTime(o.responded_at)}` : ""})</li>)}</ul>
            )}
          </section>
          <section className="card"><h2 style={{ fontSize: "1.2rem" }}>Seller-visible history</h2><Timeline events={history} labels={SELLER_STATUSES} /></section>
        </div>
      </div>
    </div>
  );
}
