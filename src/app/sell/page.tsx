import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { SellerForm } from '@/components/SellerForm';
import { WhatsAppIcon, MailIcon } from '@/components/icons';
import { getProfile, getUser } from '@/lib/auth';
import { getContent, getSettings } from '@/lib/site';
import { waLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Sell or give away your guitar',
  description: 'Sell or give away your guitar in Johannesburg — working, broken or incomplete. Guitarz4U inspects every guitar in person before making an offer.',
  alternates: { canonical: '/sell' },
};

export default async function SellPage() {
  const [user, profile, settings, intro] = await Promise.all([getUser(), getProfile(), getSettings(), getContent('sell-intro')]);
  return (
    <>
      <PageHero title="Sell or give away a guitar" intro={intro?.body.trim()} crumb="Sell" />
      <div className="section">
        <div className="wrap grid-main-side">
          <div>
            {!user ? (
              <div className="alert alert-info"><Link href="/auth/login?next=/sell">Sign in</Link> or <Link href="/auth/register?next=/sell">create an account</Link> first if you&apos;d like to track your submission online. You can also submit without an account.</div>
            ) : null}
            <SellerForm defaults={{ name: profile?.full_name ?? undefined, email: user?.email ?? undefined, whatsapp: profile?.whatsapp ?? undefined }} />
          </div>
          <aside className="stack">
            <div className="card">
              <h2 style={{ fontSize: '1.25rem' }}>What we accept</h2>
              <ul>
                <li>Working guitars</li><li>Broken guitars</li><li>Incomplete guitars (missing parts)</li>
                <li>Guitars needing repair</li><li>Guitars you&apos;d like to give away free</li>
              </ul>
              <p className="small"><strong>We don&apos;t accept loose parts</strong> (necks, pickups, hardware) on their own.</p>
            </div>
            <div className="card">
              <h2 style={{ fontSize: '1.25rem' }}>What happens next</h2>
              <ol className="steps">
                <li>We review your details and photos.</li>
                <li>We arrange an inspection with you.</li>
                <li>The owner inspects the guitar in person.</li>
                <li>We make an offer — accept, decline or negotiate.</li>
                <li>Handover is arranged privately.</li>
              </ol>
            </div>
            <div className="card">
              <h2 style={{ fontSize: '1.25rem' }}>Prefer to chat?</h2>
              <div className="stack">
                <a className="btn btn-whatsapp btn-block" target="_blank" rel="noopener noreferrer" href={waLink(settings.whatsapp_international, "Hi Guitarz4U, I'd like to sell/give away a guitar. Brand/model: ")}><WhatsAppIcon /> Send photos on WhatsApp</a>
                <a className="btn btn-outline btn-block" href={`mailto:${settings.contact_email}?subject=${encodeURIComponent('Guitar to sell / give away')}`}><MailIcon /> Email us</a>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>See our <Link href="/legal/seller-terms">seller submission and inspection terms</Link>.</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
