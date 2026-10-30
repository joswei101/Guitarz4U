import Link from 'next/link';
import { getSettings } from '@/lib/site';
import { waLink } from '@/lib/whatsapp';
import { CookiePreferencesLink } from '@/components/CookieConsent';

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--parchment)', margin: 0 }}>
              Guitarz<span style={{ color: 'var(--amber-light)' }}>4U</span>
            </p>
            <p>Second-hand guitars and guitar repairs in {s.collection_area}. Collection only — no deliveries.</p>
            <p className="small" style={{ color: 'var(--brass)' }}>
              We never take payment on this website. Payment is arranged directly with the owner.
            </p>
          </div>
          <div>
            <h2>Shop</h2>
            <ul className="footer-list">
              <li><Link href="/shop">All guitars</Link></li>
              <li><Link href="/shop?category=electric">Electric</Link></li>
              <li><Link href="/shop?category=bass">Bass</Link></li>
              <li><Link href="/shop?category=acoustic">Acoustic</Link></li>
              <li><Link href="/shop?category=classical">Classical</Link></li>
              <li><Link href="/shop?category=electro-acoustic">Electro-acoustic</Link></li>
              <li><Link href="/sold">Sold guitar archive</Link></li>
            </ul>
          </div>
          <div>
            <h2>Services</h2>
            <ul className="footer-list">
              <li><Link href="/sell">Sell or give away a guitar</Link></li>
              <li><Link href="/repairs">Guitar repairs</Link></li>
              <li><Link href="/how-it-works">How it works</Link></li>
              <li><Link href="/reviews">Customer reviews</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/about">About us</Link></li>
            </ul>
          </div>
          <div>
            <h2>Contact</h2>
            <ul className="footer-list">
              <li><a href={waLink(s.whatsapp_international)} target="_blank" rel="noopener noreferrer">WhatsApp: {s.whatsapp_display}</a></li>
              <li><a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>
              <li>Social: @{s.social_handle}</li>
              <li>{s.collection_area}</li>
              <li><Link href="/contact">Contact form</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {s.business_name}. All rights reserved.</span>
          <span className="row" style={{ gap: 14 }}>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/collection-reservation">Collection &amp; reservations</Link>
            <Link href="/legal/returns">Returns</Link>
            <Link href="/legal">All policies</Link>
            <CookiePreferencesLink />
          </span>
        </div>
      </div>
    </footer>
  );
}
