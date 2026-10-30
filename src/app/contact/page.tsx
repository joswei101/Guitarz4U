import type { Metadata } from 'next';
import { ContactForm } from '@/components/PublicForms';
import { PageHero } from '@/components/PageHero';
import { MailIcon, PinIcon, WhatsAppIcon } from '@/components/icons';
import { getProfile, getUser } from '@/lib/auth';
import { getContent, getSettings } from '@/lib/site';
import { waLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Contact Guitarz4U',
  description: 'Contact Guitarz4U in Sandringham, Johannesburg by WhatsApp (064 856 7019), email or the contact form.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const [s, intro, user, profile] = await Promise.all([getSettings(), getContent('contact-intro'), getUser(), getProfile()]);
  return (
    <>
      <PageHero title="Contact" intro={intro?.body.trim()} />
      <div className="section">
        <div className="wrap grid-2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <div className="card">
              <h2 style={{ fontSize: '1.3rem' }}><WhatsAppIcon /> WhatsApp</h2>
              <p><a href={waLink(s.whatsapp_international)} target="_blank" rel="noopener noreferrer">{s.whatsapp_display}</a></p>
              <a className="btn btn-whatsapp" href={waLink(s.whatsapp_international, 'Hi Guitarz4U, ')} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
              <p className="small muted" style={{ marginTop: 8 }}>This opens WhatsApp with a message ready — you still need to press send.</p>
            </div>
            <div className="card">
              <h2 style={{ fontSize: '1.3rem' }}><MailIcon /> Email</h2>
              <p><a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></p>
              <p className="small muted">Social media: @{s.social_handle}</p>
            </div>
            <div className="card">
              <h2 style={{ fontSize: '1.3rem' }}><PinIcon /> Area</h2>
              <p>{s.collection_area}. Collection only. For privacy and safety, the exact collection or drop-off address is shared privately once arrangements are agreed.</p>
            </div>
          </div>
          <div className="card">
            <h2>Send a message</h2>
            <ContactForm defaults={{ name: profile?.full_name ?? undefined, email: user?.email ?? undefined, phone: profile?.whatsapp ?? undefined }} />
          </div>
        </div>
      </div>
    </>
  );
}
