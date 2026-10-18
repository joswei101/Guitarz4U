"use client";

import Link from "next/link";
import { useActionForm } from "./use-action-form";
import { submitContact } from "@/app/actions/public";
import { Checkbox, Field, Input, Textarea } from "../ui/form";
import { FormResult, SubmitButton, fe } from "./form-bits";

export function ContactForm({ defaults }: { defaults?: { name?: string; email?: string } }) {
  const [state, onSubmit, pending, dispatch] = useActionForm(submitContact, null);
  if (state?.ok) return <FormResult state={state} />;
  return (
    <form action={dispatch} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="name" required error={fe(state, "name")}><Input id="name" name="name" required autoComplete="name" defaultValue={defaults?.name} /></Field>
      <Field label="Email" htmlFor="email" required error={fe(state, "email")}><Input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaults?.email} /></Field>
      <Field label="Phone (optional)" htmlFor="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="Subject" htmlFor="subject" required error={fe(state, "subject")}><Input id="subject" name="subject" required /></Field>
      <Field label="Message" htmlFor="message" required error={fe(state, "message")} className="sm:col-span-2"><Textarea id="message" name="message" required minLength={10} /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="sm:col-span-2 space-y-4">
        <Checkbox id="privacy" name="privacy" required label={<>I agree that Guitarz4U may use these details to reply to me, as described in the <Link href="/policies/privacy" className="link" target="_blank">privacy policy</Link>.</>} />
        {fe(state, "privacy") && <p className="text-xs text-danger">{fe(state, "privacy")}</p>}
        <FormResult state={state} />
        <SubmitButton pending={pending} pendingLabel="Sending…">Send message</SubmitButton>
      </div>
    </form>
  );
}
