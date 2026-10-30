'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CF_ANALYTICS_TOKEN } from '@/lib/env';

/**
 * Cookie notice with a real choice. Essential cookies (login, cart, this
 * choice) are always on. Optional analytics run only after "Allow analytics".
 * Both buttons are equally prominent — no misleading design.
 */
const COOKIE = 'g4u_consent';
type Choice = 'all' | 'essential' | null;

function readChoice(): Choice {
  const m = document.cookie.match(/(?:^|; )g4u_consent=(all|essential)/);
  return (m?.[1] as Choice) ?? null;
}
function saveChoice(c: Exclude<Choice, null>) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${c}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent('g4u-consent', { detail: c }));
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(readChoice() === null);
    const reopen = () => setOpen(true);
    window.addEventListener('g4u-open-consent', reopen);
    return () => window.removeEventListener('g4u-open-consent', reopen);
  }, []);
  if (!open) return null;
  const choose = (c: 'all' | 'essential') => { saveChoice(c); setOpen(false); };
  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <h2 id="cookie-title">Cookies on Guitarz4U</h2>
      <p id="cookie-text" className="small">
        We use essential cookies to keep you signed in and remember your enquiry cart. With your permission we also count
        anonymous page visits to improve the site. No advertising cookies. <Link href="/legal/cookies">Read the cookie notice</Link>.
      </p>
      <div className="row">
        <button type="button" className="btn btn-primary btn-small" onClick={() => choose('all')}>Allow analytics</button>
        <button type="button" className="btn btn-outline-light btn-small" onClick={() => choose('essential')}>Essential only</button>
      </div>
    </div>
  );
}

export function CookiePreferencesLink() {
  return (
    <button type="button" className="link-button" style={{ color: 'inherit', textDecoration: 'none' }}
      onClick={() => window.dispatchEvent(new Event('g4u-open-consent'))}>
      Cookie preferences
    </button>
  );
}

/** Counts a page view (path only, no personal data) when analytics are allowed. */
export function Analytics() {
  const path = usePathname();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    setAllowed(readChoice() === 'all');
    const on = (e: Event) => setAllowed((e as CustomEvent).detail === 'all');
    window.addEventListener('g4u-consent', on);
    return () => window.removeEventListener('g4u-consent', on);
  }, []);
  useEffect(() => {
    if (!allowed || path.startsWith('/admin') || path.startsWith('/account') || path.startsWith('/auth')) return;
    const body = JSON.stringify({ path });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  }, [allowed, path]);
  useEffect(() => {
    if (!allowed || !CF_ANALYTICS_TOKEN || document.getElementById('cf-beacon')) return;
    const s = document.createElement('script');
    s.id = 'cf-beacon';
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_ANALYTICS_TOKEN }));
    document.body.appendChild(s);
  }, [allowed]);
  return null;
}
