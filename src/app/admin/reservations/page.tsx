import Link from 'next/link';
import { reservationAction } from '@/app/actions/admin-catalogue';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { WhatsAppTo } from '@/components/admin/WhatsAppTo';
import { requireStaff } from '@/lib/auth';
import { expireReservations } from '@/lib/products';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatZAR } from '@/lib/format';
import { RESERVATION_STATUS, label } from '@/lib/labels';

export default async function ReservationsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('reservations');
  await expireReservations();
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: active }, { data: past }] = await Promise.all([
    supabase.from('reservations').select('*, products(id, brand, model, ref)').eq('status', 'active').order('expires_at'),
    supabase.from('reservations').select('*, products(id, brand, model, ref)').neq('status', 'active').order('updated_at', { ascending: false }).limit(50),
  ]);
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Reservations</h1>
      <p className="muted">Reservations expire automatically. Expiry is checked every 10 minutes and whenever the shop or dashboard is opened.</p>
      <h2 style={{ fontSize: '1.2rem' }}>Active</h2>
      {active?.length ? active.map((r) => {
        const p = r.products as unknown as { id: string; brand: string; model: string; ref: string };
        return (
          <section key={r.id} className="card stack">
            <div className="row-between">
              <strong>{r.ref} · <Link href={`/admin/products/${p.id}`}>{p.brand} {p.model}</Link> ({formatZAR(r.price_at_reservation)})</strong>
              <span className="badge badge-warn">Until {formatDateTime(r.expires_at)}</span>
            </div>
            <div className="small">{r.contact_name} · {r.contact_email ?? 'no email'} · {r.contact_phone ?? 'no phone'}{r.source === 'owner' ? ' · manual' : ''}</div>
            {r.message ? <p className="small" style={{ whiteSpace: 'pre-line', margin: 0 }}>“{r.message}”</p> : null}
            <div className="row">
              <WhatsAppTo phone={r.contact_phone} message={`Hi ${r.contact_name}, this is Guitarz4U about your reservation ${r.ref} for the ${p.brand} ${p.model}. `} />
              <form action={reservationAction} className="row">
                <input type="hidden" name="reservation_id" value={r.id} /><input type="hidden" name="action" value="extend" />
                <label className="visually-hidden" htmlFor={`h-${r.id}`}>Extend by hours</label>
                <select id={`h-${r.id}`} name="hours" defaultValue="24" style={{ width: 'auto' }}><option value="12">+12 h</option><option value="24">+24 h</option><option value="48">+48 h</option><option value="72">+72 h</option></select>
                <input type="hidden" name="notify" value="on" />
                <SubmitButton className="btn btn-outline btn-small">Extend</SubmitButton>
              </form>
              <form action={reservationAction}><input type="hidden" name="reservation_id" value={r.id} /><input type="hidden" name="action" value="convert" /><input type="hidden" name="notify" value="on" />
                <ConfirmButton className="btn btn-dark btn-small" message="Complete this sale? The guitar will be marked SOLD. Make sure payment has been confirmed.">Complete sale (mark sold)</ConfirmButton></form>
              <form action={reservationAction}><input type="hidden" name="reservation_id" value={r.id} /><input type="hidden" name="action" value="cancel" /><input type="hidden" name="notify" value="on" />
                <ConfirmButton message="Cancel this reservation and make the guitar available again? The customer will be notified.">Cancel</ConfirmButton></form>
            </div>
          </section>
        );
      }) : <p className="muted">No active reservations.</p>}
      <h2 style={{ fontSize: '1.2rem' }}>History</h2>
      {past?.length ? (
        <div className="table-wrap"><table className="data"><thead><tr><th>Ref</th><th>Guitar</th><th>Customer</th><th>Status</th><th>Closed</th></tr></thead>
          <tbody>{past.map((r) => { const p = r.products as unknown as { id: string; brand: string; model: string }; return (
            <tr key={r.id}><td>{r.ref}</td><td><Link href={`/admin/products/${p.id}`}>{p.brand} {p.model}</Link></td><td>{r.contact_name}</td>
              <td><StatusBadge status={r.status} text={label(RESERVATION_STATUS, r.status)} /></td><td>{formatDateTime(r.closed_at)}</td></tr>); })}</tbody>
        </table></div>
      ) : <p className="muted">No past reservations.</p>}
    </>
  );
}
