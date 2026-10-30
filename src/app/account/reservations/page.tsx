import Link from 'next/link';
import { cancelMyReservation } from '@/app/actions/public';
import { ConfirmButton } from '@/components/forms';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { requireUser } from '@/lib/auth';
import { expireReservations } from '@/lib/products';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatZAR } from '@/lib/format';
import { RESERVATION_STATUS, label } from '@/lib/labels';

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await expireReservations();
  const sp = await searchParams;
  const { user } = await requireUser('/account/reservations');
  const supabase = await createClient();
  const { data } = await supabase.from('reservations')
    .select('id, ref, status, expires_at, created_at, closed_at, price_at_reservation, products(brand, model, slug)')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  return (
    <div className="stack">
      <h1>Reservations</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <p className="muted">A reservation holds a guitar for you for a limited time. It is not a payment. The owner will contact you to arrange payment and collection.</p>
      {data?.length ? (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Ref</th><th>Guitar</th><th>Status</th><th>Held until</th><th className="num">Price</th><th /></tr></thead>
          <tbody>
            {data.map((r) => {
              const p = r.products as unknown as { brand: string; model: string; slug: string } | null;
              return (
                <tr key={r.id}>
                  <td>{r.ref}</td>
                  <td>{p ? <Link href={`/shop/${p.slug}`}>{p.brand} {p.model}</Link> : '—'}</td>
                  <td><StatusBadge status={r.status} text={label(RESERVATION_STATUS, r.status)} /></td>
                  <td>{r.status === 'active' ? formatDateTime(r.expires_at) : formatDateTime(r.closed_at)}</td>
                  <td className="num">{formatZAR(r.price_at_reservation)}</td>
                  <td>{r.status === 'active' ? (
                    <form action={cancelMyReservation}>
                      <input type="hidden" name="reservation_id" value={r.id} />
                      <ConfirmButton message="Cancel this reservation? The guitar will become available to other customers.">Cancel</ConfirmButton>
                    </form>
                  ) : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      ) : <div className="empty-state"><h2>No reservations</h2><p>You can reserve an available guitar from its page.</p><Link className="btn btn-primary" href="/shop">Browse guitars</Link></div>}
    </div>
  );
}
