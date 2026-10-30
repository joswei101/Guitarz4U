import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatZAR } from '@/lib/format';
import { SELLER_CONDITIONS, SELLER_STATUS, label } from '@/lib/labels';

export default async function SellersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('sellers');
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('seller_enquiries').select('id, ref, name, suburb, brand, model, condition, is_giveaway, asking_price, status, created_at').order('created_at', { ascending: false }).limit(200);
  if (sp.status && sp.status in SELLER_STATUS) q = q.eq('status', sp.status);
  else if (!sp.status) q = q.not('status', 'in', '(completed,cancelled,offer-declined)');
  const { data } = await q;
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Seller enquiries</h1>
      <nav className="tabs"><Link href="/admin/sellers" aria-current={!sp.status ? 'page' : undefined}>Open</Link>
        {Object.entries(SELLER_STATUS).map(([k, l]) => <Link key={k} href={`/admin/sellers?status=${k}`} aria-current={sp.status === k ? 'page' : undefined}>{l}</Link>)}</nav>
      {data?.length ? (
        <div className="table-wrap"><table className="data"><thead><tr><th>Ref</th><th>Guitar</th><th>Seller</th><th>Price</th><th>Status</th><th>Received</th></tr></thead>
          <tbody>{data.map((s) => (
            <tr key={s.id}><td><Link href={`/admin/sellers/${s.id}`}>{s.ref}</Link></td><td>{s.brand} {s.model}<div className="small muted">{label(SELLER_CONDITIONS, s.condition)}</div></td>
              <td>{s.name}<div className="small muted">{s.suburb}</div></td><td>{s.is_giveaway ? 'Giveaway' : formatZAR(s.asking_price)}</td>
              <td><StatusBadge status={s.status} text={label(SELLER_STATUS, s.status)} /></td><td>{formatDate(s.created_at)}</td></tr>
          ))}</tbody></table></div>
      ) : <p className="muted">Nothing here.</p>}
    </>
  );
}
