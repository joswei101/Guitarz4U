"use client";

import { useActionForm } from "./forms/use-action-form";
import { respondToQuoteAction } from "@/app/actions/account";
import { FormResult, SubmitButton } from "./forms/form-bits";
import { Checkbox } from "./ui/form";

export function QuoteResponse({ quoteId }: { quoteId: string }) {
  const [state, onSubmit, pending] = useActionForm(respondToQuoteAction, null);
  if (state?.ok) return <FormResult state={state} />;
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="decision" value="accept" />
        <Checkbox id={`agree-${quoteId}`} name="agree" required label="I accept this quote, including the parts I am responsible for, the warranty terms and the exclusions, and I authorise Guitarz4U to carry out the work." />
        <SubmitButton pending={pending} pendingLabel="Saving…">Accept quote</SubmitButton>
      </form>
      <form onSubmit={onSubmit}>
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="decision" value="decline" />
        <SubmitButton pending={pending} variant="outline" size="sm" pendingLabel="Saving…">Decline quote</SubmitButton>
      </form>
      <FormResult state={state} />
    </div>
  );
}
