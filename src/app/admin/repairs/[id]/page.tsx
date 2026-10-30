import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addWorkLog, recordQuoteDecision, saveNotes, sendQuote } from '@/app/actions/admin-ops';
import { FileGallery } from '@/components/FileGallery';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { PaymentsPanel } from '@/components/admin/PaymentsPanel';
import { StatusForm } from '@/components/admin/StatusForm';
import { MailTo, WhatsAppTo } from '@/components/admin/WhatsAppTo';
import { profileHasPerm, requireStaff } from '@/lib/auth';
import { signedFileUrls } from '@/lib/files';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime, formatZAR } from '@/lib/format';
import { CONTACT_METHODS, QUOTE_STATUS, REPAIR_SERVICES, REPAIR_STATUS, label } from '@/lib/labels';

export default async function RepairAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile } = await requireStaff('repairs');
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: r } = await supabase.from('repairs').select('*').eq('id', id).maybeSingle();
  if (!r) notFound();
  const [{ data: quotes }, { data: log }, { data: history }, { data: files }] = await Promise.all([
    supabase.from('repair_quotes').select('*').eq('repair_id', id).order('version'),
    supabase.from('repair_work_log').select('*').eq('repair_id', id).order('created_at'),
    supabase.from('status_history').select('id, from_status, to_status, note, created_at').eq('entity_type', 'repairs').eq('entity_id', id).order('created_at'),
    supabase.from('submission_files').select('id, path, mime_type').eq('repair_id', id),
  ]);
  const signed = await signedFileUrls(files ?? []);
  const back = `/admin/repairs/${id}`;
  const initialApproved = (quotes ?? []).some((q) => q.kind === 'initial' && q.status === 'approved');
  const approvedTotal = (quotes ?? []).filter((q) => q.status === 'approved').reduce((s, q) => s + Number(q.total_amount), 0);
  const closed = ['collected', 'cancelled'].includes(r.status);
  const statusMsg = `Hi ${r.name}, an update on your ${r.brand} ${r.model} repair (${r.ref}): ${label(REPAIR_STATUS, r.status)}.`;
  return (
    <>
      <p><Link href="/admin/repairs">← Repairs</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="row-between"><h1 style={{ margin: 0 }}>{r.ref}: {r.brand} {r.model}</h1><StatusBadge status={r.status} text={label(REPAIR_STATUS, r.status)} /></div>
      <div className="grid-2">
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Customer</h2>
          <p>{r.name}<br />{r.email}<br />WhatsApp: {r.whatsapp ?? '—'}<br />Prefers: {label(CONTACT_METHODS, r.preferred_contact)}<br />
            <span className="small muted">{r.user_id ? 'Registered — can approve quotes online' : 'Guest — record approvals manually'} · {formatDateTime(r.created_at)}</span></p>
          <div className="row">
            <WhatsAppTo phone={r.whatsapp} message={statusMsg} label="WhatsApp status update" />
            <MailTo email={r.email} subject={`Your repair ${r.ref} — Guitarz4U`} />
          </div>
        </section>
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Request</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{r.problem}</p>
          <p className="small">Services: {r.services.map((x: string) => label(REPAIR_SERVICES, x)).join(', ') || '—'}<br />Preferred date: {formatDate(r.preferred_date)}</p>
          <FileGallery files={signed} />
        </section>
      </div>

      <section className="card stack">
        <h2 style={{ fontSize: '1.15rem' }}>Quotes &amp; approvals</h2>
        <p className="small muted">Work cannot start until the customer approves the initial quote — the system blocks the status change otherwise. Any extra cost needs an additional quote that the customer approves.</p>
        {quotes?.length ? quotes.map((q) => (
          <div key={q.id} className="card-plain">
            <div className="row-between"><strong>v{q.version} · {q.kind === 'initial' ? 'Initial quote' : 'Additional cost'}: {formatZAR(q.total_amount)}</strong><StatusBadge status={q.status} text={label(QUOTE_STATUS, q.status)} /></div>
            <div className="small">Labour {formatZAR(q.labour_amount)} · Parts {formatZAR(q.parts_amount)}{q.parts_detail ? ` (${q.parts_detail})` : ''} · sent {formatDateTime(q.created_at)}</div>
            {q.notes ? <div className="small" style={{ whiteSpace: 'pre-line' }}>{q.notes}</div> : null}
            {q.decided_at ? <div className="small muted">Decision: {q.status} via {q.decision_method} on {formatDateTime(q.decided_at)}{q.decision_note ? ` — “${q.decision_note}”` : ''}</div> : null}
            {q.status === 'sent' ? (
              <form action={recordQuoteDecision} className="row" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="quote_id" value={q.id} />
                <label className="visually-hidden" htmlFor={`qd-${q.id}`}>Decision</label>
                <select id={`qd-${q.id}`} name="decision" style={{ width: 'auto' }}><option value="approved">Customer approved</option><option value="declined">Customer declined</option></select>
                <label className="visually-hidden" htmlFor={`qm-${q.id}`}>How</label>
                <select id={`qm-${q.id}`} name="method" style={{ width: 'auto' }}><option value="whatsapp">by WhatsApp</option><option value="email">by email</option><option value="phone">by phone</option><option value="in-person">in person</option></select>
                <label className="visually-hidden" htmlFor={`qn-${q.id}`}>Evidence note</label>
                <input id={`qn-${q.id}`} name="note" required placeholder="e.g. WhatsApp msg 3 Nov 14:05 'yes go ahead'" style={{ maxWidth: 320 }} />
                <ConfirmButton className="btn btn-dark btn-small" message="Record the customer's decision? Only do this if the customer has clearly told you.">Record decision</ConfirmButton>
              </form>
            ) : null}
          </div>
        )) : <p className="muted">No quotes yet.</p>}
        <p><strong>Approved total: {formatZAR(approvedTotal)}</strong> <span className="small muted">(quoted value — not revenue until payment is recorded)</span></p>
        {!closed ? (
          <details className="disclosure" open={!quotes?.length}><summary>{initialApproved ? 'Send an additional-cost quote' : 'Send a quote'}</summary><div>
            <form action={sendQuote} className="stack">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="kind" value={initialApproved ? 'additional' : 'initial'} />
              <div className="form-grid">
                <div className="field"><label htmlFor="ql">Labour (R)</label><input id="ql" name="labour" inputMode="decimal" required /></div>
                <div className="field"><label htmlFor="qp">Parts (R)</label><input id="qp" name="parts" inputMode="decimal" defaultValue="0" /></div>
                <div className="field field-full"><label htmlFor="qpd">Parts details</label><input id="qpd" name="parts_detail" placeholder="e.g. D'Addario EXL110 strings, bone nut" /></div>
                <div className="field field-full"><label htmlFor="qnotes">Explanation for the customer</label><textarea id="qnotes" name="notes" placeholder="What the work involves and why" /></div>
              </div>
              <label className="check"><input type="checkbox" name="notify" defaultChecked /> Send the quote to the customer for approval (account + email)</label>
              <div><SubmitButton className="btn btn-primary btn-small">Send quote</SubmitButton></div>
            </form>
          </div></details>
        ) : null}
      </section>

      <StatusForm entity="repairs" id={r.id} current={r.status} options={REPAIR_STATUS} back={back} />

      <section className="card stack">
        <h2 style={{ fontSize: '1.15rem' }}>Work log (work done, parts, labour)</h2>
        {log?.length ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>{log.map((l) => (
            <li key={l.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
              <span className="small muted">{formatDateTime(l.created_at)} · {l.visible_to_customer ? 'visible to customer' : 'private'}{l.labour_minutes ? ` · ${l.labour_minutes} min` : ''}</span>
              <div style={{ whiteSpace: 'pre-line' }}>{l.entry}</div>{l.parts_used ? <div className="small">Parts: {l.parts_used}</div> : null}
            </li>
          ))}</ul>
        ) : <p className="muted">No entries yet.</p>}
        <form action={addWorkLog} className="stack card-plain">
          <input type="hidden" name="id" value={r.id} />
          <div className="form-grid">
            <div className="field field-full"><label htmlFor="wl">Entry</label><textarea id="wl" name="entry" required /></div>
            <div className="field"><label htmlFor="wp">Parts used</label><input id="wp" name="parts_used" /></div>
            <div className="field"><label htmlFor="wm">Labour (minutes)</label><input id="wm" name="labour_minutes" type="number" min={0} /></div>
          </div>
          <div className="row">
            <label className="check"><input type="checkbox" name="visible" /> Show to customer</label>
            <label className="check"><input type="checkbox" name="notify" /> Notify customer</label>
          </div>
          <div><SubmitButton className="btn btn-outline btn-small">Add entry</SubmitButton></div>
        </form>
      </section>

      <form action={saveNotes} className="card stack">
        <input type="hidden" name="entity" value="repairs" /><input type="hidden" name="id" value={r.id} /><input type="hidden" name="back" value={back} />
        <div className="field"><label htmlFor="dn">Drop-off / collection arrangements (private)</label><textarea id="dn" name="dropoff_notes" defaultValue={r.dropoff_notes} /></div>
        <div className="field"><label htmlFor="rn">Private notes</label><textarea id="rn" name="admin_notes" defaultValue={r.admin_notes} /></div>
        <div><SubmitButton className="btn btn-outline btn-small">Save notes</SubmitButton></div>
      </form>

      {profileHasPerm(profile, 'payments') ? <PaymentsPanel entityType="repair" entityId={r.id} back={back} expected={approvedTotal || undefined} /> : null}
      {r.completed_at ? <p className="small">Completed {formatDate(r.completed_at)} · warranty {r.warranty_days === null ? 'not set at completion' : `${r.warranty_days} days`}</p> : null}
      <section className="card"><h2 style={{ fontSize: '1.15rem' }}>Timeline</h2><Timeline entries={history ?? []} labels={REPAIR_STATUS} /></section>
    </>
  );
}
