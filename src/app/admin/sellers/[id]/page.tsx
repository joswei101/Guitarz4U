import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decideSellerOffer, recordSellerOffer, saveNotes } from '@/app/actions/admin-ops';
import { FileGallery } from '@/components/FileGallery';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { StatusForm } from '@/components/admin/StatusForm';
import { MailTo, WhatsAppTo } from '@/components/admin/WhatsAppTo';
import { requireStaff } from '@/lib/auth';
import { signedFileUrls } from '@/lib/files';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime, formatZAR } from '@/lib/format';
import { CONTACT_METHODS, SELLER_CONDITIONS, SELLER_STATUS, label } from '@/lib/labels';

export default async function SellerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('sellers');
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: s } = await supabase.from('seller_enquiries').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();
  const [{ data: offers }, { data: history }, { data: files }] = await Promise.all([
    supabase.from('seller_offers').select('*').eq('seller_enquiry_id', id).order('created_at'),
    supabase.from('status_history').select('id, from_status, to_status, note, created_at').eq('entity_type', 'seller_enquiries').eq('entity_id', id).order('created_at'),
    supabase.from('submission_files').select('id, path, mime_type').eq('seller_enquiry_id', id),
  ]);
  const signed = await signedFileUrls(files ?? []);
  const back = `/admin/sellers/${id}`;
  const open = (offers ?? []).find((o) => o.status === 'open');
  const closed = ['completed', 'cancelled'].includes(s.status);
  return (
    <>
      <p><Link href="/admin/sellers">← Seller enquiries</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="row-between"><h1 style={{ margin: 0 }}>{s.ref}: {s.brand} {s.model}</h1><StatusBadge status={s.status} text={label(SELLER_STATUS, s.status)} /></div>
      <div className="grid-2">
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Seller (private)</h2>
          <p>{s.name}<br />{s.email}<br />WhatsApp: {s.whatsapp}<br />Area: {s.suburb}<br />Prefers: {label(CONTACT_METHODS, s.preferred_contact)}<br /><span className="small muted">{s.user_id ? 'Registered customer' : 'Guest'} · {formatDateTime(s.created_at)}</span></p>
          <div className="row">
            <WhatsAppTo phone={s.whatsapp} message={`Hi ${s.name}, this is Guitarz4U about the ${s.brand} ${s.model} you submitted (${s.ref}). `} />
            <MailTo email={s.email} subject={`Your guitar ${s.ref} — Guitarz4U`} />
          </div>
        </section>
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Guitar</h2>
          <dl className="spec-list">
            <dt>Condition</dt><dd>{label(SELLER_CONDITIONS, s.condition)}</dd>
            <dt>Type</dt><dd>{s.category ?? 'Not given'}</dd>
            <dt>Asking</dt><dd>{s.is_giveaway ? <strong>Free giveaway</strong> : formatZAR(s.asking_price)}</dd>
            <dt>Accessories</dt><dd>{s.accessories || '—'}</dd>
            <dt>Faults</dt><dd style={{ whiteSpace: 'pre-line' }}>{s.faults || '—'}</dd>
            <dt>Notes</dt><dd style={{ whiteSpace: 'pre-line' }}>{s.notes || '—'}</dd>
          </dl>
        </section>
      </div>
      <section className="card"><h2 style={{ fontSize: '1.15rem' }}>Photos (private)</h2><FileGallery files={signed} /></section>

      <form action={saveNotes} className="card stack">
        <h2 style={{ fontSize: '1.15rem' }}>Inspection &amp; handover</h2>
        <input type="hidden" name="entity" value="seller_enquiries" /><input type="hidden" name="id" value={s.id} /><input type="hidden" name="back" value={back} />
        <div className="form-grid">
          <div className="field"><label htmlFor="idate">Inspection date</label><input id="idate" name="inspection_date" type="date" defaultValue={s.inspection_date ?? ''} /></div>
          <div className="field field-full"><label htmlFor="inotes">Inspection results</label><textarea id="inotes" name="inspection_notes" defaultValue={s.inspection_notes} placeholder="What you found when inspecting the guitar in person" /></div>
          <div className="field field-full"><label htmlFor="hnotes">Handover arrangements (private)</label><textarea id="hnotes" name="handover_notes" defaultValue={s.handover_notes} /></div>
          <div className="field field-full"><label htmlFor="anotes">Private notes</label><textarea id="anotes" name="admin_notes" defaultValue={s.admin_notes} /></div>
        </div>
        <div><SubmitButton className="btn btn-outline btn-small">Save</SubmitButton></div>
      </form>

      <section className="card stack">
        <h2 style={{ fontSize: '1.15rem' }}>Offers &amp; negotiation</h2>
        {offers?.length ? (
          <div className="table-wrap"><table className="data"><thead><tr><th>Date</th><th>Who</th><th className="num">Amount</th><th>Note</th><th>Status</th></tr></thead>
            <tbody>{offers.map((o) => <tr key={o.id}><td>{formatDate(o.created_at)}</td><td>{o.direction === 'owner-offer' ? 'Our offer' : 'Seller counter'}</td><td className="num">{formatZAR(o.amount)}</td><td className="small">{o.note}</td><td>{o.status}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="muted">No offers yet. Inspect the guitar in person before making an offer.</p>}
        {open ? (
          <div className="row">
            <span>Latest open: <strong>{formatZAR(open.amount)}</strong> —</span>
            <form action={decideSellerOffer}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="offer_id" value={open.id} /><input type="hidden" name="decision" value="accepted" />
              <ConfirmButton className="btn btn-primary btn-small" message={`Record that ${formatZAR(open.amount)} was ACCEPTED?`}>Record accepted</ConfirmButton></form>
            <form action={decideSellerOffer}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="offer_id" value={open.id} /><input type="hidden" name="decision" value="declined" />
              <ConfirmButton message={`Record that ${formatZAR(open.amount)} was DECLINED?`}>Record declined</ConfirmButton></form>
          </div>
        ) : null}
        {!closed ? (
          <form action={recordSellerOffer} className="stack card-plain">
            <input type="hidden" name="id" value={s.id} />
            <div className="form-grid">
              <div className="field"><label htmlFor="odir">Type</label><select id="odir" name="direction"><option value="owner-offer">Our offer to the seller</option><option value="seller-counter">Seller&apos;s counter-offer</option></select></div>
              <div className="field"><label htmlFor="oamt">Amount (R)</label><input id="oamt" name="amount" inputMode="decimal" required defaultValue={s.is_giveaway ? '0' : ''} /></div>
              <div className="field field-full"><label htmlFor="onote">Note (included in the email for our offers)</label><input id="onote" name="note" /></div>
            </div>
            <label className="check"><input type="checkbox" name="notify" defaultChecked /> Email/notify the seller about our offer</label>
            <div><SubmitButton className="btn btn-dark btn-small">Record offer</SubmitButton></div>
          </form>
        ) : null}
        <p className="small"><Link href={`/admin/products/new?brand=${encodeURIComponent(s.brand)}&model=${encodeURIComponent(s.model)}`}>Create a shop listing for this guitar →</Link></p>
      </section>

      <StatusForm entity="seller_enquiries" id={s.id} current={s.status} options={SELLER_STATUS} back={back} />
      <section className="card"><h2 style={{ fontSize: '1.15rem' }}>Timeline</h2><Timeline entries={history ?? []} labels={SELLER_STATUS} /></section>
    </>
  );
}
