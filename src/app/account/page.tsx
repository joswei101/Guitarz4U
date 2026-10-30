import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export default async function AccountHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user, profile } = await requireUser('/account');
  const supabase = await createClient();
  const [res, rep, sell, enq, notes] = await Promise.all([
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    supabase.from('repairs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('status', 'in', '(collected,cancelled)'),
    supabase.from('seller_enquiries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('status', 'in', '(completed,cancelled,offer-declined)'),
    supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['new', 'contacted', 'agreed']),
    supabase.from('notifications').select('id, title, body, link, created_at, read_at').eq('user_id', user.id).eq('audience', 'customer').order('created_at', { ascending: false }).limit(5),
  ]);
  const { data: quotes } = await supabase.from('repair_quotes').select('id, repair_id').eq('status', 'sent');
  return (
    <div className="stack">
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Hello{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h1>
      {quotes?.length ? (
        <div className="alert alert-info" role="status"><strong>A repair quote is waiting for your decision.</strong> <Link href={`/account/repairs/${quotes[0].repair_id}`}>Review the quote</Link></div>
      ) : null}
      <div className="stat-grid">
        <Link className="stat" href="/account/reservations"><span className="value">{res.count ?? 0}</span><span className="label">Active reservations</span></Link>
        <Link className="stat" href="/account/enquiries"><span className="value">{enq.count ?? 0}</span><span className="label">Open purchase enquiries</span></Link>
        <Link className="stat" href="/account/repairs"><span className="value">{rep.count ?? 0}</span><span className="label">Repairs in progress</span></Link>
        <Link className="stat" href="/account/selling"><span className="value">{sell.count ?? 0}</span><span className="label">Guitars you&apos;ve offered us</span></Link>
      </div>
      <section className="card">
        <div className="row-between"><h2 style={{ fontSize: '1.2rem', margin: 0 }}>Latest updates</h2><Link href="/account/notifications">All notifications</Link></div>
        {notes.data?.length ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {notes.data.map((n) => (
              <li key={n.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
                <strong>{n.link ? <Link href={n.link}>{n.title}</Link> : n.title}</strong>{!n.read_at ? <span className="badge badge-warn" style={{ marginLeft: 8 }}>New</span> : null}
                <div className="small muted">{formatDateTime(n.created_at)}</div>
              </li>
            ))}
          </ul>
        ) : <p className="muted">No updates yet. When you reserve a guitar, send us a guitar or request a repair, updates will appear here.</p>}
      </section>
      <div className="row">
        <Link href="/shop" className="btn btn-primary">Browse guitars</Link>
        <Link href="/sell" className="btn btn-outline">Sell a guitar</Link>
        <Link href="/repairs" className="btn btn-outline">Request a repair</Link>
      </div>
    </div>
  );
}
