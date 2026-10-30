import { recordPayment, voidPayment } from '@/app/actions/admin-ops';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatZAR } from '@/lib/format';
import { PAYMENT_METHODS, label } from '@/lib/labels';

/** Manual payment records for one enquiry/reservation/repair/product. */
export async function PaymentsPanel({ entityType, entityId, back, expected }: {
  entityType: 'enquiry' | 'reservation' | 'repair' | 'product'; entityId: string; back: string; expected?: number;
}) {
  const supabase = await createClient();
  const { data } = await supabase.from('payments').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at');
  const total = (data ?? []).filter((p) => !p.voided).reduce((s, p) => s + Number(p.amount), 0);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="card">
      <h2 style={{ fontSize: '1.15rem' }}>Payments (recorded manually)</h2>
      <p className="small muted">The website never takes payments. Record a payment only after you have personally confirmed the money is in your account (not just a customer&apos;s screenshot).</p>
      {data?.length ? (
        <div className="table-wrap" style={{ marginBottom: 12 }}><table className="data">
          <thead><tr><th>Received</th><th>Method</th><th className="num">Amount</th><th>Reference</th><th /></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id} style={p.voided ? { opacity: 0.55, textDecoration: 'line-through' } : undefined}>
              <td>{formatDate(p.received_on)}</td><td>{label(PAYMENT_METHODS, p.method)}</td><td className="num">{formatZAR(p.amount)}</td>
              <td>{p.reference_note}{p.voided ? <div className="small">Voided: {p.void_reason}</div> : null}</td>
              <td>{!p.voided ? (
                <form action={voidPayment} className="row" style={{ flexWrap: 'nowrap' }}>
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
                  <label className="visually-hidden" htmlFor={`vr-${p.id}`}>Reason</label>
                  <input id={`vr-${p.id}`} name="void_reason" placeholder="Reason" style={{ minWidth: 100 }} required />
                  <ConfirmButton message="Void this payment record? It stays in the history but no longer counts.">Void</ConfirmButton>
                </form>
              ) : null}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="muted">No payments recorded.</p>}
      <p><strong>Total recorded: {formatZAR(total)}</strong>{expected ? ` of ${formatZAR(expected)}` : ''}</p>
      <details className="disclosure"><summary>Record a verified payment</summary><div>
        <form action={recordPayment} className="stack">
          <input type="hidden" name="entity_type" value={entityType} />
          <input type="hidden" name="entity_id" value={entityId} />
          <input type="hidden" name="back" value={back} />
          <div className="form-grid">
            <div className="field"><label htmlFor={`pa-${entityId}`}>Amount received (R)</label><input id={`pa-${entityId}`} name="amount" inputMode="decimal" required /></div>
            <div className="field"><label htmlFor={`pm-${entityId}`}>Method</label>
              <select id={`pm-${entityId}`} name="method">{Object.entries(PAYMENT_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field"><label htmlFor={`pd-${entityId}`}>Date received</label><input id={`pd-${entityId}`} name="received_on" type="date" max={today} defaultValue={today} required /></div>
            <div className="field"><label htmlFor={`pr-${entityId}`}>Reference / note</label><input id={`pr-${entityId}`} name="reference_note" placeholder="e.g. bank ref, last 4 digits" /></div>
          </div>
          <label className="check"><input type="checkbox" name="verified" required /> I have checked my bank account (or counted the cash) and confirm this money has actually been received.</label>
          <div><SubmitButton className="btn btn-primary btn-small">Record payment</SubmitButton></div>
        </form>
      </div></details>
    </section>
  );
}
