import Link from "next/link";
import { getSettings, whatsappLink } from "@/lib/settings";
import { LogoMark } from "./Logo";

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <LogoMark />
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--cream)" }}>Guitarz4U</strong>
          </div>
          <p><em>{s.tagline}</em></p>
          <p className="small">
            Second-hand guitars bought, sold and repaired in {s.locationLine}, South Africa.
            <br />
            {s.hoursNotice}
          </p>
          <p className="small">Payments are never taken on this website. Approved purchases are paid by private EFT arranged directly with the owner.</p>
        </div>
        <div>
          <h2>Shop</h2>
          <ul>
            <li><Link href="/shop?category=electric-guitars">Electric guitars</Link></li>
            <li><Link href="/shop?category=bass-guitars">Bass guitars</Link></li>
            <li><Link href="/shop?category=acoustic-guitars">Acoustic guitars</Link></li>
            <li><Link href="/shop?category=classical-guitars">Classical guitars</Link></li>
            <li><Link href="/shop?offers=1">Special offers</Link></li>
          </ul>
        </div>
        <div>
          <h2>Services</h2>
          <ul>
            <li><Link href="/sell">Sell your guitar</Link></li>
            <li><Link href="/repairs">Repairs &amp; setups</Link></li>
            <li><Link href="/how-it-works">Buying &amp; selling process</Link></li>
            <li><Link href="/track">Track a request</Link></li>
            <li><Link href="/reviews">Customer reviews</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h2>Contact</h2>
          <ul>
            <li><a href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, ")} target="_blank" rel="noopener noreferrer">WhatsApp {s.whatsappNumber}</a></li>
            <li><a href={`mailto:${s.email}`}>{s.email}</a></li>
            <li>{s.socialUrl ? <a href={s.socialUrl} target="_blank" rel="noopener noreferrer">@{s.socialHandle}</a> : <span>Social: @{s.socialHandle}</span>}</li>
            <li><Link href="/contact">Contact form</Link></li>
            <li><Link href="/about">About us</Link></li>
          </ul>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} Guitarz4U. All prices in South African rand (ZAR).</span>
        <span>
          <Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms</Link> · <Link href="/policies">Returns &amp; reservations</Link>
        </span>
      </div>
    </footer>
  );
}
