'use client';
import { useActionState, useRef, useState } from 'react';
import { createProduct, updateProduct } from '@/app/actions/admin-catalogue';
import { initialState } from '@/lib/action-state';
import { CATEGORIES, CATEGORY_SINGULAR, CONDITIONS, type Category } from '@/lib/labels';
import { FieldError, FormMessage, SubmitButton, errProps } from '@/components/forms';

export type ProductInitial = Partial<Record<
  'id' | 'brand' | 'model' | 'category' | 'condition' | 'price' | 'description' | 'defects' | 'public_serial' |
  'serial_number' | 'provenance' | 'accessories' | 'year_made' | 'acquired_from' | 'acquisition_cost' | 'internal_notes', string>> & {
  is_featured?: boolean; is_new_arrival?: boolean; description_approved?: boolean;
};

/** Builds a plain first draft from the details already entered — no paid AI service needed. */
function draftDescription(f: Record<string, string>) {
  const type = CATEGORY_SINGULAR[f.category as Category]?.toLowerCase() ?? 'guitar';
  const cond = CONDITIONS[f.condition as keyof typeof CONDITIONS]?.toLowerCase() ?? 'used';
  const parts = [
    `A second-hand ${f.brand} ${f.model}${f.year_made ? ` (${f.year_made})` : ''} ${type} in ${cond} condition.`,
    f.accessories ? `Comes with: ${f.accessories}.` : 'Sold as the guitar only.',
    'It has been checked by Guitarz4U before listing. Please see the photos and the list of known defects below, and feel free to ask any questions or arrange to see it on collection in Sandringham, Johannesburg.',
  ];
  return parts.join('\n\n');
}

function aiPrompt(f: Record<string, string>) {
  return `Write an honest, friendly product description (80–150 words, South African English) for a second-hand guitar listing. Do not exaggerate or invent features, history or specifications that are not listed here. Mention the defects plainly.

Brand: ${f.brand}
Model: ${f.model}
Type: ${CATEGORY_SINGULAR[f.category as Category] ?? ''}
Year: ${f.year_made || 'unknown'}
Condition: ${CONDITIONS[f.condition as keyof typeof CONDITIONS] ?? ''}
Known defects: ${f.defects || 'none noted'}
Included accessories: ${f.accessories || 'none'}
Notes: ${f.provenance || ''}`;
}

