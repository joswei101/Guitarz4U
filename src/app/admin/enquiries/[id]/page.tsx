import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveNotes } from '@/app/actions/admin-ops';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { SubmitButton } from '@/components/forms';
import { PaymentsPanel } from '@/components/admin/PaymentsPanel';
import { StatusForm } from '@/components/admin/StatusForm';
import { MailTo, WhatsAppTo } from '@/components/admin/WhatsAppTo';
import { profileHasPerm, requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatZAR } from '@/lib/format';
import { CONTACT_METHODS, ENQUIRY_STATUS, label } from '@/lib/labels';

export default async function EnquiryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile } = await requireStaff('enquiries');
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: e } = await supabase.from('enquiries').select('*, enquiry_items(product_id, product_label, price_at_enquiry, status_at_enquiry)').eq('id', id).maybeSingle();
  if (!e) notFound();
  const { data: history } = await supabase.from('status_history').select('id, from_status, to_status, note, created_at').eq('entity_type', 'enquiries').eq('entity_id', id).order('created_at');
  const total = (e.enquiry_items ?? []).reduce((s, i) => s + Number(i.price_at_enquiry), 0);
  const back = `/admin/enquiries/${id}`;
  return (
    <>
      <p><Link href="/admin/enquiries">← All enquiries</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="row-between"><h1 style={{ margin: 0 }}>Enquiry {e.ref}</h1><StatusBadge status={e.status} text={label(ENQUIRY_STATUS, e.status)} /></div>
      <div className="grid-2">
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Customer</h2>
          <p>{e.name}<br />{e.email}<br />{e.phone ?? 'No phone'}<br />Prefers: {label(CONTACT_METHODS, e.preferred_contact)}<br /><span className="small muted">{e.user_id ? 'Registered customer' : 'Guest'} · {formatDateTime(e.created_at)}</span></p>
          {e.message ? <p style={{ whiteSpace: 'pre-line' }}>“{e.message}”</p> : null}
          <div className="row">
            <WhatsAppTo phone={e.phone} message={`Hi ${e.name}, thank you for your Guitarz4U enquiry ${e.ref}. `} />
            <MailTo email={e.email} subject={`Your Guitarz4U enquiry ${e.ref}`} />
          </div>
        </section>
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Guitars</h2>
          <ul>{(e.enquiry_items ?? []).map((i, n) => <li key={n}>{i.product_id ? <Link href={`/admin/products/${i.product_id}`}>{i.product_label}</Link> : i.product_label} — {formatZAR(i.price_at_enquiry)} <span className="small muted">({i.status_at_enquiry} when sent)</span></li>)}</ul>
          <p><strong>Listed total: {formatZAR(total)}</strong> <span className="small muted">(an enquiry is not a sale)</span></p>
          <p className="small">To complete a sale: record the verified payment below, then mark each guitar as sold on its product page (or complete its reservation).</p>
        </section>
      </div>
      <StatusForm entity="enquiries" id={e.id} current={e.status} options={ENQUIRY_STATUS} back={back} />
      <form action={saveNotes} className="card stack">
        <input type="hidden" name="entity" value="enquiries" /><input type="hidden" name="id" value={e.id} /><input type="hidden" name="back" value={back} />
        <div className="field"><label htmlFor="an">Private notes</label><textarea id="an" name="admin_notes" defaultValue={e.admin_notes} /></div>
        <div><SubmitButton className="btn btn-outline btn-small">Save notes</SubmitButton></div>
      </form>
      {profileHasPerm(profile, 'payments') ? <PaymentsPanel entityType="enquiry" entityId={e.id} back={back} expected={total} /> : null}
      <section className="card"><h2 style={{ fontSize: '1.15rem' }}>Timeline</h2><Timeline entries={history ?? []} labels={ENQUIRY_STATUS} /></section>
    </>
  );
}
