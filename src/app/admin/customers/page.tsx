import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';

export default async function CustomersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('customers');
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('profiles').select('id, email, full_name, role, is_blocked, created_at').order('created_at', { ascending: false }).limit(300);
  const term = (sp.q ?? '').replace(/[^\w@.\s-]/g, '');
  if (term) q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  if (sp.role === 'staff') q = q.in('role', ['staff', 'owner']);
  const { data } = await q;
  return (
    <>
      <h1>Customers &amp; staff</h1>
      <nav className="tabs"><Link href="/admin/customers" aria-current={sp.role !== 'staff' ? 'page' : undefined}>Everyone</Link><Link href="/admin/customers?role=staff" aria-current={sp.role === 'staff' ? 'page' : undefined}>Owner &amp; staff</Link></nav>
      <form method="get" className="row"><label className="visually-hidden" htmlFor="cq">Search</label>
        <input id="cq" name="q" type="search" defaultValue={sp.q} placeholder="Name or email" style={{ maxWidth: 320 }} /><button className="btn btn-outline btn-small">Search</button></form>
      {data?.length ? (
        <div className="table-wrap"><table className="data"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>{data.map((p) => (
            <tr key={p.id}><td><Link href={`/admin/customers/${p.id}`}>{p.full_name || '(no name)'}</Link></td><td>{p.email}</td>
              <td>{p.role}{p.is_blocked ? <span className="badge badge-bad" style={{ marginLeft: 6 }}>Blocked</span> : null}</td><td>{formatDate(p.created_at)}</td></tr>
          ))}</tbody></table></div>
      ) : <p className="muted">No accounts found.</p>}
    </>
  );
}