export function ProductForm({ initial }: { initial: ProductInitial }) {
  const editing = Boolean(initial.id);
  const [state, action] = useActionState(editing ? updateProduct : createProduct, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const v = (k: keyof ProductInitial) => state.values?.[k] ?? (initial[k] as string | undefined) ?? '';
  const fields = () => Object.fromEntries(new FormData(formRef.current!).entries()) as Record<string, string>;

  return (
    <form ref={formRef} action={action} className="card stack" noValidate>
      <FormMessage state={state} />
      {editing ? <input type="hidden" name="id" value={initial.id} /> : null}
      <fieldset>
        <legend>The guitar</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="pf-brand">Brand <span className="req">*</span></label>
            <input id="pf-brand" name="brand" required defaultValue={v('brand')} {...errProps(state, 'brand')} /><FieldError state={state} name="brand" /></div>
          <div className="field"><label htmlFor="pf-model">Model <span className="req">*</span></label>
            <input id="pf-model" name="model" required defaultValue={v('model')} {...errProps(state, 'model')} /><FieldError state={state} name="model" /></div>
          <div className="field"><label htmlFor="pf-cat">Category <span className="req">*</span></label>
            <select id="pf-cat" name="category" required defaultValue={v('category')} {...errProps(state, 'category')}>
              <option value="">Choose…</option>
              {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select><FieldError state={state} name="category" /></div>
          <div className="field"><label htmlFor="pf-cond">Condition <span className="req">*</span></label>
            <select id="pf-cond" name="condition" required defaultValue={v('condition')} {...errProps(state, 'condition')}>
              <option value="">Choose…</option>
              {Object.entries(CONDITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select><FieldError state={state} name="condition" /></div>
          <div className="field"><label htmlFor="pf-price">Price (R) <span className="req">*</span></label>
            <input id="pf-price" name="price" inputMode="decimal" required defaultValue={v('price')} {...errProps(state, 'price')} /><FieldError state={state} name="price" /></div>
          <div className="field"><label htmlFor="pf-year">Year made <span className="hint">(if known)</span></label>
            <input id="pf-year" name="year_made" defaultValue={v('year_made')} /></div>
          <div className="field field-full"><label htmlFor="pf-acc">Included accessories</label>
            <input id="pf-acc" name="accessories" placeholder="e.g. hard case, strap, cable" defaultValue={v('accessories')} /></div>
          <div className="field field-full"><label htmlFor="pf-def">Known defects and damage <span className="hint">(shown to buyers — be specific)</span></label>
            <textarea id="pf-def" name="defects" defaultValue={v('defects')} /></div>
          <div className="field field-full"><label htmlFor="pf-prov">History / provenance <span className="hint">(optional, public)</span></label>
            <textarea id="pf-prov" name="provenance" defaultValue={v('provenance')} /></div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Description</legend>
        <div className="field">
          <label htmlFor="pf-desc">Public description</label>
          <textarea id="pf-desc" ref={descRef} name="description" rows={8} defaultValue={v('description')} />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-outline btn-small" onClick={() => { if (descRef.current && (!descRef.current.value || window.confirm('Replace the current description with a simple draft?'))) descRef.current.value = draftDescription(fields()); }}>
            Write a simple draft for me
          </button>
          <button type="button" className="btn btn-outline btn-small" onClick={async () => { await navigator.clipboard.writeText(aiPrompt(fields())); setCopied(true); }}>
            {copied ? 'Prompt copied ✓' : 'Copy prompt for a free AI chat'}
          </button>
        </div>
        <p className="small muted">Optional: paste the copied prompt into a free AI chat (e.g. Claude or ChatGPT), check the result carefully for accuracy, then paste it above. Nothing is sent anywhere automatically.</p>
        <label className="check"><input type="checkbox" name="description_approved" defaultChecked={initial.description_approved} />
          <span><strong>I have checked and approve this description</strong> (required before publishing).</span></label>
      </fieldset>
      <fieldset>
        <legend>Shop display</legend>
        <label className="check"><input type="checkbox" name="is_featured" defaultChecked={initial.is_featured} /> Featured (shown in the homepage hero)</label>
        <label className="check"><input type="checkbox" name="is_new_arrival" defaultChecked={initial.is_new_arrival ?? !editing} /> Mark as a new arrival</label>
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="pf-pser">Serial number to show publicly <span className="hint">(leave empty to keep it private)</span></label>
          <input id="pf-pser" name="public_serial" defaultValue={v('public_serial')} /></div>
      </fieldset>
      <fieldset>
        <legend>Private records (never shown publicly)</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="pf-ser">Serial number</label><input id="pf-ser" name="serial_number" defaultValue={v('serial_number')} /></div>
          <div className="field"><label htmlFor="pf-from">Acquired from</label><input id="pf-from" name="acquired_from" defaultValue={v('acquired_from')} /></div>
          <div className="field"><label htmlFor="pf-cost">What you paid (R)</label><input id="pf-cost" name="acquisition_cost" inputMode="decimal" defaultValue={v('acquisition_cost')} {...errProps(state, 'acquisition_cost')} /><FieldError state={state} name="acquisition_cost" /></div>
          <div className="field field-full"><label htmlFor="pf-notes">Internal notes</label><textarea id="pf-notes" name="internal_notes" defaultValue={v('internal_notes')} /></div>
        </div>
      </fieldset>
      <div className="form-actions"><SubmitButton pendingText="Saving…">{editing ? 'Save changes' : 'Save draft'}</SubmitButton></div>
    </form>
  );
}
