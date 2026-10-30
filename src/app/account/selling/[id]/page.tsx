import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileGallery } from '@/components/FileGallery';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { requireUser } from '@/lib/auth';
import { signedFileUrls } from '@/lib/files';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatZAR } from '@/lib/format';
import { SELLER_CONDITIONS, SELLER_STATUS, label } from '@/lib/labels';

export default async function SellingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser('/account/selling');
  const supabase = await createClient();
  // Row-level security: this only returns the submission if it belongs to the signed-in customer.
  const { data: s } = await supabase.from('seller_enquiries').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();
  const [{ data: offers }, { data: history }, { data: files }] = await Promise.all([
    supabase.from('seller_offers').select('id, direction, amount, note, status, created_at').eq('seller_enquiry_id', id).order('created_at'),
    supabase.from('status_history').select('id, from_status, to_status, note, created_at').eq('entity_type', 'seller_enquiries').eq('entity_id', id).order('created_at'),
    supabase.from('submission_files').select('id, path, mime_type').eq('seller_enquiry_id', id),
  ]);
  const signed = await signedFileUrls(files ?? []);
  return (
    <div className="stack">
      <p><Link href="/account/selling">← All submissions</Link></p>
      <div className="row-between"><h1 style={{ margin: 0 }}>{s.brand} {s.model}</h1><StatusBadge status={s.status} text={label(SELLER_STATUS, s.status)} /></div>
      <p className="muted">Reference {s.ref} · submitted {formatDate(s.created_at)}</p>
      <div className="grid-2">
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Your submission</h2>
          <dl className="spec-list">
            <dt>Condition</dt><dd>{label(SELLER_CONDITIONS, s.condition)}</dd>
            <dt>Your price</dt><dd>{s.is_giveaway ? 'Giving away free' : s.asking_price ? formatZAR(s.asking_price) : 'Not specified'}</dd>
            <dt>Area</dt><dd>{s.suburb}</dd>
            <dt>Accessories</dt><dd>{s.accessories || '—'}</dd>
            <dt>Faults</dt><dd style={{ whiteSpace: 'pre-line' }}>{s.faults || '—'}</dd>
          </dl>
          <h3 style={{ marginTop: 16 }}>Photos</h3>
          <FileGallery files={signed} />
        </section>
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Offers</h2>
          {offers?.length ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>{offers.map((o) => (
              <li key={o.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
                <strong>{o.direction === 'owner-offer' ? 'Our offer' : 'Your counter-offer'}: {formatZAR(o.amount)}</strong> <span className="small muted">({o.status}, {formatDate(o.created_at)})</span>
                {o.note ? <div className="small">{o.note}</div> : null}
              </li>
            ))}</ul>
          ) : <p className="muted">No offer yet. The owner inspects every guitar in person before making an offer.</p>}
          <p className="small muted">To accept, decline or negotiate, reply to the owner on WhatsApp or email.</p>
          <h2 style={{ fontSize: '1.15rem', marginTop: 20 }}>Progress</h2>
          <Timeline entries={history ?? []} labels={SELLER_STATUS} />
        </section>
      </div>
    </div>
  );
}
