"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  forgotPasswordAction,
  resendVerificationAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/app/(site)/(auth)/actions";
import { initialState } from "@/lib/actions";
import { CheckboxField, FormMessage, Honeypot, SubmitButton, TextField } from "@/components/forms/FormBits";
import { createClient } from "@/lib/supabase/client";

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <TextField label="Email address" name="email" type="email" autoComplete="email" required state={state} />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required state={state} />
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-gold-ink underline-offset-2 hover:underline">
          Forgot your password?
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUpAction, initialState);
  if (state.ok) {
    return (
      <div role="status" className="space-y-4">
        <div className="rounded-lg bg-success-bg p-5 text-success">
          <p className="font-semibold">Check your email</p>
          <p className="mt-1 text-sm">{state.message}</p>
        </div>
        <ResendVerification />
      </div>
    );
  }
  return (
    <form action={action} className="relative space-y-4">
      <Honeypot />
      <input type="hidden" name="next" value={next} />
      <TextField label="Full name" name="full_name" autoComplete="name" required maxLength={120} state={state} />
      <TextField label="Email address" name="email" type="email" autoComplete="email" required state={state} />
      <TextField label="Phone / WhatsApp (optional)" name="phone" type="tel" autoComplete="tel" maxLength={30} state={state} />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters, with letters and numbers."
        state={state}
      />
      <TextField label="Confirm password" name="confirm_password" type="password" autoComplete="new-password" required state={state} />
      <CheckboxField
        name="accept"
        required
        state={state}
        label={
          <>
            I agree to the{" "}
            <Link href="/terms" className="underline" target="_blank">
              terms and conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline" target="_blank">
              privacy policy
            </Link>
            .
          </>
        }
      />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function ResendVerification() {
  const [state, action] = useActionState(resendVerificationAction, initialState);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-gold-ink">Didn&apos;t receive the email?</summary>
      <form action={action} className="mt-3 space-y-3">
        <TextField label="Email address" name="email" type="email" required state={state} />
        <FormMessage state={state} />
        <SubmitButton className="btn btn-outline btn-sm" pendingText="Sending…">
          Resend verification link
        </SubmitButton>
      </form>
    </details>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <TextField label="Email address" name="email" type="email" autoComplete="email" required state={state} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initialState);
  if (state.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/account" className="btn btn-primary">
          Go to my account
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <TextField label="New password" name="password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters, with letters and numbers." state={state} />
      <TextField label="Confirm new password" name="confirm_password" type="password" autoComplete="new-password" required state={state} />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-primary w-full" pendingText="Saving…">
        Update password
      </SubmitButton>
    </form>
  );
}

/** Only rendered when NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is "true". */
export function GoogleButton({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn btn-outline w-full bg-white"
        onClick={async () => {
          const { error } = await createClient().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}` },
          });
          if (error) setError("Google sign-in is not available right now. Please use email and password.");
        }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
        </svg>
        Continue with Google
      </button>
      {error && <p className="field-error mt-2">{error}</p>}
    </div>
  );
}
