import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { REPAIR_STATUS, label } from '@/lib/labels';

export default async function RepairsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('repairs');
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('repairs').select('id, ref, name, brand, model, status, preferred_date, created_at').order('created_at', { ascending: false }).limit(200);
  if (sp.status && sp.status in REPAIR_STATUS) q = q.eq('status', sp.status);
  else if (!sp.status) q = q.not('status', 'in', '(collected,cancelled)');
  const { data } = await q;
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Repairs</h1>
      <nav className="tabs"><Link href="/admin/repairs" aria-current={!sp.status ? 'page' : undefined}>Open</Link>
        {Object.entries(REPAIR_STATUS).map(([k, l]) => <Link key={k} href={`/admin/repairs?status=${k}`} aria-current={sp.status === k ? 'page' : undefined}>{l}</Link>)}</nav>
      {data?.length ? (
        <div className="table-wrap"><table className="data"><thead><tr><th>Ref</th><th>Guitar</th><th>Customer</th><th>Status</th><th>Preferred date</th><th>Received</th></tr></thead>
          <tbody>{data.map((r) => (
            <tr key={r.id}><td><Link href={`/admin/repairs/${r.id}`}>{r.ref}</Link></td><td>{r.brand} {r.model}</td><td>{r.name}</td>
              <td><StatusBadge status={r.status} text={label(REPAIR_STATUS, r.status)} /></td><td>{formatDate(r.preferred_date)}</td><td>{formatDate(r.created_at)}</td></tr>
          ))}</tbody></table></div>
      ) : <p className="muted">Nothing here.</p>}
    </>
  );
}
