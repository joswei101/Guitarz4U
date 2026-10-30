import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decideQuote } from '@/app/actions/account';
import { FileGallery } from '@/components/FileGallery';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { requireUser } from '@/lib/auth';
import { signedFileUrls } from '@/lib/files';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime, formatZAR } from '@/lib/format';
import { QUOTE_STATUS, REPAIR_SERVICES, REPAIR_STATUS, label } from '@/lib/labels';
import { getSettings } from '@/lib/site';

export default async function RepairDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser('/account/repairs');
  const supabase = await createClient();
  const { data: r } = await supabase.from('repairs').select('*').eq('id', id).maybeSingle();
  if (!r) notFound();
  const [{ data: quotes }, { data: log }, { data: history }, { data: files }, { data: payments }, settings] = await Promise.all([
    supabase.from('repair_quotes').select('*').eq('repair_id', id).order('version'),
    supabase.from('repair_work_log').select('id, entry, parts_used, created_at').eq('repair_id', id).order('created_at'),
    supabase.from('status_history').select('id, from_status, to_status, note, created_at').eq('entity_type', 'repairs').eq('entity_id', id).order('created_at'),
    supabase.from('submission_files').select('id, path, mime_type').eq('repair_id', id),
    supabase.from('payments').select('amount, received_on, method').eq('entity_type', 'repair').eq('entity_id', id),
    getSettings(),
  ]);
  const signed = await signedFileUrls(files ?? []);
  const approvedTotal = (quotes ?? []).filter((q) => q.status === 'approved').reduce((s, q) => s + Number(q.total_amount), 0);
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  return (
    <div className="stack">
      <p><Link href="/account/repairs">← All repairs</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="row-between"><h1 style={{ margin: 0 }}>{r.brand} {r.model}</h1><StatusBadge status={r.status} text={label(REPAIR_STATUS, r.status)} /></div>
      <p className="muted">Reference {r.ref} · requested {formatDate(r.created_at)}</p>

      <section className="card">
        <h2 style={{ fontSize: '1.2rem' }}>Quotes</h2>
        {quotes?.length ? quotes.map((q) => (
          <div key={q.id} className="card-plain" style={{ marginBottom: 12 }}>
            <div className="row-between">
              <strong>{q.kind === 'initial' ? 'Repair quote' : 'Additional cost'} v{q.version}</strong>
              <StatusBadge status={q.status} text={label(QUOTE_STATUS, q.status)} />
            </div>
            <table className="data" style={{ marginTop: 8 }}>
              <tbody>
                <tr><td>Labour</td><td className="num">{formatZAR(q.labour_amount)}</td></tr>
                <tr><td>Parts{q.parts_detail ? <div className="small muted">{q.parts_detail}</div> : null}</td><td className="num">{formatZAR(q.parts_amount)}</td></tr>
                <tr><th scope="row">Total</th><td className="num"><strong>{formatZAR(q.total_amount)}</strong></td></tr>
              </tbody>
            </table>
            {q.notes ? <p className="small" style={{ whiteSpace: 'pre-line', marginTop: 8 }}>{q.notes}</p> : null}
            {q.decided_at ? <p className="small muted">Decision recorded {formatDateTime(q.decided_at)} via {q.decision_method}.</p> : null}
            {q.status === 'sent' ? (
              <div className="stack" style={{ marginTop: 10 }}>
                <form action={decideQuote} className="stack">
                  <input type="hidden" name="quote_id" value={q.id} />
                  <input type="hidden" name="repair_id" value={r.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <label className="check"><input type="checkbox" name="confirm" required />
                    <span>I approve this {q.kind === 'initial' ? 'quote' : 'additional cost'} of <strong>{formatZAR(q.total_amount)}</strong>. I understand payment is arranged directly with the owner after the repair, and the <Link href="/legal/repair-terms">repair terms</Link> apply.</span></label>
                  <div><SubmitButton pendingText="Saving…">Approve quote</SubmitButton></div>
                </form>
                <form action={decideQuote} className="row">
                  <input type="hidden" name="quote_id" value={q.id} />
                  <input type="hidden" name="repair_id" value={r.id} />
                  <input type="hidden" name="decision" value="declined" />
                  <label className="visually-hidden" htmlFor={`note-${q.id}`}>Reason (optional)</label>
                  <input id={`note-${q.id}`} name="note" placeholder="Reason (optional)" style={{ maxWidth: 280 }} />
                  <ConfirmButton message="Decline this quote? We will contact you to discuss options.">Decline</ConfirmButton>
                </form>
              </div>
            ) : null}
          </div>
        )) : <p className="muted">No quote yet. We&apos;ll send one after inspecting your guitar. No work starts until you approve it.</p>}
        {approvedTotal > 0 ? <p><strong>Total approved: {formatZAR(approvedTotal)}</strong>{paid ? ` · Payments recorded: ${formatZAR(paid)}` : ''}</p> : null}
        <p className="small muted">Payment is arranged privately after completion (usually EFT). The website does not take payments.</p>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Progress</h2>
          <Timeline entries={history ?? []} labels={REPAIR_STATUS} />
          {log?.length ? (
            <>
              <h3 style={{ marginTop: 16 }}>Workshop notes</h3>
              <ul>{log.map((l) => <li key={l.id}><span className="small muted">{formatDate(l.created_at)}:</span> {l.entry}{l.parts_used ? ` (parts: ${l.parts_used})` : ''}</li>)}</ul>
            </>
          ) : null}
          {r.completed_at ? (
            <p className="small" style={{ marginTop: 12 }}>
              Completed {formatDate(r.completed_at)}.{' '}
              {r.warranty_days ? `Workmanship warranty: ${r.warranty_days} days (until ${formatDate(new Date(new Date(r.completed_at).getTime() + r.warranty_days * 86400000))}).` : settings.repair_warranty_days === null ? '' : ''}
            </p>
          ) : null}
        </section>
        <section className="card">
          <h2 style={{ fontSize: '1.15rem' }}>Your request</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{r.problem}</p>
          <p className="small">Services: {r.services.map((s: string) => label(REPAIR_SERVICES, s)).join(', ') || '—'}</p>
          <p className="small">Preferred date: {r.preferred_date ? formatDate(r.preferred_date) : '—'}</p>
          <FileGallery files={signed} />
        </section>
      </div>
    </div>
  );
}
