import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { RepairForm } from '@/components/RepairForm';
import { WhatsAppIcon } from '@/components/icons';
import { getProfile, getUser } from '@/lib/auth';
import { REPAIR_SERVICES } from '@/lib/labels';
import { getContent, getSettings } from '@/lib/site';
import { waLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Guitar repairs in Sandringham, Johannesburg',
  description: 'Guitar repairs in Johannesburg: strings, setups, fretwork, pickups, nut and saddle, intonation and broken guitar repairs. Clear quotes you approve first.',
  alternates: { canonical: '/repairs' },
};

const DETAILS: Record<string, string> = {
  strings: 'Fresh strings, cleaned fretboard and a quick tune-up.',
  setup: 'Neck relief, action height and playability adjusted to suit you.',
  fretwork: 'Fret levelling, crowning, polishing and fret replacement.',
  diagnosis: 'Buzzes, crackles, dead spots or tuning problems tracked down.',
  body: 'Cracks, dings, loose braces, bridges and headstock repairs.',
  cleaning: 'Deep clean, fretboard conditioning and hardware polish.',
  pickups: 'Pickup swaps and upgrades, wiring and soldering.',
  broken: 'Snapped headstocks, broken necks and other major damage.',
  'nut-saddle': 'New nuts and saddles cut and shaped for better tone and tuning.',
  intonation: 'Accurate intonation so your guitar plays in tune up the neck.',
};

export default async function RepairsPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const sp = await searchParams;
  const [user, profile, settings, intro] = await Promise.all([getUser(), getProfile(), getSettings(), getContent('repairs-intro')]);
  return (
    <>
      <PageHero title="Guitar repairs" intro={intro?.body.trim()} />
      <section className="section">
        <div className="wrap">
          <h2>Services</h2>
          <div className="grid-3">
            {Object.entries(REPAIR_SERVICES).map(([k, l]) => (
              <div key={k} className="feature-card">
                <h3 style={{ fontSize: '1.08rem' }}>{l}</h3>
                <p className="small muted" style={{ margin: 0 }}>{DETAILS[k]}</p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 16 }}>Prices depend on the guitar and the work needed, so every job gets a personal quote after inspection.</p>
        </div>
      </section>
      <section className="section section-alt">
        <div className="wrap grid-main-side">
          <div>
            <h2>Request a repair</h2>
            {!user ? <div className="alert alert-info"><Link href="/auth/login?next=/repairs">Sign in</Link> or <Link href="/auth/register?next=/repairs">register</Link> first to approve quotes and follow progress online.</div> : null}
            <RepairForm preselect={sp.service} defaults={{ name: profile?.full_name ?? undefined, email: user?.email ?? undefined, whatsapp: profile?.whatsapp ?? undefined }} />
          </div>
          <aside className="stack">
            <div className="card">
              <h2 style={{ fontSize: '1.25rem' }}>How repairs work</h2>
              <ol className="steps">
                <li>Send your request (no booking fee).</li>
                <li>We arrange drop-off privately.</li>
                <li>We inspect and send a quote — labour and parts shown separately.</li>
                <li><strong>You approve the quote.</strong> No work starts before this.</li>
                <li>Any extra cost needs your approval first.</li>
                <li>We let you know when it&apos;s ready to collect. You pay directly (usually EFT).</li>
              </ol>
              <p className="small"><Link href="/legal/repair-terms">Repair quote, approval and warranty terms</Link></p>
            </div>
            <a className="btn btn-whatsapp btn-block" target="_blank" rel="noopener noreferrer" href={waLink(settings.whatsapp_international, 'Hi Guitarz4U, I need a guitar repair. Guitar: ')}><WhatsAppIcon /> Ask on WhatsApp</a>
          </aside>
        </div>
      </section>
    </>
  );
}
