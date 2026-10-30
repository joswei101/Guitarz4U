import type { Metadata } from 'next';
import { SideNav } from '@/components/NavLinks';
import { isStaffProfile, requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser('/account');
  const supabase = await createClient();
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('audience', 'customer').is('read_at', null);
  const items = [
    { href: '/account', label: 'Overview' },
    { href: '/account/notifications', label: 'Notifications', badge: count ?? 0 },
    { href: '/account/reservations', label: 'Reservations' },
    { href: '/account/enquiries', label: 'Enquiries & offers' },
    { href: '/account/wishlist', label: 'Wishlist' },
    { href: '/account/selling', label: 'Selling' },
    { href: '/account/repairs', label: 'Repairs' },
    { href: '/account/alerts', label: 'Stock alerts' },
    { href: '/account/profile', label: 'Profile & settings' },
    { href: '/account/privacy', label: 'Privacy & data' },
    ...(isStaffProfile(profile) ? [{ href: '/admin', label: 'Admin dashboard →' }] : []),
  ];
  return (
    <div className="wrap dash-layout">
      <div>
        <SideNav items={items} label="Account" />
        <form action="/auth/signout" method="post" style={{ marginTop: 10 }}>
          <button type="submit" className="btn btn-outline btn-small btn-block">Sign out</button>
        </form>
      </div>
      <div>{children}</div>
    </div>
  );
}
