"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, FormStatus } from "@/components/forms";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const pw = String(fd.get("password"));
        if (pw !== String(fd.get("confirm"))) return setError("The two passwords do not match.");
        setPending(true);
        setError(null);
        const { error } = await authClient.resetPassword({ newPassword: pw, token });
        setPending(false);
        if (error) return setError(error.message || "This link is invalid or has expired. Please request a new one.");
        router.push("/login?reset=1");
      }}
    >
      <FormStatus error={error} />
      <Field label="New password" name="password" required hint="At least 10 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
      </Field>
      <Field label="Confirm new password" name="confirm" required>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
      </Field>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
