"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, FormStatus } from "@/components/forms";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (sent)
    return (
      <div className="card" role="status">
        <h2>Check your inbox</h2>
        <p>If an account exists for that email address, we have sent a link to reset your password. The link expires in one hour.</p>
      </div>
    );
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const { error } = await authClient.requestPasswordReset({ email: String(new FormData(e.currentTarget).get("email")), redirectTo: "/reset-password" });
        setPending(false);
        if (error && error.status === 429) return setError("Too many requests. Please wait a few minutes.");
        setSent(true); // same message whether or not the account exists
      }}
    >
      <FormStatus error={error} />
      <Field label="Email address" name="email" required>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}
