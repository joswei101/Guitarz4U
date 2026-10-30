import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { profileHasPerm, requireStaff } from '@/lib/auth';
import { expireReservations } from '@/lib/products';
import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/site';
import { formatDateTime } from '@/lib/format';

export default async function AdminHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await expireReservations();
  const sp = await searchParams;
  const { profile } = await requireStaff();
  const supabase = await createClient();
  const settings = await getSettings();
  const c = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const soon = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
  const [available, reserved, drafts, sold, expiring, newEnq, newOffers, newMsgs, newSellers, inspect, newRepairs, awaitingQuote, inWorkshop, ready, pendingReviews, failedEmails, legalDrafts] = await Promise.all([
    c(supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'available')),
    c(supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'reserved')),
    c(supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft')),
    c(supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'sold')),
    c(supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('expires_at', soon)),
    c(supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new')),
    c(supabase.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'new')),
    c(supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'new')),
    c(supabase.from('seller_enquiries').select('id', { count: 'exact', head: true }).eq('status', 'received')),
    c(supabase.from('seller_enquiries').select('id', { count: 'exact', head: true }).eq('status', 'awaiting-inspection')),
    c(supabase.from('repairs').select('id', { count: 'exact', head: true }).eq('status', 'request-received')),
    c(supabase.from('repairs').select('id', { count: 'exact', head: true }).eq('status', 'awaiting-quote-approval')),
    c(supabase.from('repairs').select('id', { count: 'exact', head: true }).in('status', ['approved', 'repair-in-progress', 'awaiting-parts'])),
    c(supabase.from('repairs').select('id', { count: 'exact', head: true }).in('status', ['repair-completed', 'ready-for-collection'])),
    c(supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
    c(supabase.from('email_outbox').select('id', { count: 'exact', head: true }).eq('status', 'failed')),
    c(supabase.from('site_content').select('key', { count: 'exact', head: true }).eq('is_legal', true).eq('is_draft', true)),
  ]);
  const { data: notes } = await supabase.from('notifications').select('id, title, link, created_at, read_at')
    .eq('audience', 'staff').order('created_at', { ascending: false }).limit(8);
  const stat = (href: string, value: number, text: string, alert = false) => (
    <Link className="stat" href={href} style={alert && value ? { borderColor: 'var(--amber)', background: 'var(--warn-bg)' } : undefined}>
      <span className="value">{value}</span><span className="label">{text}</span>
    </Link>
  );
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Dashboard</h1>
      <p className="muted">Signed in as {profile.email} ({profile.role}).</p>
      {(legalDrafts > 0 || settings.repair_warranty_days === null || !settings.legal_reviewed) && profileHasPerm(profile, 'settings') ? (
        <div className="alert alert-info">
          <strong>Before launch:</strong>
          {legalDrafts > 0 ? <> {legalDrafts} legal document(s) are still marked as drafts — <Link href="/admin/content">review them</Link>.</> : null}
          {settings.repair_warranty_days === null ? <> The repair warranty period is not set — <Link href="/admin/settings">set it in Settings</Link>.</> : null}
          {!settings.legal_reviewed ? <> Confirm legal review in <Link href="/admin/settings">Settings</Link> once a professional has checked your policies.</> : null}
        </div>
      ) : null}
      <h2 style={{ fontSize: '1.2rem' }}>Needs attention</h2>
      <div className="stat-grid">
        {stat('/admin/enquiries', newEnq, 'New purchase enquiries', true)}
        {stat('/admin/offers', newOffers, 'New offers', true)}
        {stat('/admin/messages', newMsgs, 'New messages', true)}
        {stat('/admin/reservations', expiring, 'Reservations ending within 12 h', true)}
        {stat('/admin/sellers', newSellers, 'New seller enquiries', true)}
        {stat('/admin/sellers?status=awaiting-inspection', inspect, 'Awaiting inspection', true)}
        {stat('/admin/repairs', newRepairs, 'New repair requests', true)}
        {stat('/admin/reviews', pendingReviews, 'Reviews to moderate', true)}
        {stat('/admin/notifications', failedEmails, 'Failed emails', true)}
      </div>
      <h2 style={{ fontSize: '1.2rem' }}>Inventory &amp; workshop</h2>
      <div className="stat-grid">
        {stat('/admin/products?status=available', available, 'Available')}
        {stat('/admin/products?status=reserved', reserved, 'Reserved')}
        {stat('/admin/products?status=draft', drafts, 'Drafts (hidden)')}
        {stat('/admin/products?status=sold', sold, 'Sold')}
        {stat('/admin/repairs?status=awaiting-quote-approval', awaitingQuote, 'Quotes awaiting customer')}
        {stat('/admin/repairs', inWorkshop, 'Repairs in the workshop')}
        {stat('/admin/repairs', ready, 'Completed / ready to collect')}
      </div>
      <section className="card">
        <div className="row-between"><h2 style={{ fontSize: '1.2rem', margin: 0 }}>Recent activity</h2><Link href="/admin/notifications">All notifications</Link></div>
        {notes?.length ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>{notes.map((n) => (
            <li key={n.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
              {n.link ? <Link href={n.link}>{n.title}</Link> : n.title} {!n.read_at ? <span className="badge badge-warn">New</span> : null}
              <div className="small muted">{formatDateTime(n.created_at)}</div>
            </li>
          ))}</ul>
        ) : <p className="muted">No activity yet.</p>}
      </section>
      <div className="row">
        {profileHasPerm(profile, 'inventory') ? <Link href="/admin/products/new" className="btn btn-primary">+ Add a guitar</Link> : null}
        <Link href="/" className="btn btn-outline">View website</Link>
      </div>
    </>
  );
}
