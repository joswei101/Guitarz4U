import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { REPAIR_STATUS, label } from '@/lib/labels';

export default async function RepairsList() {
  const { user } = await requireUser('/account/repairs');
  const supabase = await createClient();
  const { data } = await supabase.from('repairs').select('id, ref, brand, model, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
  return (
    <div className="stack">
      <h1>Repairs</h1>
      {data?.length ? (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Ref</th><th>Guitar</th><th>Status</th><th>Requested</th></tr></thead>
          <tbody>{data.map((r) => (
            <tr key={r.id}><td><Link href={`/account/repairs/${r.id}`}>{r.ref}</Link></td><td>{r.brand} {r.model}</td>
              <td><StatusBadge status={r.status} text={label(REPAIR_STATUS, r.status)} /></td><td>{formatDate(r.created_at)}</td></tr>
          ))}</tbody>
        </table></div>
      ) : <div className="empty-state"><h2>No repairs yet</h2><Link href="/repairs" className="btn btn-primary">Request a repair</Link></div>}
    </div>
  );
}
