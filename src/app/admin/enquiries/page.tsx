import Link from 'next/link';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { ENQUIRY_STATUS, label } from '@/lib/labels';

export default async function EnquiriesAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('enquiries');
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('enquiries').select('id, ref, name, email, status, created_at, enquiry_items(product_label)').order('created_at', { ascending: false }).limit(200);
  if (sp.status && sp.status in ENQUIRY_STATUS) q = q.eq('status', sp.status);
  const { data } = await q;
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Purchase enquiries</h1>
      <p className="muted">Enquiries from the enquiry cart. These are not sales or payments.</p>
      <nav className="tabs"><Link href="/admin/enquiries" aria-current={!sp.status ? 'page' : undefined}>All</Link>
        {Object.entries(ENQUIRY_STATUS).map(([k, l]) => <Link key={k} href={`/admin/enquiries?status=${k}`} aria-current={sp.status === k ? 'page' : undefined}>{l}</Link>)}</nav>
      {data?.length ? (
        <div className="table-wrap"><table className="data"><thead><tr><th>Ref</th><th>Customer</th><th>Guitars</th><th>Status</th><th>Received</th></tr></thead>
          <tbody>{data.map((e) => (
            <tr key={e.id}><td><Link href={`/admin/enquiries/${e.id}`}>{e.ref}</Link></td><td>{e.name}<div className="small muted">{e.email}</div></td>
              <td className="small">{(e.enquiry_items ?? []).map((i) => i.product_label).join(', ')}</td>
              <td><StatusBadge status={e.status} text={label(ENQUIRY_STATUS, e.status)} /></td><td>{formatDateTime(e.created_at)}</td></tr>
          ))}</tbody></table></div>
      ) : <p className="muted">No enquiries.</p>}
    </>
  );
}
