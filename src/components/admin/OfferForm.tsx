"use client";
import { useFormAction } from "@/components/forms/useFormAction";

import { makeOffer } from "@/app/actions/admin";
import { Field, TextArea } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function OfferForm({ submissionId }: { submissionId: string }) {
  const { state, onSubmit, pending: submitting } = useFormAction(makeOffer.bind(null, submissionId));
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Offer amount (R)" name="amount" type="number" min={1} step="1" required error={e.amount} />
        <Field label="Valid until (optional)" name="valid_until" type="date" min={new Date().toISOString().slice(0, 10)} />
      </div>
      <TextArea label="Message with the offer" name="message" rows={3} maxLength={2000} placeholder="e.g. Subject to inspection; payment by EFT on handover." />
      <SubmitButton pending={submitting} pendingText="Sending offer…">Send offer</SubmitButton>
      <p className="text-xs text-tan">A new offer replaces any pending offer. The seller accepts or declines in their account.</p>
    </form>
  );
}
