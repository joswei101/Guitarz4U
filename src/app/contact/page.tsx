import type { Metadata } from "next";
import { getSettings, whatsappLink } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { PageHead } from "@/components/ui";
import { IconMail, IconPin, IconWhatsApp, IconClock } from "@/components/icons";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Guitarz4U",
  description: "Contact Guitarz4U in Sandringham, Johannesburg on WhatsApp (064 856 7019) or email about second-hand guitars, selling your guitar or repairs.",
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <>
      <PageHead title="Contact us" eyebrow="Get in touch" intro="WhatsApp is the quickest way to reach us. You can also email us or use the form below." crumbs={[{ label: "Contact" }]} />
      <div className="wrap section-tight detail-grid">
        <ContactForm defaults={user ? { name: user.name, email: user.email } : undefined} />
        <aside className="stack">
          <div className="card stack">
            <p className="row" style={{ flexWrap: "nowrap", margin: 0 }}><IconWhatsApp className="brand-mark" /><span><strong>WhatsApp</strong><br /><a href={whatsappLink(s.whatsappNumber, "Hi Guitarz4U, ")} target="_blank" rel="noopener noreferrer" data-track="whatsapp_click">{s.whatsappNumber}</a></span></p>
            <p className="row" style={{ flexWrap: "nowrap", margin: 0 }}><IconMail className="brand-mark" /><span><strong>Email</strong><br /><a href={`mailto:${s.email}`}>{s.email}</a></span></p>
            <p className="row" style={{ flexWrap: "nowrap", margin: 0 }}><IconPin className="brand-mark" /><span><strong>Area</strong><br />{s.locationLine}<br /><span className="small muted">Collection address shared privately after approval.</span></span></p>
            <p className="row" style={{ flexWrap: "nowrap", margin: 0 }}><IconClock className="brand-mark" /><span><strong>Please note</strong><br />{s.hoursNotice}</span></p>
            <p className="small muted" style={{ margin: 0 }}>Social media: @{s.socialHandle}</p>
          </div>
          <div className="notice"><strong>Stay safe</strong><p>Guitarz4U will never ask for your card details, online banking password or a one-time PIN. EFT details are only shared privately after we have approved your purchase.</p></div>
        </aside>
      </div>
    </>
  );
}
