"use client";

import { useActionForm } from "./use-action-form";
import Link from "next/link";
import { subscribeNewsletter } from "@/app/actions/public";
import { FormResult, SubmitButton } from "./form-bits";
import { Input } from "../ui/form";

export function NewsletterForm({ idPrefix = "nl" }: { idPrefix?: string }) {
  const [state, onSubmit, pending] = useActionForm(subscribeNewsletter, null);
  if (state?.ok) return <FormResult state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${idPrefix}-email`} className="sr-only">Email address</label>
        <Input id={`${idPrefix}-email`} name="email" type="email" required placeholder="you@example.com" autoComplete="email" className="sm:flex-1" />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <SubmitButton pending={pending} pendingLabel="Subscribing…">Subscribe</SubmitButton>
      </div>
      <div className="flex items-start gap-2 text-xs text-bone-dim">
        <input id={`${idPrefix}-consent`} name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 accent-amp" />
        <label htmlFor={`${idPrefix}-consent`}>
          I agree to receive occasional emails about new stock and services. Unsubscribe any time. See our <Link href="/policies/privacy" className="text-amp underline">privacy policy</Link>.
        </label>
      </div>
      <FormResult state={state} />
    </form>
  );
}
