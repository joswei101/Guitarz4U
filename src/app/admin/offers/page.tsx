import Link from 'next/link';
import { saveNotes } from '@/app/actions/admin-ops';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { SubmitButton } from '@/components/forms';
import { StatusForm } from '@/components/admin/StatusForm';
import { MailTo, WhatsAppTo } from '@/components/admin/WhatsAppTo';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatZAR } from '@/lib/format';
import { OFFER_STATUS, label } from '@/lib/labels';

export default async function OffersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('enquiries');
  const sp = await searchParams;
  const supabase = await createClient();
  const open = sp.view !== 'closed';
  let q = supabase.from('offers').select('*, products(id, brand, model, price, status)').order('created_at', { ascending: false }).limit(100);
  q = open ? q.in('status', ['new', 'under-review', 'countered']) : q.not('status', 'in', '(new,under-review,countered)');
  const { data } = await q;
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Offers</h1>
      <p className="muted">Offers are never accepted automatically. Negotiate privately by WhatsApp or email, then record the outcome here.</p>
      <nav className="tabs"><Link href="/admin/offers" aria-current={open ? 'page' : undefined}>Open</Link><Link href="/admin/offers?view=closed" aria-current={!open ? 'page' : undefined}>Closed</Link></nav>
      {data?.length ? data.map((o) => {
        const p = o.products as unknown as { id: string; brand: string; model: string; price: number; status: string };
        return (
          <section key={o.id} className="card stack">
            <div className="row-between">
              <strong>{o.ref}: {formatZAR(o.amount)} for <Link href={`/admin/products/${p.id}`}>{p.brand} {p.model}</Link> <span className="small muted">(listed {formatZAR(p.price)}, {p.status})</span></strong>
              <StatusBadge status={o.status} text={label(OFFER_STATUS, o.status)} />
            </div>
            <div className="small">{o.name} · {o.email} · {o.phone ?? 'no phone'} · {formatDateTime(o.created_at)}</div>
            {o.message ? <p className="small" style={{ margin: 0, whiteSpace: 'pre-line' }}>“{o.message}”</p> : null}
            <div className="row">
              <WhatsAppTo phone={o.phone} message={`Hi ${o.name}, thanks for your offer of ${formatZAR(o.amount)} on the ${p.brand} ${p.model} (${o.ref}). `} />
              <MailTo email={o.email} subject={`Your offer ${o.ref} — ${p.brand} ${p.model}`} />
            </div>
            <form action={saveNotes} className="row">
              <input type="hidden" name="entity" value="offers" /><input type="hidden" name="id" value={o.id} /><input type="hidden" name="back" value="/admin/offers" />
              <label className="small" htmlFor={`ca-${o.id}`}>Counter-offer (R)</label>
              <input id={`ca-${o.id}`} name="counter_amount" inputMode="decimal" defaultValue={o.counter_amount ?? ''} style={{ maxWidth: 140 }} />
              <label className="visually-hidden" htmlFor={`on-${o.id}`}>Notes</label>
              <input id={`on-${o.id}`} name="admin_notes" placeholder="Private notes" defaultValue={o.admin_notes} style={{ maxWidth: 280 }} />
              <SubmitButton className="btn btn-outline btn-small">Save</SubmitButton>
            </form>
            <StatusForm entity="offers" id={o.id} current={o.status} options={OFFER_STATUS} back="/admin/offers" />
          </section>
        );
      }) : <p className="muted">No {open ? 'open' : 'closed'} offers.</p>}
    </>
  );
}
