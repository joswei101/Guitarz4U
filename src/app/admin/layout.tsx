import type { Metadata } from 'next';
import { SideNav } from '@/components/NavLinks';
import { profileHasPerm, requireStaff } from '@/lib/auth';
import type { Permission } from '@/lib/labels';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  const supabase = await createClient();
  const can = (p: Permission) => profileHasPerm(profile, p);
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [newEnq, newOffers, newMsgs, sellers, repairs, reviews, notes] = await Promise.all([
    can('enquiries') ? count(supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new')) : 0,
    can('enquiries') ? count(supabase.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'new')) : 0,
    can('enquiries') ? count(supabase.from('messages').select('id', { count: 'exact', head: true }).eq('status', 'new')) : 0,
    can('sellers') ? count(supabase.from('seller_enquiries').select('id', { count: 'exact', head: true }).eq('status', 'received')) : 0,
    can('repairs') ? count(supabase.from('repairs').select('id', { count: 'exact', head: true }).eq('status', 'request-received')) : 0,
    can('reviews') ? count(supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending')) : 0,
    count(supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('audience', 'staff').is('read_at', null)),
  ]);
  const items = [
    { href: '/admin', label: 'Overview', group: 'Dashboard' },
    { href: '/admin/notifications', label: 'Notifications', badge: notes, group: 'Dashboard' },
    ...(can('inventory') ? [{ href: '/admin/products', label: 'Products', group: 'Shop' }] : []),
    ...(can('reservations') ? [{ href: '/admin/reservations', label: 'Reservations', group: 'Shop' }] : []),
    ...(can('enquiries') ? [
      { href: '/admin/enquiries', label: 'Purchase enquiries', badge: newEnq, group: 'Shop' },
      { href: '/admin/offers', label: 'Offers', badge: newOffers, group: 'Shop' },
      { href: '/admin/messages', label: 'Messages & questions', badge: newMsgs, group: 'Shop' },
    ] : []),
    ...(can('sellers') ? [{ href: '/admin/sellers', label: 'Seller enquiries', badge: sellers, group: 'Buying & repairs' }] : []),
    ...(can('repairs') ? [{ href: '/admin/repairs', label: 'Repairs', badge: repairs, group: 'Buying & repairs' }] : []),
    ...(can('payments') ? [{ href: '/admin/payments', label: 'Payments (manual)', group: 'Buying & repairs' }] : []),
    ...(can('customers') ? [{ href: '/admin/customers', label: 'Customers & staff', group: 'People' }] : []),
    ...(can('reviews') ? [{ href: '/admin/reviews', label: 'Reviews', badge: reviews, group: 'People' }] : []),
    ...(can('content') ? [{ href: '/admin/content', label: 'Website content', group: 'Website' }, { href: '/admin/faqs', label: 'FAQs', group: 'Website' }] : []),
    ...(can('reports') ? [{ href: '/admin/reports', label: 'Reports & analytics', group: 'Website' }] : []),
    ...(can('settings') ? [{ href: '/admin/settings', label: 'Settings', group: 'Website' }] : []),
    ...(can('audit') ? [{ href: '/admin/audit', label: 'Audit log', group: 'Website' }] : []),
    { href: '/admin/export', label: 'Export & backup', group: 'Website' },
  ];
  return (
    <div className="wrap dash-layout">
      <div><SideNav items={items} label="Admin" /></div>
      <div className="stack">{children}</div>
    </div>
  );
}
