'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { submitSellerEnquiry } from '@/app/actions/submissions';
import { initialState } from '@/lib/action-state';
import { CATEGORIES, CONTACT_METHODS, SELLER_CONDITIONS } from '@/lib/labels';
import { FieldError, FormMessage, GuardFields, SubmitButton, errProps, val } from '@/components/forms';
import { FilePicker, type PreparedFile } from '@/components/FilePicker';
import { useUploadsAfterSubmit } from '@/components/useUploads';

export function SellerForm({ defaults }: { defaults: { name?: string; email?: string; whatsapp?: string } }) {
  const [state, action] = useActionState(submitSellerEnquiry, initialState);
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [giveaway, setGiveaway] = useState(false);
  const uploadStatus = useUploadsAfterSubmit(state, files);

  if (state.ok) {
    return (
      <div className="card" role="status">
        <h2>Submission received</h2>
        <p>{state.message}</p>
        {uploadStatus ? <p className="alert alert-info">{uploadStatus}</p> : null}
        <div className="row"><Link className="btn btn-primary" href="/account/selling">Track in my account</Link><Link className="btn btn-outline" href="/">Back to home</Link></div>
      </div>
    );
  }

  const v = (n: string, d = '') => val(state, n, d);
  return (
    <form action={action} className="card stack" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="files_meta" value={JSON.stringify(files.map(({ name, type, size }) => ({ name, type, size })))} />
      <GuardFields />
      <fieldset>
        <legend>Your details</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="s-name">Your name <span className="req">*</span></label>
            <input id="s-name" name="name" autoComplete="name" required defaultValue={v('name', defaults.name)} {...errProps(state, 'name')} /><FieldError state={state} name="name" /></div>
          <div className="field"><label htmlFor="s-email">Email <span className="req">*</span></label>
            <input id="s-email" name="email" type="email" autoComplete="email" required defaultValue={v('email', defaults.email)} {...errProps(state, 'email')} /><FieldError state={state} name="email" /></div>
          <div className="field"><label htmlFor="s-wa">WhatsApp number <span className="req">*</span></label>
            <input id="s-wa" name="whatsapp" type="tel" autoComplete="tel" required placeholder="e.g. 082 123 4567" defaultValue={v('whatsapp', defaults.whatsapp)} {...errProps(state, 'whatsapp')} /><FieldError state={state} name="whatsapp" /></div>
          <div className="field"><label htmlFor="s-suburb">Suburb / area <span className="req">*</span></label>
            <input id="s-suburb" name="suburb" required placeholder="e.g. Sandringham" defaultValue={v('suburb')} {...errProps(state, 'suburb')} /><FieldError state={state} name="suburb" /></div>
          <div className="field"><label htmlFor="s-pref">Preferred contact method</label>
            <select id="s-pref" name="preferred_contact" defaultValue={v('preferred_contact', 'whatsapp')}>
              {Object.entries(CONTACT_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Your guitar</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="s-brand">Brand <span className="req">*</span></label>
            <input id="s-brand" name="brand" required placeholder="e.g. Yamaha" defaultValue={v('brand')} {...errProps(state, 'brand')} /><FieldError state={state} name="brand" /></div>
          <div className="field"><label htmlFor="s-model">Model <span className="req">*</span></label>
            <input id="s-model" name="model" required placeholder="e.g. C40 or 'not sure'" defaultValue={v('model')} {...errProps(state, 'model')} /><FieldError state={state} name="model" /></div>
          <div className="field"><label htmlFor="s-cat">Type</label>
            <select id="s-cat" name="category" defaultValue={v('category')}>
              <option value="">Not sure</option>
              {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l.replace(' guitars', '')}</option>)}
              <option value="other">Other guitar</option>
            </select></div>
          <div className="field"><label htmlFor="s-cond">Condition <span className="req">*</span></label>
            <select id="s-cond" name="condition" required defaultValue={v('condition')} {...errProps(state, 'condition')}>
              <option value="">Choose…</option>
              {Object.entries(SELLER_CONDITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select><FieldError state={state} name="condition" /></div>
          <div className="field field-full"><label htmlFor="s-faults">Describe any faults or damage</label>
            <textarea id="s-faults" name="faults" placeholder="e.g. cracked headstock, one tuner missing, electronics crackle" defaultValue={v('faults')} /></div>
          <div className="field field-full">
            <label className="check"><input type="checkbox" name="is_giveaway" checked={giveaway} onChange={(e) => setGiveaway(e.target.checked)} />
              I&apos;d like to give this guitar away free of charge</label>
          </div>
          {!giveaway ? (
            <div className="field"><label htmlFor="s-price">Your asking price (R) <span className="hint">optional</span></label>
              <input id="s-price" name="asking_price" inputMode="decimal" placeholder="e.g. 2500" defaultValue={v('asking_price')} {...errProps(state, 'asking_price')} /><FieldError state={state} name="asking_price" /></div>
          ) : null}
          <div className="field"><label htmlFor="s-acc">Included accessories</label>
            <input id="s-acc" name="accessories" placeholder="e.g. gig bag, strap" defaultValue={v('accessories')} /></div>
          <div className="field field-full"><label htmlFor="s-notes">Anything else?</label>
            <textarea id="s-notes" name="notes" defaultValue={v('notes')} /></div>
          <FilePicker allowVideo={false} files={files} onChange={setFiles} id="s-files" />
        </div>
      </fieldset>
      <label className="check"><input type="checkbox" name="not_parts" required />
        <span>This is a complete or incomplete guitar, not loose parts on their own. <span className="req">*</span></span></label>
      <FieldError state={state} name="not_parts" />
      <label className="check"><input type="checkbox" name="consent" required />
        <span>I own this guitar (or may sell it) and agree to the <Link href="/legal/seller-terms" target="_blank">seller terms</Link> and <Link href="/legal/privacy" target="_blank">privacy policy</Link>. I understand the owner inspects the guitar before making any offer. <span className="req">*</span></span></label>
      <FieldError state={state} name="consent" />
      <div className="form-actions"><SubmitButton>Send my guitar details</SubmitButton></div>
    </form>
  );
}
