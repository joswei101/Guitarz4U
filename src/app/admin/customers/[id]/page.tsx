import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setAccess } from '@/app/actions/admin-site';
import { Flash } from '@/components/Flash';
import { ConfirmButton } from '@/components/forms';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { PERMISSIONS } from '@/lib/labels';

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile: me } = await requireStaff('customers');
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: p } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!p) notFound();
  const c = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [res, enq, sell, rep] = await Promise.all([
    c(supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('user_id', id)),
    c(supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('user_id', id)),
    c(supabase.from('seller_enquiries').select('id', { count: 'exact', head: true }).eq('user_id', id)),
    c(supabase.from('repairs').select('id', { count: 'exact', head: true }).eq('user_id', id)),
  ]);
  return (
    <>
      <p><Link href="/admin/customers">← Customers</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>{p.full_name || p.email}</h1>
      <section className="card">
        <p>{p.email}<br />WhatsApp: {p.whatsapp ?? '—'}<br />Joined {formatDate(p.created_at)}</p>
        <p className="small">Reservations: {res} · Purchase enquiries: {enq} · Seller submissions: {sell} · Repairs: {rep}</p>
      </section>
      {me.role === 'owner' ? (
        <form action={setAccess} className="card stack">
          <h2 style={{ fontSize: '1.15rem' }}>Access</h2>
          <input type="hidden" name="id" value={p.id} />
          <div className="field"><label htmlFor="role">Role</label>
            <select id="role" name="role" defaultValue={p.role} style={{ maxWidth: 260 }}>
              <option value="customer">Customer</option><option value="staff">Staff (limited permissions)</option><option value="owner">Owner (full access)</option>
            </select></div>
          <fieldset><legend>Staff permissions (only used for the Staff role)</legend>
            <div className="check-grid">{Object.entries(PERMISSIONS).map(([k, l]) => (
              <label key={k} className="check"><input type="checkbox" name="permissions" value={k} defaultChecked={p.permissions.includes(k)} />{l}</label>
            ))}</div>
          </fieldset>
          <label className="check"><input type="checkbox" name="is_blocked" defaultChecked={p.is_blocked} /> Block this account (cannot use account features)</label>
          <div><ConfirmButton className="btn btn-dark" message="Save these access changes?">Save access</ConfirmButton></div>
          <p className="small muted">Give staff only the permissions they need. Every change is recorded in the audit log.</p>
        </form>
      ) : <p className="muted">Only the owner can change roles and permissions.</p>}
    </>
  );
}
