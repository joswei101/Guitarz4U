"use client";

import { useActionState } from "react";
import { respondToQuoteAction } from "@/app/actions/account";
import { FormResult, SubmitButton } from "./forms/form-bits";
import { Checkbox } from "./ui/form";

export function QuoteResponse({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(respondToQuoteAction, null);
  if (state?.ok) return <FormResult state={state} />;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="decision" value="accept" />
        <Checkbox id={`agree-${quoteId}`} name="agree" required label="I accept this quote, including the parts I am responsible for, the warranty terms and the exclusions, and I authorise Guitarz4U to carry out the work." />
        <SubmitButton pendingLabel="Saving…">Accept quote</SubmitButton>
      </form>
      <form action={action}>
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="decision" value="decline" />
        <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">Decline quote</SubmitButton>
      </form>
      <FormResult state={state} />
    </div>
  );
}
