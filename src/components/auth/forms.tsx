"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resendVerificationAction, resetPasswordAction } from "@/app/actions/auth";
import { Checkbox, Field, Input } from "../ui/form";
import { FormResult, SubmitButton, fe } from "../forms/form-bits";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email" error={fe(state, "email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={fe(state, "password")} required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormResult state={state} />
      <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-bone-muted"><Link href="/forgot-password" className="link">Forgot your password?</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, null);
  if (state?.ok) return <FormResult state={state} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field label="Full name" htmlFor="name" error={fe(state, "name")} required>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={fe(state, "email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={fe(state, "password")} hint="At least 10 characters, with letters and numbers." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Checkbox id="privacy" name="privacy" required label={<>I have read the <Link href="/policies/privacy" className="link" target="_blank">privacy policy</Link> and agree to the <Link href="/policies/terms" className="link" target="_blank">terms</Link>.</>} />
      {fe(state, "privacy") && <p className="text-xs text-danger">{fe(state, "privacy")}</p>}
      <FormResult state={state} />
      <SubmitButton className="w-full" pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ResendVerification() {
  const [state, action] = useActionState(resendVerificationAction, null);
  return (
    <form action={action} className="inline">
      <SubmitButton variant="outline" size="sm" pendingLabel="Sending…">Resend verification email</SubmitButton>
      <div className="mt-2"><FormResult state={state} /></div>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <FormResult state={state} />;
  return (
    <form action={action} className="space-y-5">
      <Field label="Email" htmlFor="email" error={fe(state, "email")} required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormResult state={state} />
      <SubmitButton className="w-full" pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" error={fe(state, "password")} hint="At least 10 characters, with letters and numbers." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={fe(state, "confirm")} required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <FormResult state={state} />
      <SubmitButton className="w-full" pendingLabel="Saving…">Set new password</SubmitButton>
    </form>
  );
}
