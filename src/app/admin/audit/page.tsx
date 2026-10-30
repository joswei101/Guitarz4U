import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export default async function AuditAdmin({ searchParams }: { searchParams: Promise<{ table?: string; page?: string }> }) {
  await requireStaff('audit');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from('audit_log').select('*').order('id', { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (sp.table) q = q.eq('table_name', sp.table.replace(/[^a-z_]/g, ''));
  const { data } = await q;
  const actorIds = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean) as string[])];
  const { data: actors } = actorIds.length ? await supabase.from('profiles').select('id, email').in('id', actorIds) : { data: [] };
  const who = (id: string | null) => (id ? actors?.find((a) => a.id === id)?.email ?? 'User ' + id.slice(0, 8) : 'System / website form');
  const tables = ['products', 'reservations', 'enquiries', 'offers', 'seller_enquiries', 'repairs', 'repair_quotes', 'payments', 'reviews', 'profiles', 'settings', 'site_content'];
  return (
    <>
      <h1>Audit log</h1>
      <p className="muted">Every important change: who made it, what changed and when. Entries cannot be edited or deleted from the website.</p>
      <nav className="tabs"><Link href="/admin/audit" aria-current={!sp.table ? 'page' : undefined}>All</Link>{tables.map((t) => <Link key={t} href={`/admin/audit?table=${t}`} aria-current={sp.table === t ? 'page' : undefined}>{t}</Link>)}</nav>
      <div className="table-wrap"><table className="data"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Changes</th></tr></thead>
        <tbody>{(data ?? []).map((a) => (
          <tr key={a.id}><td className="small">{formatDateTime(a.created_at)}</td><td className="small">{who(a.actor_id)}</td><td>{a.action} {a.table_name}</td><td className="small">{a.record_id?.slice(0, 8)}</td>
            <td className="small"><details><summary>View</summary><pre style={{ whiteSpace: 'pre-wrap', maxWidth: 420, fontSize: '0.75rem' }}>{JSON.stringify(a.changes, null, 1).slice(0, 3000)}</pre></details></td></tr>
        ))}</tbody></table></div>
      <div className="row">{page > 1 ? <Link className="btn btn-outline btn-small" href={`/admin/audit?page=${page - 1}${sp.table ? `&table=${sp.table}` : ''}`}>Newer</Link> : null}
        {(data?.length ?? 0) === 50 ? <Link className="btn btn-outline btn-small" href={`/admin/audit?page=${page + 1}${sp.table ? `&table=${sp.table}` : ''}`}>Older</Link> : null}</div>
    </>
  );
}
