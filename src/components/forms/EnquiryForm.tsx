"use client";

import { useActionState } from "react";
import { submitEnquiryAction } from "@/app/(site)/contact/actions";
import { initialState } from "@/lib/actions";
import { FormMessage, Honeypot, SubmitButton, TextArea, TextField } from "@/components/forms/FormBits";

type Props = {
  productId?: string;
  productTitle?: string;
  defaults?: { name?: string; email?: string; phone?: string };
  compact?: boolean;
};

export function EnquiryForm({ productId, productTitle, defaults, compact }: Props) {
  const [state, action] = useActionState(submitEnquiryAction, initialState);

  if (state.ok) {
    return (
      <div role="status" className="rounded-lg bg-success-bg p-5 text-success">
        <p className="font-semibold">Thank you — your message has been received.</p>
        <p className="mt-1 text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative grid gap-4 sm:grid-cols-2" noValidate={false}>
      <Honeypot />
      {productId && <input type="hidden" name="product_id" value={productId} />}
      <TextField label="Your name" name="name" required autoComplete="name" maxLength={120} defaultValue={defaults?.name} state={state} />
      <TextField label="Email" name="email" type="email" autoComplete="email" maxLength={200} defaultValue={defaults?.email} state={state} hint="Email or phone required" />
      <TextField label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={defaults?.phone} state={state} />
      <TextField
        label="Subject"
        name="subject"
        required
        maxLength={150}
        defaultValue={productTitle ? `Question about ${productTitle}` : ""}
        state={state}
      />
      <TextArea
        label={productId ? "Your question" : "Message"}
        name="message"
        required
        minLength={5}
        maxLength={3000}
        rows={compact ? 4 : 6}
        className="sm:col-span-2"
        state={state}
      />
      <p className="hint sm:col-span-2">
        By sending this message you agree that we may use your details to reply to you, as described in our{" "}
        <a href="/privacy" className="underline">
          privacy policy
        </a>
        .
      </p>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Sending…">Send message</SubmitButton>
      </div>
    </form>
  );
}
