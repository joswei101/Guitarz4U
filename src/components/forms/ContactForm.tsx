"use client";
import { useFormAction } from "@/components/forms/useFormAction";

import { sendContactMessage } from "@/app/actions/requests";
import { Field, Honeypot, TextArea } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function ContactForm({ defaults }: { defaults: { name?: string | null; email?: string | null; phone?: string | null } }) {
  const { state, onSubmit, pending: submitting } = useFormAction(sendContactMessage);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  if (state?.ok) return <Alert tone="success" title="Message sent">{state.message}</Alert>;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Honeypot />
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <Field label="Your name" name="name" required autoComplete="name" defaultValue={defaults.name ?? ""} error={e.name} maxLength={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={defaults.email ?? ""} error={e.email} />
        <Field label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" defaultValue={defaults.phone ?? ""} error={e.phone} />
      </div>
      <Field label="Subject" name="subject" maxLength={150} error={e.subject} />
      <TextArea label="Message" name="message" required rows={5} maxLength={4000} error={e.message} />
      <p className="text-xs text-tan">We use your details only to reply to you. See our privacy policy.</p>
      <SubmitButton pending={submitting} pendingText="Sending…">Send message</SubmitButton>
    </form>
  );
}
