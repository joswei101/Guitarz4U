"use client";

import { useActionState, useEffect } from "react";
import { requestReservationAction } from "@/app/(site)/shop/actions";
import { initialState } from "@/lib/actions";
import { ContactFields, type ContactDefaults } from "@/components/forms/ContactFields";
import { FormMessage, SubmitButton, TextArea } from "@/components/forms/FormBits";
import { trackEvent } from "@/lib/analytics-client";

export function ReservationForm({ productId, defaults, holdDays }: { productId: string; defaults: ContactDefaults; holdDays: number }) {
  const [state, action] = useActionState(requestReservationAction, initialState);

  useEffect(() => {
    if (state.ok) trackEvent("reservation_request", productId);
  }, [state.ok, state.ts, productId]);

  if (state.ok) {
    return (
      <div role="status" className="rounded-lg bg-success-bg p-4 text-sm text-success">
        <p className="font-semibold">Reservation requested</p>
        <p className="mt-1">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />
      <p className="notice text-sm">
        A reservation request is <strong>not confirmed</strong> until Guitarz4U approves it. Approved reservations are held
        for about {holdDays} day{holdDays === 1 ? "" : "s"} and then expire.
      </p>
      <ContactFields defaults={defaults} state={state} />
      <TextArea label="Message (optional)" name="message" maxLength={2000} rows={3} state={state} />
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending request…">Request reservation</SubmitButton>
    </form>
  );
}
