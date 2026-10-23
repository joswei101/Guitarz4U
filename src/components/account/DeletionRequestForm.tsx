"use client";

import { useActionState } from "react";
import { requestDeletionAction } from "@/app/(site)/account/actions";
import { initialState } from "@/lib/actions";
import { CheckboxField, FormMessage, SubmitButton, TextArea } from "@/components/forms/FormBits";

export function DeletionRequestForm() {
  const [state, action] = useActionState(requestDeletionAction, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="max-w-xl space-y-4">
      <TextArea label="Reason (optional)" name="reason" maxLength={1000} rows={3} state={state} />
      <CheckboxField name="confirm" required state={state} label="I understand that my account and personal information will be deleted or anonymised." />
      <FormMessage state={state} />
      <SubmitButton className="btn btn-danger" pendingText="Sending…">
        Request account deletion
      </SubmitButton>
    </form>
  );
}
