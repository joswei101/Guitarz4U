import { deleteAlert, setAlertActive } from '@/app/actions/account';
import { StockAlertForm } from '@/components/PublicForms';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { Flash } from '@/components/Flash';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES, label } from '@/lib/labels';
import { formatZAR } from '@/lib/format';

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { user } = await requireUser('/account/alerts');
  const supabase = await createClient();
  const { data } = await supabase.from('stock_alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  return (
    <div className="stack">
      <h1>Stock alerts</h1>
      <Flash ok={sp.ok} error={sp.error} />
      {data?.length ? (
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Looking for</th><th>Status</th><th /></tr></thead>
          <tbody>{data.map((a) => (
            <tr key={a.id}>
              <td>{a.category ? label(CATEGORIES, a.category) : 'Any guitar'}{a.brand ? ` · ${a.brand}` : ''}{a.max_price ? ` · up to ${formatZAR(a.max_price)}` : ''}</td>
              <td>{a.is_active ? 'Active' : 'Paused'}</td>
              <td className="row">
                <form action={setAlertActive}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="active" value={a.is_active ? 'false' : 'true'} />
                  <SubmitButton className="btn btn-outline btn-small">{a.is_active ? 'Pause' : 'Resume'}</SubmitButton></form>
                <form action={deleteAlert}><input type="hidden" name="id" value={a.id} /><ConfirmButton message="Delete this alert?">Delete</ConfirmButton></form>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="muted">No stock alerts yet.</p>}
      <div className="card"><h2 style={{ fontSize: '1.15rem' }}>Add an alert</h2><StockAlertForm defaults={{ email: user.email ?? undefined }} /></div>
    </div>
  );
}
