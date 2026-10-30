import Link from 'next/link';
import { getProfile, isStaffProfile } from '@/lib/auth';
import { readCart } from '@/lib/cart';
import { getSettings } from '@/lib/site';
import { CartIcon, UserIcon } from '@/components/icons';
import { DesktopNav, MobileNav } from '@/components/NavLinks';

export async function Header() {
  const [profile, cart, settings] = await Promise.all([getProfile(), readCart(), getSettings()]);
  const staff = isStaffProfile(profile);
  const extra = [
    { href: '/cart', label: `Enquiry cart (${cart.length})` },
    profile ? { href: '/account', label: 'My account' } : { href: '/auth/login', label: 'Sign in / register' },
    ...(staff ? [{ href: '/admin', label: 'Admin dashboard' }] : []),
  ];
  return (
    <header className="site-header">
      <a href="#main" className="skip-link">Skip to main content</a>
      {settings.shop_notice ? <div className="notice-bar">{settings.shop_notice}</div> : null}
      <div className="wrap header-row">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo-mark.svg" alt="" width={42} height={42} />
          <span>
            <span className="brand-word">Guitarz<span>4U</span></span>
            <span className="brand-tag">Pre-owned guitars · Repairs</span>
          </span>
        </Link>
        <DesktopNav />
        <div className="header-actions">
          {staff ? <Link href="/admin" className="icon-link"><span>Admin</span></Link> : null}
          <Link href="/cart" className="icon-link">
            <CartIcon /><span className="hide-sm">Cart</span><span className="count-pill">{cart.length}<span className="visually-hidden"> item{cart.length === 1 ? '' : 's'} in enquiry cart</span></span>
          </Link>
          <Link href={profile ? '/account' : '/auth/login'} className="icon-link">
            <UserIcon /><span className="hide-sm">{profile ? 'Account' : 'Sign in'}</span>
          </Link>
          <MobileNav extra={extra} />
        </div>
      </div>
    </header>
  );
}
