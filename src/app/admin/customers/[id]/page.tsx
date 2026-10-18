import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { formatDate, formatRand, PURCHASE_STATUSES, RESERVATION_STATUSES, SELLER_STATUSES, REPAIR_STATUSES, type PurchaseStatus } from "@/lib/format";
import { StatusBadge } from "@/components/ui";

export default async function AdminCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await queryOne<{ id: string; name: string; email: string; role: string; emailVerified: boolean; createdAt: Date; deletedAt: Date | null; phone: string | null; preferred_contact: string | null }>(
    `select u.id, u.name, u.email, u.role, u."emailVerified", u."createdAt", u."deletedAt", p.phone, p.preferred_contact from "user" u left join customer_profiles p on p.user_id=u.id where u.id=$1`,
    [id],
  );
  if (!u) notFound();
  const [requests, reservations, submissions, repairs] = await Promise.all([
    query<{ id: string; reference: string; status: PurchaseStatus; estimated_total_cents: number; created_at: Date }>("select id, reference, status, estimated_total_cents, created_at from purchase_requests where user_id=$1 order by created_at desc", [id]),
    query<{ reference: string; status: keyof typeof RESERVATION_STATUSES; title: string }>("select r.reference, r.status, p.title from reservations r join products p on p.id=r.product_id where r.user_id=$1 order by r.created_at desc", [id]),
    query<{ id: string; reference: string; status: keyof typeof SELLER_STATUSES; brand: string; model: string }>("select id, reference, status, brand, model from seller_submissions where user_id=$1 order by created_at desc", [id]),
    query<{ id: string; reference: string; status: keyof typeof REPAIR_STATUSES; guitar_brand: string }>("select id, reference, status, guitar_brand from repair_bookings where user_id=$1 order by created_at desc", [id]),
  ]);
  return (
    <div className="stack">
      <p className="small"><Link href="/admin/customers">← Customers</Link></p>
      <h1 style={{ fontSize: "1.8rem" }}>{u.name}</h1>
      <section className="card">
        <dl className="kv">
          <dt>Email</dt><dd>{u.email} {u.emailVerified ? <span className="tag tag-good">verified</span> : <span className="tag tag-neutral">not verified</span>}</dd>
          <dt>Phone</dt><dd>{u.phone || "—"}</dd>
          <dt>Prefers</dt><dd>{u.preferred_contact || "—"}</dd>
          <dt>Role</dt><dd>{u.role}</dd>
          <dt>Joined</dt><dd>{formatDate(u.createdAt)}</dd>
          {u.deletedAt && (<><dt>Deleted</dt><dd>{formatDate(u.deletedAt)} (anonymised)</dd></>)}
        </dl>
      </section>
      <div className="grid-2">
        <section className="card"><h2 style={{ fontSize: "1.1rem" }}>Purchase requests</h2>{requests.length ? <ul>{requests.map((r) => <li key={r.id}><Link href={`/admin/requests/${r.id}`}>{r.reference}</Link> {formatRand(r.estimated_total_cents)} <StatusBadge status={r.status} label={PURCHASE_STATUSES[r.status]} /></li>)}</ul> : <p className="muted">None</p>}</section>
        <section className="card"><h2 style={{ fontSize: "1.1rem" }}>Reservations</h2>{reservations.length ? <ul>{reservations.map((r) => <li key={r.reference}>{r.reference} {r.title} — {RESERVATION_STATUSES[r.status]}</li>)}</ul> : <p className="muted">None</p>}</section>
        <section className="card"><h2 style={{ fontSize: "1.1rem" }}>Seller submissions</h2>{submissions.length ? <ul>{submissions.map((r) => <li key={r.id}><Link href={`/admin/submissions/${r.id}`}>{r.reference}</Link> {r.brand} {r.model} — {SELLER_STATUSES[r.status]}</li>)}</ul> : <p className="muted">None</p>}</section>
        <section className="card"><h2 style={{ fontSize: "1.1rem" }}>Repairs</h2>{repairs.length ? <ul>{repairs.map((r) => <li key={r.id}><Link href={`/admin/repairs/${r.id}`}>{r.reference}</Link> {r.guitar_brand} — {REPAIR_STATUSES[r.status]}</li>)}</ul> : <p className="muted">None</p>}</section>
      </div>
    </div>
  );
}
