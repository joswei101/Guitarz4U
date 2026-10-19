"use client";

import { useActionState, useState } from "react";
import { reportReviewAction } from "@/app/(site)/reviews/actions";
import { initialState } from "@/lib/actions";
import { FormMessage, SubmitButton } from "@/components/forms/FormBits";

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(reportReviewAction, initialState);

  if (state.ok) return <FormMessage state={state} />;

  return (
    <div className="text-sm">
      {!open ? (
        <button type="button" className="text-ink-soft underline underline-offset-2 hover:text-danger" onClick={() => setOpen(true)}>
          Report this review
        </button>
      ) : (
        <form action={action} className="mt-2 space-y-2">
          <input type="hidden" name="review_id" value={reviewId} />
          <label htmlFor={`reason-${reviewId}`} className="label">
            Why is this review inappropriate?
          </label>
          <textarea id={`reason-${reviewId}`} name="reason" required minLength={5} maxLength={1000} className="textarea min-h-20" />
          <FormMessage state={state} />
          <div className="flex gap-2">
            <SubmitButton className="btn btn-outline btn-sm" pendingText="Sending…">
              Send report
            </SubmitButton>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
