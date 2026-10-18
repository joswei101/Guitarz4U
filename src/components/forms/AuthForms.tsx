"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/actions/auth";
import { Checkbox, Field, Honeypot } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email address" name="email" type="email" autoComplete="email" required error={errors.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required error={errors.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="link text-sm">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton pendingText="Signing in…" className="btn btn-primary w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  if (state?.ok) return <Alert tone="success" title="Check your email">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Honeypot />
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <Field label="Full name" name="full_name" autoComplete="name" required error={errors.full_name} maxLength={120} />
      <Field label="Email address" name="email" type="email" autoComplete="email" required error={errors.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.password}
        hint="At least 8 characters, including a letter and a number."
      />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required error={errors.confirm} />
      <Checkbox
        name="privacy"
        error={errors.privacy}
        label={
          <>
            I agree to the{" "}
            <Link href="/policies/privacy" className="link" target="_blank">
              privacy policy
            </Link>{" "}
            and{" "}
            <Link href="/policies/terms" className="link" target="_blank">
              terms
            </Link>
            .
          </>
        }
      />
      <SubmitButton pendingText="Creating account…" className="btn btn-primary w-full">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email address" name="email" type="email" autoComplete="email" required />
      <SubmitButton pendingText="Sending…" className="btn btn-primary w-full">
        Email me a reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  if (state?.ok)
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <Link href="/account" className="btn btn-primary">
          Go to my account
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <Field label="New password" name="password" type="password" autoComplete="new-password" required error={errors.password} hint="At least 8 characters, including a letter and a number." />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required error={errors.confirm} />
      <SubmitButton pendingText="Saving…" className="btn btn-primary w-full">
        Save new password
      </SubmitButton>
    </form>
  );
}
