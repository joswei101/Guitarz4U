import Link from 'next/link';
import { saveNotes } from '@/app/actions/admin-ops';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { SubmitButton } from '@/components/forms';
import { MailTo, WhatsAppTo } from '@/components/admin/WhatsAppTo';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export default async function MessagesAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('enquiries');
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('messages').select('*, products(id, brand, model)').order('created_at', { ascending: false }).limit(100);
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>Messages &amp; product questions</h1>
      {data?.length ? data.map((m) => {
        const p = m.products as unknown as { id: string; brand: string; model: string } | null;
        return (
          <section key={m.id} className="card stack">
            <div className="row-between"><strong>{m.subject || (m.kind === 'product-question' ? 'Product question' : 'Message')}</strong>
              <StatusBadge status={m.status === 'new' ? 'new' : m.status === 'answered' ? 'approved' : 'muted'} text={m.status} /></div>
            <div className="small">{m.name} · {m.email} · {m.phone ?? 'no phone'} · {formatDateTime(m.created_at)}{p ? <> · about <Link href={`/admin/products/${p.id}`}>{p.brand} {p.model}</Link></> : null}</div>
            <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{m.body}</p>
            <div className="row">
              <WhatsAppTo phone={m.phone} message={`Hi ${m.name}, thanks for your message to Guitarz4U. `} />
              <MailTo email={m.email} subject={`Re: ${m.subject || 'your message to Guitarz4U'}`} />
            </div>
            <form action={saveNotes} className="row">
              <input type="hidden" name="entity" value="messages" /><input type="hidden" name="id" value={m.id} /><input type="hidden" name="back" value="/admin/messages" />
              <label className="visually-hidden" htmlFor={`ms-${m.id}`}>Status</label>
              <select id={`ms-${m.id}`} name="status" defaultValue={m.status} style={{ width: 'auto' }}><option value="new">New</option><option value="answered">Answered</option><option value="closed">Closed</option></select>
              <label className="visually-hidden" htmlFor={`mn-${m.id}`}>Notes</label>
              <input id={`mn-${m.id}`} name="admin_notes" defaultValue={m.admin_notes} placeholder="Private notes" style={{ maxWidth: 320 }} />
              <SubmitButton className="btn btn-outline btn-small">Save</SubmitButton>
            </form>
          </section>
        );
      }) : <p className="muted">No messages yet.</p>}
    </>
  );
}
