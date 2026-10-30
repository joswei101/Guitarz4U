'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/sell', label: 'Sell / give away' },
  { href: '/repairs', label: 'Repairs' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(href + '/');
}

export function DesktopNav() {
  const path = usePathname();
  return (
    <nav className="main-nav" aria-label="Main">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={isCurrent(path, n.href) ? 'page' : undefined}>{n.label}</Link>
      ))}
    </nav>
  );
}

/** Mobile menu built on <details>, so it also works without JavaScript. */
export function MobileNav({ extra }: { extra: { href: string; label: string }[] }) {
  const path = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (ref.current) ref.current.open = false; }, [path]);
  return (
    <details className="nav-menu" ref={ref}>
      <summary aria-label="Menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        <span className="menu-text">Menu</span>
      </summary>
      <nav className="nav-panel" aria-label="Mobile">
        <Link href="/">Home</Link>
        {[...NAV, ...extra].map((n) => (
          <Link key={n.href} href={n.href} aria-current={isCurrent(path, n.href) ? 'page' : undefined}>{n.label}</Link>
        ))}
      </nav>
    </details>
  );
}

export function SideNav({ items, label }: { items: { href: string; label: string; badge?: number; group?: string }[]; label: string }) {
  const path = usePathname();
  let lastGroup: string | undefined;
  return (
    <nav className="dash-nav" aria-label={label}>
      {items.map((i) => {
        const showGroup = i.group && i.group !== lastGroup;
        lastGroup = i.group;
        const exact = i.href === '/admin' || i.href === '/account';
        const current = exact ? path === i.href : isCurrent(path, i.href);
        return (
          <span key={i.href} style={{ display: 'contents' }}>
            {showGroup ? <div className="group">{i.group}</div> : null}
            <Link href={i.href} aria-current={current ? 'page' : undefined}>
              <span>{i.label}</span>
              {i.badge ? <span className="count-pill">{i.badge}</span> : null}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
