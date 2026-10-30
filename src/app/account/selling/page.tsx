import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { SELLER_STATUS, label } from '@/lib/labels';

export default async function SellingList() {
  const { user } = await requireUser('/account/selling');
  const supabase = await createClient();
  const { data } = await supabase.from('seller_enquiries').select('id, ref, brand, model, status, is_giveaway, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  return (
    <div className="stack">
      <h1>Guitars you&apos;ve offered us</h1>
      {data?.length ? (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Ref</th><th>Guitar</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>{data.map((s) => (
            <tr key={s.id}><td><Link href={`/account/selling/${s.id}`}>{s.ref}</Link></td><td>{s.brand} {s.model}{s.is_giveaway ? ' (giveaway)' : ''}</td>
              <td><StatusBadge status={s.status} text={label(SELLER_STATUS, s.status)} /></td><td>{formatDate(s.created_at)}</td></tr>
          ))}</tbody>
        </table></div>
      ) : <div className="empty-state"><h2>Nothing submitted yet</h2><p>Want to sell or give away a guitar?</p><Link href="/sell" className="btn btn-primary">Submit a guitar</Link></div>}
    </div>
  );
}
