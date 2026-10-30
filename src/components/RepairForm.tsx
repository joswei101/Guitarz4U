'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { submitRepairRequest } from '@/app/actions/submissions';
import { initialState } from '@/lib/action-state';
import { CONTACT_METHODS, REPAIR_SERVICES } from '@/lib/labels';
import { FieldError, FormMessage, GuardFields, SubmitButton, errProps, val } from '@/components/forms';
import { FilePicker, type PreparedFile } from '@/components/FilePicker';
import { useUploadsAfterSubmit } from '@/components/useUploads';

export function RepairForm({ defaults, preselect }: { defaults: { name?: string; email?: string; whatsapp?: string }; preselect?: string }) {
  const [state, action] = useActionState(submitRepairRequest, initialState);
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const uploadStatus = useUploadsAfterSubmit(state, files);
  const today = new Date().toISOString().slice(0, 10);

  if (state.ok) {
    return (
      <div className="card" role="status">
        <h2>Repair request received</h2>
        <p>{state.message}</p>
        {uploadStatus ? <p className="alert alert-info">{uploadStatus}</p> : null}
        <div className="row"><Link className="btn btn-primary" href="/account/repairs">Track my repair</Link><Link className="btn btn-outline" href="/">Back to home</Link></div>
      </div>
    );
  }
  const v = (n: string, d = '') => val(state, n, d);
  const chosen = (state.values?.services ?? preselect ?? '').split(',');
  return (
    <form action={action} className="card stack" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="files_meta" value={JSON.stringify(files.map(({ name, type, size }) => ({ name, type, size })))} />
      <GuardFields />
      <fieldset>
        <legend>Your details</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="r-name">Your name <span className="req">*</span></label>
            <input id="r-name" name="name" autoComplete="name" required defaultValue={v('name', defaults.name)} {...errProps(state, 'name')} /><FieldError state={state} name="name" /></div>
          <div className="field"><label htmlFor="r-email">Email <span className="req">*</span></label>
            <input id="r-email" name="email" type="email" autoComplete="email" required defaultValue={v('email', defaults.email)} {...errProps(state, 'email')} /><FieldError state={state} name="email" /></div>
          <div className="field"><label htmlFor="r-wa">WhatsApp number</label>
            <input id="r-wa" name="whatsapp" type="tel" autoComplete="tel" defaultValue={v('whatsapp', defaults.whatsapp)} {...errProps(state, 'whatsapp')} /><FieldError state={state} name="whatsapp" /></div>
          <div className="field"><label htmlFor="r-pref">Preferred contact method</label>
            <select id="r-pref" name="preferred_contact" defaultValue={v('preferred_contact', 'whatsapp')}>
              {Object.entries(CONTACT_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></div>
        </div>
      </fieldset>
      <fieldset>
        <legend>Your guitar and the problem</legend>
        <div className="form-grid">
          <div className="field"><label htmlFor="r-brand">Brand <span className="req">*</span></label>
            <input id="r-brand" name="brand" required defaultValue={v('brand')} {...errProps(state, 'brand')} /><FieldError state={state} name="brand" /></div>
          <div className="field"><label htmlFor="r-model">Model <span className="req">*</span></label>
            <input id="r-model" name="model" required defaultValue={v('model')} {...errProps(state, 'model')} /><FieldError state={state} name="model" /></div>
          <div className="field field-full"><label htmlFor="r-problem">Describe the problem <span className="req">*</span></label>
            <textarea id="r-problem" name="problem" required placeholder="What's wrong? When did it start? Anything you've tried?" defaultValue={v('problem')} {...errProps(state, 'problem')} /><FieldError state={state} name="problem" /></div>
          <fieldset className="field-full">
            <legend>Services you think you need <span className="hint">(optional)</span></legend>
            <div className="check-grid">
              {Object.entries(REPAIR_SERVICES).map(([k, l]) => (
                <label key={k} className="check"><input type="checkbox" name="services" value={k} defaultChecked={chosen.includes(k)} />{l}</label>
              ))}
            </div>
          </fieldset>
          <div className="field"><label htmlFor="r-date">Preferred drop-off date <span className="hint">(optional — we&apos;ll confirm privately)</span></label>
            <input id="r-date" name="preferred_date" type="date" min={today} defaultValue={v('preferred_date')} {...errProps(state, 'preferred_date')} /><FieldError state={state} name="preferred_date" /></div>
          <FilePicker allowVideo files={files} onChange={setFiles} id="r-files" />
        </div>
      </fieldset>
      <label className="check"><input type="checkbox" name="consent" required />
        <span>I agree to the <Link href="/legal/repair-terms" target="_blank">repair terms</Link> and <Link href="/legal/privacy" target="_blank">privacy policy</Link>. I understand no work starts until I approve a quote. <span className="req">*</span></span></label>
      <FieldError state={state} name="consent" />
      <div className="form-actions"><SubmitButton>Send repair request</SubmitButton></div>
    </form>
  );
}
