import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatZAR } from '@/lib/format';
import { PAYMENT_METHODS, label } from '@/lib/labels';

const LINK: Record<string, (id: string) => string> = {
  enquiry: (id) => `/admin/enquiries/${id}`, repair: (id) => `/admin/repairs/${id}`,
  product: (id) => `/admin/products/${id}`, reservation: () => '/admin/reservations',
};

export default async function PaymentsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('payments');
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('payments').select('*').order('received_on', { ascending: false }).limit(300);
  const valid = (data ?? []).filter((p) => !p.voided);
  const total = valid.reduce((s, p) => s + Number(p.amount), 0);
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Payments (manual records)</h1>
      <div className="payment-note"><strong>This website does not process payments.</strong> These are records you made after personally confirming money was received (e.g. checking your bank app). Record new payments from the enquiry, repair or product page.</div>
      <p><strong>Total recorded (not voided): {formatZAR(total)}</strong> from {valid.length} payment(s).</p>
      {data?.length ? (
        <div className="table-wrap"><table className="data"><thead><tr><th>Received</th><th>For</th><th>Method</th><th className="num">Amount</th><th>Reference</th><th>Status</th></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id}><td>{formatDate(p.received_on)}</td><td><Link href={LINK[p.entity_type](p.entity_id)}>{p.entity_type}</Link></td><td>{label(PAYMENT_METHODS, p.method)}</td>
              <td className="num">{formatZAR(p.amount)}</td><td className="small">{p.reference_note}</td><td>{p.voided ? <span className="badge badge-bad">Voided: {p.void_reason}</span> : <span className="badge badge-good">Recorded</span>}</td></tr>
          ))}</tbody></table></div>
      ) : <p className="muted">No payments recorded yet.</p>}
    </>
  );
}
