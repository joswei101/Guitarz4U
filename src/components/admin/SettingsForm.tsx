'use client';
import { useActionState } from 'react';
import { saveSettings } from '@/app/actions/admin-site';
import { initialState } from '@/lib/action-state';
import { FieldError, FormMessage, SubmitButton, errProps } from '@/components/forms';
import type { Database } from '@/lib/database.types';

type S = Database['public']['Tables']['settings']['Row'];

export function SettingsForm({ settings: s }: { settings: S }) {
  const [state, action] = useActionState(saveSettings, initialState);
  const f = (name: keyof S, labelText: string, hint?: string, type = 'text') => (
    <div className="field"><label htmlFor={`set-${name}`}>{labelText}{hint ? <span className="hint"> {hint}</span> : null}</label>
      <input id={`set-${name}`} name={name} type={type} defaultValue={state.values?.[name] ?? String(s[name] ?? '')} {...errProps(state, name)} />
      <FieldError state={state} name={name} /></div>
  );
  return (
    <form action={action} className="card stack" noValidate>
      <FormMessage state={state} />
      <fieldset><legend>Contact details (shown on the website)</legend><div className="form-grid">
        {f('contact_email', 'Contact email', undefined, 'email')}
        {f('whatsapp_display', 'WhatsApp number (as displayed)')}
        {f('whatsapp_international', 'WhatsApp for links', '(digits, e.g. 27648567019)')}
        {f('social_handle', 'Social media handle')}
        {f('collection_area', 'Collection area (general only — never a street address)')}
      </div></fieldset>
      <fieldset><legend>Notifications</legend><div className="form-grid">
        {f('owner_notification_email', 'Send owner notifications to', undefined, 'email')}
      </div></fieldset>
      <fieldset><legend>Reservations</legend><div className="form-grid">
        {f('reservation_hours', 'Reservation length (hours)', undefined, 'number')}
        {f('max_active_reservations_per_customer', 'Max active reservations per customer', undefined, 'number')}
      </div></fieldset>
      <fieldset><legend>Repair warranty</legend>
        <div className="form-grid">
          {f('repair_warranty_days', 'Warranty period (days)', '— leave empty until decided; 0 = no extra warranty', 'number')}
        </div>
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="set-wt">Extra warranty terms / exclusions (shown in the repair terms)</label>
          <textarea id="set-wt" name="repair_warranty_terms" defaultValue={s.repair_warranty_terms} /></div>
      </fieldset>
      <fieldset><legend>Website</legend>
        <div className="field"><label htmlFor="set-notice">Notice bar at the top of every page <span className="hint">(optional, e.g. &quot;Away until 5 Jan — replies may be slower&quot;)</span></label>
          <input id="set-notice" name="shop_notice" defaultValue={s.shop_notice} /></div>
        <label className="check" style={{ marginTop: 10 }}><input type="checkbox" name="legal_reviewed" defaultChecked={s.legal_reviewed} /> My policies have been reviewed (by me and, ideally, a legal professional)</label>
      </fieldset>
      <div><SubmitButton>Save settings</SubmitButton></div>
    </form>
  );
}
