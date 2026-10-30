'use client';
import { useActionState } from 'react';
import { saveContent } from '@/app/actions/admin-site';
import { initialState } from '@/lib/action-state';
import { FormMessage, SubmitButton } from '@/components/forms';

export function ContentEditor({ block }: { block: { key: string; title: string; body: string; is_legal: boolean; is_draft: boolean } }) {
  const [state, action] = useActionState(saveContent, initialState);
  return (
    <form action={action} className="card stack">
      <FormMessage state={state} />
      <input type="hidden" name="key" value={block.key} />
      <div className="field"><label htmlFor="ct">Title</label><input id="ct" name="title" defaultValue={block.title} required /></div>
      <div className="field"><label htmlFor="cb">Text (Markdown)</label>
        <textarea id="cb" name="body" defaultValue={block.body} rows={24} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.9rem' }} /></div>
      {block.is_legal ? (
        <label className="check"><input type="checkbox" name="reviewed" defaultChecked={!block.is_draft} />
          <span>This policy has been reviewed and approved (removes the &quot;Draft&quot; banner). Only tick this after checking it — ideally with a legal professional.</span></label>
      ) : null}
      <div><SubmitButton>Save</SubmitButton></div>
    </form>
  );
}
