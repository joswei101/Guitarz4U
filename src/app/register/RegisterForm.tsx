"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, safeNext } from "@/lib/auth-client";
import { Field, FormStatus } from "@/components/forms";

export function RegisterForm({ next, google, verifyEmail }: { next: string; google: boolean; verifyEmail: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInbox, setCheckInbox] = useState<string | null>(null);

  if (checkInbox) {
    return (
      <div className="card" role="status">
        <h2>Check your inbox</h2>
        <p>We sent a confirmation link to <strong>{checkInbox}</strong>. Click it to activate your account. (Check your spam folder if it does not arrive within a few minutes.)</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const password = String(fd.get("password"));
          if (password !== String(fd.get("confirm"))) return setError("The two passwords do not match.");
          if (password.length < 10) return setError("Please use a password of at least 10 characters.");
          setPending(true);
          setError(null);
          const email = String(fd.get("email")).trim();
          const { error } = await authClient.signUp.email({ name: String(fd.get("name")).trim(), email, password, callbackURL: "/account" });
          setPending(false);
          if (error) {
            setError(error.status === 422 || /exist/i.test(error.message ?? "") ? "An account with this email address may already exist. Try logging in or resetting your password." : error.message || "Could not create your account.");
            return;
          }
          if (verifyEmail) return setCheckInbox(email);
          router.push(safeNext(next));
          router.refresh();
        }}
      >
        <FormStatus error={error} />
        <Field label="Your name" name="name" required>
          <input id="name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={120} />
        </Field>
        <Field label="Email address" name="email" required>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" name="password" required hint="At least 10 characters. A short sentence works well.">
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} aria-describedby="password-hint" />
        </Field>
        <Field label="Confirm password" name="confirm" required>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
        </Field>
        <p className="small muted" style={{ margin: 0 }}>By creating an account you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
        <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      </form>
      {google && (
        <button className="btn btn-outline btn-block" type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: safeNext(next) })}>
          Continue with Google
        </button>
      )}
      <p className="center">Already have an account? <Link href="/login">Log in</Link></p>
    </div>
  );
}
