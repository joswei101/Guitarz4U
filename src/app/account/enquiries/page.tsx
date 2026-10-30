import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatZAR } from '@/lib/format';
import { ENQUIRY_STATUS, OFFER_STATUS, label } from '@/lib/labels';

export default async function EnquiriesPage() {
  const { user } = await requireUser('/account/enquiries');
  const supabase = await createClient();
  const [{ data: enquiries }, { data: offers }, { data: payments }] = await Promise.all([
    supabase.from('enquiries').select('id, ref, status, created_at, enquiry_items(product_label, price_at_enquiry)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('offers').select('id, ref, amount, counter_amount, status, created_at, products(brand, model, slug)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('payments').select('entity_type, entity_id, amount, received_on').eq('customer_id', user.id),
  ]);
  const paidFor = (id: string) => (payments ?? []).filter((p) => p.entity_id === id);
  return (
    <div className="stack">
      <h1>Purchase enquiries &amp; offers</h1>
      <section className="card">
        <h2 style={{ fontSize: '1.2rem' }}>Purchase enquiries</h2>
        {enquiries?.length ? enquiries.map((e) => (
          <div key={e.id} style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
            <div className="row-between"><strong>{e.ref}</strong><StatusBadge status={e.status} text={label(ENQUIRY_STATUS, e.status)} /></div>
            <ul className="small">{(e.enquiry_items ?? []).map((i, n) => <li key={n}>{i.product_label} — {formatZAR(i.price_at_enquiry)}</li>)}</ul>
            <div className="small muted">Sent {formatDate(e.created_at)}</div>
            {paidFor(e.id).map((p, n) => <div key={n} className="small">Payment recorded by the owner: {formatZAR(p.amount)} on {formatDate(p.received_on)}</div>)}
          </div>
        )) : <p className="muted">No purchase enquiries yet. Add guitars to your <Link href="/cart">enquiry cart</Link> to ask about them.</p>}
      </section>
      <section className="card">
        <h2 style={{ fontSize: '1.2rem' }}>Offers</h2>
        {offers?.length ? (
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Ref</th><th>Guitar</th><th className="num">Your offer</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{offers.map((o) => {
              const p = o.products as unknown as { brand: string; model: string; slug: string } | null;
              return (
                <tr key={o.id}><td>{o.ref}</td><td>{p ? <Link href={`/shop/${p.slug}`}>{p.brand} {p.model}</Link> : '—'}</td>
                  <td className="num">{formatZAR(o.amount)}{o.counter_amount ? <div className="small">Counter: {formatZAR(o.counter_amount)}</div> : null}</td>
                  <td><StatusBadge status={o.status} text={label(OFFER_STATUS, o.status)} /></td><td>{formatDate(o.created_at)}</td></tr>
              );
            })}</tbody>
          </table></div>
        ) : <p className="muted">No offers yet.</p>}
      </section>
    </div>
  );
}
