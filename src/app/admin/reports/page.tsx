import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatZAR } from '@/lib/format';
import { CF_ANALYTICS_TOKEN } from '@/lib/env';

export default async function ReportsAdmin({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff('reports');
  const days = Math.min(365, Math.max(7, Number((await searchParams).days) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const sinceDay = since.slice(0, 10);
  const supabase = await createClient();
  const c = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [pv, prodViews, enquiries, resTotal, resConverted, resExpired, offers, sellers, sellersAccepted, repairs, inv, payments, quotes] = await Promise.all([
    supabase.from('page_views').select('path, views').gte('day', sinceDay),
    supabase.from('product_views').select('product_id, views, products(brand, model, ref)').gte('day', sinceDay),
    c(supabase.from('enquiries').select('id', { count: 'exact', head: true }).gte('created_at', since)),
    c(supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('created_at', since)),
    c(supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('status', 'converted')),
    c(supabase.from('reservations').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('status', 'expired')),
    c(supabase.from('offers').select('id', { count: 'exact', head: true }).gte('created_at', since)),
    c(supabase.from('seller_enquiries').select('id', { count: 'exact', head: true }).gte('created_at', since)),
    c(supabase.from('seller_offers').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('status', 'accepted')),
    c(supabase.from('repairs').select('id', { count: 'exact', head: true }).gte('created_at', since)),
    supabase.from('products').select('status, price'),
    supabase.from('payments').select('entity_type, amount').eq('voided', false).gte('received_on', sinceDay),
    supabase.from('repair_quotes').select('total_amount').eq('status', 'approved').gte('decided_at', since),
  ]);
  const sumBy = <T,>(rows: T[], key: (r: T) => string, val: (r: T) => number) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + val(r));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const pages = sumBy(pv.data ?? [], (r) => r.path, (r) => r.views).slice(0, 15);
  const totalViews = (pv.data ?? []).reduce((s, r) => s + r.views, 0);
  const products = sumBy(prodViews.data ?? [], (r) => { const p = r.products as unknown as { brand: string; model: string; ref: string } | null; return p ? `${p.brand} ${p.model} (${p.ref})` : 'Removed'; }, (r) => r.views).slice(0, 10);
  const stock = sumBy(inv.data ?? [], (r) => r.status, () => 1);
  const availableValue = (inv.data ?? []).filter((p) => p.status === 'available').reduce((s, p) => s + Number(p.price), 0);
  const pay = payments.data ?? [];
  const salesRevenue = pay.filter((p) => p.entity_type !== 'repair').reduce((s, p) => s + Number(p.amount), 0);
  const repairRevenue = pay.filter((p) => p.entity_type === 'repair').reduce((s, p) => s + Number(p.amount), 0);
  const quoted = (quotes.data ?? []).reduce((s, q) => s + Number(q.total_amount), 0);
  const conv = resTotal ? Math.round((resConverted / resTotal) * 100) : 0;
  const Stat = ({ v, l }: { v: string | number; l: string }) => <div className="stat"><span className="value">{v}</span><span className="label">{l}</span></div>;
  return (
    <>
      <h1>Reports &amp; analytics</h1>
      <nav className="tabs">{[7, 30, 90, 365].map((d) => <a key={d} href={`/admin/reports?days=${d}`} aria-current={days === d ? 'page' : undefined}>Last {d} days</a>)}</nav>
      <h2 style={{ fontSize: '1.2rem' }}>Recorded money (from manual payment records)</h2>
      <div className="stat-grid">
        <Stat v={formatZAR(salesRevenue)} l="Guitar sales received" />
        <Stat v={formatZAR(repairRevenue)} l="Repair payments received" />
        <Stat v={formatZAR(quoted)} l="Repair quotes approved (not yet revenue)" />
      </div>
      <p className="small muted">Only payments you recorded as received count as revenue. Enquiries, reservations and quotes are never counted as sales.</p>
      <h2 style={{ fontSize: '1.2rem' }}>Activity</h2>
      <div className="stat-grid">
        <Stat v={enquiries} l="Purchase enquiries" />
        <Stat v={offers} l="Offers received" />
        <Stat v={resTotal} l="Reservations made" />
        <Stat v={`${conv}%`} l={`Reservations completed as sales (${resConverted}); ${resExpired} expired`} />
        <Stat v={sellers} l="Seller submissions" />
        <Stat v={sellersAccepted} l="Seller offers accepted" />
        <Stat v={repairs} l="Repair requests" />
      </div>
      <h2 style={{ fontSize: '1.2rem' }}>Inventory (now)</h2>
      <div className="stat-grid">
        {stock.map(([k, v]) => <Stat key={k} v={v} l={k} />)}
        <Stat v={formatZAR(availableValue)} l="Listed value of available stock" />
      </div>
      <h2 style={{ fontSize: '1.2rem' }}>Website visits</h2>
      {totalViews ? (
        <div className="grid-2">
          <div className="card"><h3>Popular pages ({totalViews} views)</h3><table className="data"><tbody>{pages.map(([p, v]) => <tr key={p}><td>{p}</td><td className="num">{v}</td></tr>)}</tbody></table></div>
          <div className="card"><h3>Most viewed guitars</h3>{products.length ? <table className="data"><tbody>{products.map(([p, v]) => <tr key={p}><td>{p}</td><td className="num">{v}</td></tr>)}</tbody></table> : <p className="muted">No product views yet.</p>}</div>
        </div>
      ) : (
        <div className="alert alert-info">No visit data yet. Visits are only counted for visitors who choose &quot;Allow analytics&quot; in the cookie banner, so these numbers will always be lower than your real traffic.</div>
      )}
      <p className="small muted">{CF_ANALYTICS_TOKEN ? 'Cloudflare Web Analytics is enabled — see your Cloudflare dashboard for more detail.' : 'Optional: add free Cloudflare Web Analytics for more detail (see the setup guide). Not configured.'}</p>
    </>
  );
}
