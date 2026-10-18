"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, safeNext } from "@/lib/auth-client";
import { Field, FormStatus } from "@/components/forms";

export function LoginForm({ next, google, emailEnabled }: { next: string; google: boolean; emailEnabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  return (
    <div className="stack">
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const email = String(fd.get("email"));
          setPending(true);
          setError(null);
          setUnverified(null);
          const { error } = await authClient.signIn.email({ email, password: String(fd.get("password")) });
          setPending(false);
          if (error) {
            if (error.status === 403) {
              setUnverified(email);
              setError("Please confirm your email address first — check your inbox for the verification link.");
            } else if (error.status === 429) {
              setError("Too many attempts. Please wait a minute and try again.");
            } else {
              setError("Incorrect email address or password.");
            }
            return;
          }
          router.push(safeNext(next));
          router.refresh();
        }}
      >
        <FormStatus error={error} />
        {unverified && emailEnabled && (
          <p className="small">
            {resent ? "A new verification email has been sent." : (
              <button type="button" className="link-btn" onClick={async () => { await authClient.sendVerificationEmail({ email: unverified, callbackURL: "/account" }); setResent(true); }}>
                Send the verification email again
              </button>
            )}
          </p>
        )}
        <Field label="Email address" name="email" required>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" name="password" required>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <button className="btn btn-primary btn-block" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
        <p className="small" style={{ margin: 0 }}><Link href="/forgot-password">Forgot your password?</Link></p>
      </form>
      {google && (
        <button className="btn btn-outline btn-block" type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: safeNext(next) })}>
          Continue with Google
        </button>
      )}
      <p className="center">New to Guitarz4U? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></p>
    </div>
  );
}
