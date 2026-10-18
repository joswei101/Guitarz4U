import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { features, env } from "@/lib/env";
import { formatDateTime, formatRand } from "@/lib/format";

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page views", product_view: "Product views", purchase_request: "Purchase requests",
  reservation_request: "Reservation requests", seller_submission: "Seller submissions", repair_booking: "Repair bookings", whatsapp_click: "WhatsApp clicks",
};

export default async function AdminOverview() {
  const [stock, money, events, topProducts, recent, demo] = await Promise.all([
    query<{ status: string; n: number }>("select status, count(*)::int n from products group by status"),
    queryOne<{ open_value: number; sold_30: number; sold_value_30: number }>(
      `select
        coalesce((select sum(price_cents) from products where status in ('published','reserved')),0)::bigint::float8 as open_value,
        (select count(*) from products where status='sold' and sold_at > now() - interval '30 days')::int as sold_30,
        coalesce((select sum(coalesce(agreed_total_cents, estimated_total_cents)) from purchase_requests where status='completed' and completed_at > now() - interval '30 days'),0)::bigint::float8 as sold_value_30`,
    ),
    query<{ event: string; n: number }>("select event, count(*)::int n from analytics_events where created_at > now() - interval '30 days' group by event"),
    query<{ title: string; n: number }>(
      `select p.title, count(*)::int n from analytics_events e join products p on p.id=e.product_id
       where e.event='product_view' and e.created_at > now() - interval '30 days' group by p.title order by n desc limit 5`,
    ),
    query<{ title: string; body: string; link: string; created_at: Date }>("select title, body, link, created_at from notifications where audience='admin' order by created_at desc limit 8"),
    queryOne<{ n: number }>("select count(*)::int n from products where is_demo"),
  ]);
  const s = Object.fromEntries(stock.map((r) => [r.status, r.n]));
  const ev = Object.fromEntries(events.map((r) => [r.event, r.n]));
  const maxEv = Math.max(1, ...events.map((e) => e.n));
  return (
    <div className="stack">
      <h1 style={{ fontSize: "2rem" }}>Overview</h1>
      {(demo?.n ?? 0) > 0 && (
        <div className="notice notice-warn"><strong>Demonstration products are live</strong><p>{demo!.n} demo listing(s) are in the shop. Remove them before launch with <code>npm run db:remove-demo</code> (see docs/SETUP.md).</p></div>
      )}
      <div className="stat-grid">
        <Link className="stat" href="/admin/products?status=published"><div className="n">{s.published ?? 0}</div><div className="l">Available</div></Link>
        <Link className="stat" href="/admin/products?status=reserved"><div className="n">{s.reserved ?? 0}</div><div className="l">Reserved</div></Link>
        <Link className="stat" href="/admin/products?status=draft"><div className="n">{s.draft ?? 0}</div><div className="l">Drafts</div></Link>
        <Link className="stat" href="/admin/products?status=sold"><div className="n">{s.sold ?? 0}</div><div className="l">Sold (archive)</div></Link>
        <div className="stat"><div className="n">{formatRand(money?.open_value ?? 0)}</div><div className="l">Value of stock on sale</div></div>
        <div className="stat"><div className="n">{money?.sold_30 ?? 0}</div><div className="l">Sold in last 30 days ({formatRand(money?.sold_value_30 ?? 0)} completed)</div></div>
      </div>
      <div className="detail-grid">
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>Activity — last 30 days</h2>
          <p className="small muted">First-party, cookie-free counts. No personal data is recorded.</p>
          <table className="table">
            <tbody>
              {Object.entries(EVENT_LABELS).map(([k, label]) => (
                <tr key={k}>
                  <td style={{ width: "40%" }}>{label}</td>
                  <td><div className="bar" style={{ width: `${((ev[k] ?? 0) / maxEv) * 100}%` }} /></td>
                  <td className="num">{ev[k] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topProducts.length > 0 && (<><h3 style={{ marginTop: 16 }}>Most viewed guitars</h3><ol>{topProducts.map((p) => <li key={p.title}>{p.title} ({p.n})</li>)}</ol></>)}
        </section>
        <section className="card">
          <div className="row between"><h2 style={{ fontSize: "1.2rem", margin: 0 }}>Latest notifications</h2><Link href="/admin/notifications" className="small">All</Link></div>
          {recent.length === 0 ? <p className="muted">Nothing yet.</p> : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {recent.map((n, i) => (
                <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <Link href={n.link || "/admin"}><strong>{n.title}</strong></Link>
                  <div className="small muted">{formatDateTime(n.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="card">
        <h2 style={{ fontSize: "1.2rem" }}>System status</h2>
        <dl className="kv">
          <dt>Online payments</dt><dd><span className="tag tag-good">None — by design</span> Payments are arranged privately by EFT.</dd>
          <dt>Email delivery</dt><dd>{features.email ? <span className="tag tag-good">Configured (SMTP)</span> : <span className="tag tag-warn">Not configured</span>} {features.email ? "" : "In-app notifications work; emails and password-reset emails are not sent."}</dd>
          <dt>Google sign-in</dt><dd>{features.google ? <span className="tag tag-good">Configured</span> : <span className="tag tag-neutral">Off</span>}</dd>
          <dt>Image storage</dt><dd>{env.storageDriver === "s3" ? <span className="tag tag-good">Cloud storage (S3-compatible)</span> : <span className="tag tag-warn">Local disk — development only</span>}</dd>
          <dt>Site address</dt><dd>{env.siteUrl}</dd>
        </dl>
      </section>
    </div>
  );
}
