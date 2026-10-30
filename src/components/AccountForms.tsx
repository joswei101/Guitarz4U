'use client';
import { useActionState } from 'react';
import { changeEmail, deleteAccount, updateProfile } from '@/app/actions/account';
import { updatePassword } from '@/app/actions/auth';
import { initialState } from '@/lib/action-state';
import { CONTACT_METHODS } from '@/lib/labels';
import { FieldError, FormMessage, SubmitButton, errProps } from '@/components/forms';
import type { Profile } from '@/lib/auth';

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfile, initialState);
  return (
    <form action={action} className="card stack" noValidate>
      <h2 style={{ fontSize: '1.2rem' }}>Your details</h2>
      <FormMessage state={state} />
      <div className="form-grid">
        <div className="field"><label htmlFor="p-name">Full name</label>
          <input id="p-name" name="full_name" autoComplete="name" defaultValue={profile.full_name ?? ''} {...errProps(state, 'full_name')} /><FieldError state={state} name="full_name" /></div>
        <div className="field"><label htmlFor="p-wa">WhatsApp number</label>
          <input id="p-wa" name="whatsapp" type="tel" autoComplete="tel" defaultValue={profile.whatsapp ?? ''} {...errProps(state, 'whatsapp')} /><FieldError state={state} name="whatsapp" /></div>
        <div className="field"><label htmlFor="p-pref">Preferred contact</label>
          <select id="p-pref" name="preferred_contact" defaultValue={profile.preferred_contact}>
            {Object.entries(CONTACT_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></div>
      </div>
      <fieldset>
        <legend>Notifications</legend>
        <label className="check"><input type="checkbox" name="notify_email" defaultChecked={profile.notify_email} /> Email me updates about my reservations, enquiries, submissions and repairs</label>
        <label className="check"><input type="checkbox" name="notify_stock_alerts" defaultChecked={profile.notify_stock_alerts} /> Allow stock alert emails I&apos;ve signed up for</label>
        <p className="small muted">Updates always appear in your account notifications, even if emails are switched off.</p>
      </fieldset>
      <div><SubmitButton>Save changes</SubmitButton></div>
    </form>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, action] = useActionState(changeEmail, initialState);
  return (
    <form action={action} className="card stack" noValidate>
      <h2 style={{ fontSize: '1.2rem' }}>Login email</h2>
      <FormMessage state={state} />
      <p className="small muted">Current: {current}</p>
      <div className="field"><label htmlFor="ce-email">New email address</label>
        <input id="ce-email" name="email" type="email" autoComplete="email" required {...errProps(state, 'email')} /><FieldError state={state} name="email" /></div>
      <div><SubmitButton className="btn btn-outline">Change email</SubmitButton></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="card stack" noValidate>
      <h2 style={{ fontSize: '1.2rem' }}>Change password</h2>
      <FormMessage state={state} />
      <div className="form-grid">
        <div className="field"><label htmlFor="cp-pass">New password</label>
          <input id="cp-pass" name="password" type="password" autoComplete="new-password" minLength={8} required {...errProps(state, 'password')} /><FieldError state={state} name="password" /></div>
        <div className="field"><label htmlFor="cp-confirm">Confirm new password</label>
          <input id="cp-confirm" name="confirm" type="password" autoComplete="new-password" required {...errProps(state, 'confirm')} /><FieldError state={state} name="confirm" /></div>
      </div>
      <div><SubmitButton className="btn btn-outline">Change password</SubmitButton></div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, initialState);
  return (
    <form action={action} className="stack" noValidate onSubmit={(e) => { if (!window.confirm('Permanently delete your account? This cannot be undone.')) e.preventDefault(); }}>
      <FormMessage state={state} />
      <div className="field"><label htmlFor="del-confirm">Type DELETE to confirm</label>
        <input id="del-confirm" name="confirm_text" autoComplete="off" required /></div>
      <div><SubmitButton className="btn btn-danger" pendingText="Deleting…">Delete my account</SubmitButton></div>
    </form>
  );
}
