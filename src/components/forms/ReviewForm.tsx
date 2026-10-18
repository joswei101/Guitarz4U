"use client";
import { useFormAction } from "@/components/forms/useFormAction";
import { useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/app/actions/requests";
import { Field, Honeypot, TextArea } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function ReviewForm({ defaultName }: { defaultName: string }) {
  const { state, onSubmit, pending: submitting } = useFormAction(submitReview);
  const [rating, setRating] = useState(0);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Honeypot />
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <label key={i} className="cursor-pointer">
              <input type="radio" name="rating" value={i} className="sr-only" checked={rating === i} onChange={() => setRating(i)} />
              <Star className={`h-8 w-8 ${i <= rating ? "fill-gold text-gold" : "text-gold/50"}`} aria-hidden />
              <span className="sr-only">{i} star{i > 1 ? "s" : ""}</span>
            </label>
          ))}
        </div>
        {e.rating && <p className="field-error">{e.rating}</p>}
      </fieldset>
      <Field label="Display name" name="display_name" required defaultValue={defaultName} maxLength={60} error={e.display_name} hint="Shown publicly with your review, e.g. your first name." />
      <Field label="Title (optional)" name="title" maxLength={120} error={e.title} />
      <TextArea label="Your review" name="body" required rows={5} minLength={20} maxLength={2000} error={e.body} />
      <p className="text-xs text-tan">Reviews are checked before publication. Please don&apos;t include personal details or links.</p>
      <SubmitButton pending={submitting} pendingText="Submitting…">Submit review</SubmitButton>
    </form>
  );
}
