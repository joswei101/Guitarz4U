import { deleteFaq, saveFaq } from '@/app/actions/admin-site';
import { Flash } from '@/components/Flash';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function FaqsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff('content');
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('faqs').select('*').order('sort_order');
  const Form = ({ f }: { f?: NonNullable<typeof data>[number] }) => (
    <form action={saveFaq} className="card stack">
      {f ? <input type="hidden" name="id" value={f.id} /> : null}
      <div className="field"><label htmlFor={`fq-${f?.id ?? 'new'}`}>Question</label><input id={`fq-${f?.id ?? 'new'}`} name="question" defaultValue={f?.question} required /></div>
      <div className="field"><label htmlFor={`fa-${f?.id ?? 'new'}`}>Answer</label><textarea id={`fa-${f?.id ?? 'new'}`} name="answer" defaultValue={f?.answer} required /></div>
      <div className="row">
        <label htmlFor={`fo-${f?.id ?? 'new'}`}>Order</label><input id={`fo-${f?.id ?? 'new'}`} name="sort_order" type="number" defaultValue={f?.sort_order ?? ((data?.length ?? 0) + 1) * 10} style={{ maxWidth: 100 }} />
        <label className="check"><input type="checkbox" name="is_published" defaultChecked={f?.is_published ?? true} /> Published</label>
        <SubmitButton className="btn btn-outline btn-small">{f ? 'Save' : 'Add FAQ'}</SubmitButton>
      </div>
    </form>
  );
  return (
    <>
      <Flash ok={sp.ok} error={sp.error} />
      <h1>FAQs</h1>
      <p className="muted">Lower order numbers appear first. {'{{reservation_hours}}'} and other tokens are filled in from Settings.</p>
      {(data ?? []).map((f) => (
        <div key={f.id}>
          <Form f={f} />
          <form action={deleteFaq} style={{ marginTop: -8, marginBottom: 16, textAlign: 'right' }}><input type="hidden" name="id" value={f.id} /><ConfirmButton className="link-button" message="Delete this FAQ?">Delete</ConfirmButton></form>
        </div>
      ))}
      <h2 style={{ fontSize: '1.2rem' }}>Add a new FAQ</h2>
      <Form />
    </>
  );
}
