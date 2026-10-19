"use client";

import { useActionState, useState } from "react";
import { submitReviewAction } from "@/app/(site)/reviews/actions";
import { initialState } from "@/lib/actions";
import { FormMessage, Honeypot, SubmitButton, TextArea, TextField } from "@/components/forms/FormBits";
import { StarIcon } from "@/components/ui/Icons";

export function ReviewForm() {
  const [state, action] = useActionState(submitReviewAction, initialState);
  const [rating, setRating] = useState(0);

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form action={action} className="relative space-y-4">
      <Honeypot />
      <fieldset>
        <legend className="label">
          Rating <span className="text-danger">*</span>
        </legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                className="peer sr-only"
                checked={rating === n}
                onChange={() => setRating(n)}
                required
              />
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"}
              </span>
              <StarIcon
                filled={n <= rating}
                className="h-8 w-8 rounded text-gold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold"
              />
            </label>
          ))}
        </div>
        {state.fieldErrors?.rating && <p className="field-error">{state.fieldErrors.rating}</p>}
      </fieldset>
      <TextField label="Title" name="title" required maxLength={100} state={state} />
      <TextArea label="Your review" name="body" required minLength={20} maxLength={2000} state={state} hint="At least 20 characters. Please don't include personal contact details." />
      <FormMessage state={state} />
      <SubmitButton pendingText="Submitting…">Submit review</SubmitButton>
    </form>
  );
}
