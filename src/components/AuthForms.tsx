'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, resendConfirmation, signIn, signUp, updatePassword } from '@/app/actions/auth';
import { initialState } from '@/lib/action-state';
import { FieldError, FormMessage, GuardFields, SubmitButton, errProps, val } from '@/components/forms';

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initialState);
  return (
    <>
      <form action={action} className="stack" noValidate>
        <FormMessage state={state} />
        <GuardFields />
        <input type="hidden" name="next" value={next} />
        <div className="field"><label htmlFor="l-email">Email</label>
          <input id="l-email" name="email" type="email" autoComplete="email" required defaultValue={val(state, 'email')} {...errProps(state, 'email')} />
          <FieldError state={state} name="email" /></div>
        <div className="field"><label htmlFor="l-pass">Password</label>
          <input id="l-pass" name="password" type="password" autoComplete="current-password" required {...errProps(state, 'password')} />
          <FieldError state={state} name="password" /></div>
        <SubmitButton className="btn btn-primary btn-block" pendingText="Signing in…">Sign in</SubmitButton>
        <p className="small"><Link href="/auth/forgot-password">Forgotten your password?</Link></p>
      </form>
      {state.data?.unconfirmed ? <ResendForm email={state.values?.email} /> : null}
    </>
  );
}

export function ResendForm({ email }: { email?: string }) {
  const [state, action] = useActionState(resendConfirmation, initialState);
  return (
    <form action={action} className="stack card-plain" style={{ marginTop: 16 }} noValidate>
      <FormMessage state={state} />
      <GuardFields />
      <div className="field"><label htmlFor="rs-email">Resend confirmation email to</label>
        <input id="rs-email" name="email" type="email" required defaultValue={email} /></div>
      <SubmitButton className="btn btn-outline btn-small">Resend link</SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, initialState);
  if (state.ok) return <div role="status" className="alert alert-success">{state.message}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <FormMessage state={state} />
      <GuardFields />
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="g-name">Your name</label>
        <input id="g-name" name="full_name" autoComplete="name" required defaultValue={val(state, 'full_name')} {...errProps(state, 'full_name')} />
        <FieldError state={state} name="full_name" /></div>
      <div className="field"><label htmlFor="g-email">Email</label>
        <input id="g-email" name="email" type="email" autoComplete="email" required defaultValue={val(state, 'email')} {...errProps(state, 'email')} />
        <FieldError state={state} name="email" /></div>
      <div className="field"><label htmlFor="g-pass">Password <span className="hint">(at least 8 characters)</span></label>
        <input id="g-pass" name="password" type="password" autoComplete="new-password" minLength={8} required {...errProps(state, 'password')} />
        <FieldError state={state} name="password" /></div>
      <div className="field"><label htmlFor="g-confirm">Confirm password</label>
        <input id="g-confirm" name="confirm" type="password" autoComplete="new-password" required {...errProps(state, 'confirm')} />
        <FieldError state={state} name="confirm" /></div>
      <label className="check"><input type="checkbox" name="consent" required />
        <span>I agree to the <Link href="/legal/terms" target="_blank">terms</Link> and <Link href="/legal/privacy" target="_blank">privacy policy</Link>.</span></label>
      <FieldError state={state} name="consent" />
      <SubmitButton className="btn btn-primary btn-block" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, initialState);
  if (state.ok) return <div role="status" className="alert alert-success">{state.message}</div>;
  return (
    <form action={action} className="stack" noValidate>
      <FormMessage state={state} />
      <GuardFields />
      <div className="field"><label htmlFor="f-email">Email</label>
        <input id="f-email" name="email" type="email" autoComplete="email" required {...errProps(state, 'email')} />
        <FieldError state={state} name="email" /></div>
      <SubmitButton className="btn btn-primary btn-block">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="stack" noValidate>
      <FormMessage state={state} />
      <div className="field"><label htmlFor="n-pass">New password <span className="hint">(at least 8 characters)</span></label>
        <input id="n-pass" name="password" type="password" autoComplete="new-password" minLength={8} required {...errProps(state, 'password')} />
        <FieldError state={state} name="password" /></div>
      <div className="field"><label htmlFor="n-confirm">Confirm new password</label>
        <input id="n-confirm" name="confirm" type="password" autoComplete="new-password" required {...errProps(state, 'confirm')} />
        <FieldError state={state} name="confirm" /></div>
      <SubmitButton className="btn btn-primary btn-block">Save new password</SubmitButton>
    </form>
  );
}
