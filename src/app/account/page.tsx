import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { features } from "@/lib/env";
import { formatDate, formatRand, PURCHASE_STATUSES, type PurchaseStatus } from "@/lib/format";
import { StatusBadge, Empty } from "@/components/ui";
import { Flash } from "@/components/Flash";

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const [counts, recent, reviews] = await Promise.all([
    query<{ k: string; n: number }>(
      `select 'requests' k, count(*)::int n from purchase_requests where user_id=$1 and status not in ('completed','declined','cancelled')
       union all select 'reservations', count(*)::int from reservations where user_id=$1 and status in ('requested','approved')
       union all select 'submissions', count(*)::int from seller_submissions where user_id=$1 and status not in ('purchased','rejected','withdrawn')
       union all select 'repairs', count(*)::int from repair_bookings where user_id=$1 and status not in ('completed','cancelled')
       union all select 'wishlist', count(*)::int from wishlists where user_id=$1`,
      [user.id],
    ),
    query<{ id: string; reference: string; status: PurchaseStatus; estimated_total_cents: number; created_at: Date }>(
      "select id, reference, status, estimated_total_cents, created_at from purchase_requests where user_id=$1 order by created_at desc limit 5",
      [user.id],
    ),
    query<{ id: string; rating: number; status: string; created_at: Date }>("select id, rating, status, created_at from reviews where user_id=$1 order by created_at desc limit 5", [user.id]),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.k, x.n]));
  return (
    <div className="stack">
      <Flash msg={sp.denied ? "denied" : undefined} />
      <h1 style={{ fontSize: "2rem" }}>My account</h1>
      {!user.emailVerified && features.email && (
        <div className="notice notice-warn"><strong>Please confirm your email address</strong><p>Requests you made before registering are linked to your account once your email address is confirmed.</p></div>
      )}
      <div className="stat-grid">
        <Link className="stat" href="/account/requests"><div className="n">{c.requests ?? 0}</div><div className="l">Open purchase requests</div></Link>
        <Link className="stat" href="/account/reservations"><div className="n">{c.reservations ?? 0}</div><div className="l">Active reservations</div></Link>
        <Link className="stat" href="/account/submissions"><div className="n">{c.submissions ?? 0}</div><div className="l">Guitars I&apos;m selling</div></Link>
        <Link className="stat" href="/account/repairs"><div className="n">{c.repairs ?? 0}</div><div className="l">Open repairs</div></Link>
        <Link className="stat" href="/account/wishlist"><div className="n">{c.wishlist ?? 0}</div><div className="l">Wishlist</div></Link>
      </div>
      <section className="card">
        <h2 style={{ fontSize: "1.3rem" }}>Recent purchase requests</h2>
        {recent.length === 0 ? (
          <Empty title="No purchase requests yet"><Link className="btn btn-primary btn-sm" href="/shop">Browse guitars</Link></Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Reference</th><th>Date</th><th>Status</th><th className="num">Estimated total</th></tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/account/requests/${r.id}`}>{r.reference}</Link></td>
                    <td>{formatDate(r.created_at)}</td>
                    <td><StatusBadge status={r.status} label={PURCHASE_STATUSES[r.status]} /></td>
                    <td className="num">{formatRand(r.estimated_total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card">
        <h2 style={{ fontSize: "1.3rem" }}>Your reviews</h2>
        {reviews.length === 0 ? <p className="muted">You have not written a review yet. <Link href="/reviews">Write one</Link>.</p> : (
          <ul>{reviews.map((r) => <li key={r.id}>{r.rating}★ review from {formatDate(r.created_at)} — <StatusBadge status={r.status === "approved" ? "approved" : r.status === "pending" ? "pending" : "rejected"} label={r.status === "pending" ? "Awaiting approval" : r.status === "approved" ? "Published" : "Not published"} /></li>)}</ul>
        )}
      </section>
    </div>
  );
}
