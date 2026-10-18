import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { getHistory } from "@/lib/workflow";
import { formatDate, formatRand, PURCHASE_STATUSES, CONTACT_METHODS, type PurchaseStatus } from "@/lib/format";
import { StatusBadge, Timeline, EftNotice } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { cancelPurchaseRequest } from "../../actions";

export default async function MyRequest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  // Customer-safe columns only: admin notes are never selected here.
  const r = await queryOne<{ id: string; reference: string; status: PurchaseStatus; estimated_total_cents: number; agreed_total_cents: number | null; message: string; customer_update: string; preferred_contact: keyof typeof CONTACT_METHODS; created_at: Date }>(
    "select id, reference, status, estimated_total_cents, agreed_total_cents, message, customer_update, preferred_contact, created_at from purchase_requests where id=$1 and user_id=$2",
    [id, user.id],
  );
  if (!r) notFound();
  const [items, history] = await Promise.all([
    query<{ title_snapshot: string; price_cents_snapshot: number; slug: string | null }>(
      "select i.title_snapshot, i.price_cents_snapshot, p.slug from purchase_request_items i left join products p on p.id=i.product_id where i.purchase_request_id=$1",
      [id],
    ),
    getHistory("purchase_request", id),
  ]);
  const cancellable = ["submitted", "under_review", "awaiting_customer", "approved", "awaiting_eft"].includes(r.status);
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <p className="small"><Link href="/account/requests">← All purchase requests</Link></p>
      <div className="row between">
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Request {r.reference}</h1>
        <StatusBadge status={r.status} label={PURCHASE_STATUSES[r.status]} />
      </div>
      {r.customer_update && <div className="notice"><strong>Message from Guitarz4U</strong><p className="pre-line">{r.customer_update}</p></div>}
      {r.status === "awaiting_eft" && (
        <div className="notice notice-info"><strong>Payment arranged privately</strong><p>Guitarz4U has sent you EFT details privately (by {CONTACT_METHODS[r.preferred_contact]}). EFT details are never shown on this website. Your payment is only confirmed once Guitarz4U has checked that it reflected.</p></div>
      )}
      <div className="detail-grid">
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Guitars requested</h2>
          <ul>
            {items.map((i, n) => (
              <li key={n}>{i.slug ? <Link href={`/shop/${i.slug}`}>{i.title_snapshot}</Link> : i.title_snapshot} — {formatRand(i.price_cents_snapshot)}</li>
            ))}
          </ul>
          <p><strong>Estimated total:</strong> {formatRand(r.estimated_total_cents)}{r.agreed_total_cents !== null && <> · <strong>Agreed price:</strong> {formatRand(r.agreed_total_cents)}</>}</p>
          <p className="small muted">Submitted {formatDate(r.created_at)} · Preferred contact: {CONTACT_METHODS[r.preferred_contact]}</p>
          {r.message && <><h3>Your message</h3><p className="pre-line">{r.message}</p></>}
          {cancellable && (
            <form action={cancelPurchaseRequest} style={{ marginTop: 16 }}>
              <input type="hidden" name="id" value={r.id} />
              <button className="btn btn-outline btn-sm">Cancel this request</button>
            </form>
          )}
        </section>
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Status history</h2>
          <Timeline events={history} labels={PURCHASE_STATUSES} />
        </section>
      </div>
      <EftNotice />
    </div>
  );
}
