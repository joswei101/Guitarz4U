import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, whatsappLink } from "@/lib/settings";
import { PageHead } from "@/components/ui";
import { IconShield, IconHandshake, IconWrench } from "@/components/icons";

export const metadata: Metadata = {
  title: "About Guitarz4U",
  description: "Guitarz4U is an owner-run second-hand guitar business in Sandringham, Johannesburg, buying, selling and repairing guitars with honest descriptions and personal service.",
  alternates: { canonical: "/about" },
};
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <PageHead title="About Guitarz4U" eyebrow={s.tagline} crumbs={[{ label: "About" }]} />
      <div className="wrap section">
        <div className="detail-grid">
          <div className="prose">
            {s.aboutText.split(/\n\n+/).map((p, i) => <p key={i} className={i === 0 ? "lead" : ""}>{p}</p>)}
            <h2>What you can expect</h2>
            <ul>
              <li><strong>Honest listings.</strong> Every guitar is listed with its condition and any known defects.</li>
              <li><strong>No online payments.</strong> You never pay through this website. Approved purchases are paid by EFT, arranged privately with the owner.</li>
              <li><strong>Personal contact.</strong> Requests are answered personally on WhatsApp or email.</li>
              <li><strong>Privacy.</strong> We collect only what we need to help you and never publish your details.</li>
            </ul>
            <h2>Where we are</h2>
            <p>
              We are based in {s.locationLine}. For privacy and security, the exact collection address is shared privately only once a purchase or repair has been approved and the arrangements confirmed. {s.hoursNotice}
            </p>
          </div>
          <aside className="stack">
            <div className="card feature"><div className="feature-icon"><IconShield /></div><h3>Defects disclosed</h3><p className="muted">Second-hand means signs of use — we tell you about them up front.</p></div>
            <div className="card feature"><div className="feature-icon"><IconHandshake /></div><h3>We buy guitars</h3><p className="muted">Working, broken or incomplete. <Link href="/sell">Tell us about yours</Link>.</p></div>
            <div className="card feature"><div className="feature-icon"><IconWrench /></div><h3>Repairs &amp; setups</h3><p className="muted">Quotes before any work. <Link href="/repairs">Book a repair</Link>.</p></div>
            <a className="btn btn-whatsapp" href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, ")} target="_blank" rel="noopener noreferrer" data-track="whatsapp_click">WhatsApp {s.whatsappNumber}</a>
          </aside>
        </div>
      </div>
    </>
  );
}
