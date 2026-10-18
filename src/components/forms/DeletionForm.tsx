"use client";
import { useFormAction } from "@/components/forms/useFormAction";

import { requestAccountDeletion } from "@/app/actions/account";
import { Field, TextArea } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function DeletionForm() {
  const { state, onSubmit, pending: submitting } = useFormAction(requestAccountDeletion);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <TextArea label="Reason (optional)" name="reason" rows={2} maxLength={1000} />
      <Field label='Type "DELETE" to confirm' name="confirm" required error={e.confirm} autoComplete="off" />
      <SubmitButton pending={submitting} className="btn btn-danger" pendingText="Sending…">Request account deletion</SubmitButton>
    </form>
  );
}
