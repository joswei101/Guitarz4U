"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, FormStatus } from "@/components/forms";

export function ChangePassword() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const newPassword = String(fd.get("newPassword"));
        if (newPassword !== String(fd.get("confirm"))) return setError("The new passwords do not match.");
        setPending(true);
        setError(null);
        setDone(false);
        const { error } = await authClient.changePassword({ currentPassword: String(fd.get("currentPassword")), newPassword, revokeOtherSessions: true });
        setPending(false);
        if (error) return setError(error.message || "Could not change your password.");
        form.reset();
        setDone(true);
      }}
    >
      <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Change password</h2>
      <FormStatus error={error} />
      {done && <div className="form-status success" role="status">Password changed. Other devices have been logged out.</div>}
      <Field label="Current password" name="currentPassword" required><input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></Field>
      <Field label="New password" name="newPassword" required hint="At least 10 characters."><input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></Field>
      <Field label="Confirm new password" name="confirm" required><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></Field>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
