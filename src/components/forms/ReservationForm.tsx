"use client";
import { useActionState } from "react";
import { requestReservation } from "@/app/actions/shop";
import { ContactFields, type ContactDefaults } from "./ContactFields";
import { Honeypot, TextArea } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function ReservationForm({ productId, defaults }: { productId: string; defaults: ContactDefaults }) {
  const [state, action] = useActionState(requestReservation, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="product_id" value={productId} />
      <Honeypot />
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <ContactFields defaults={defaults} errors={errors} />
      <TextArea label="Message (optional)" name="message" maxLength={2000} rows={4} hint="E.g. when you'd like to view or collect, or questions about the item." error={errors.message} />
      <Alert tone="warning" title="This is a request, not a confirmed reservation">
        Guitarz4U will review it and contact you. If approved, the item is held for a limited time while payment is
        arranged. No payment is taken online.
      </Alert>
      <SubmitButton pendingText="Sending request…" className="btn btn-primary w-full sm:w-auto">
        Send reservation request
      </SubmitButton>
    </form>
  );
}
