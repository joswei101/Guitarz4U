"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { submitRepairAction } from "@/app/(site)/repairs/actions";
import { initialState } from "@/lib/actions";
import { REPAIR_SERVICES } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics-client";
import { ContactFields, type ContactDefaults } from "@/components/forms/ContactFields";
import { FormMessage, Honeypot, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms/FormBits";
import { PhotoUploader } from "@/components/forms/PhotoUploader";

type Props = {
  userId: string;
  categories: { id: number; name: string }[];
  defaults: ContactDefaults;
  minDate: string;
};

export function RepairForm({ userId, categories, defaults, minDate }: Props) {
  const [state, action] = useActionState(submitRepairAction, initialState);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (state.ok) trackEvent("repair_booking");
  }, [state.ok, state.ts]);

  if (state.ok) {
    return (
      <div role="status" className="rounded-lg bg-success-bg p-6 text-success">
        <p className="text-lg font-semibold">Booking {state.data?.reference} received</p>
        <p className="mt-2">{state.message}</p>
        <Link href={`/account/repairs/${state.data?.id}`} className="btn btn-primary mt-4">
          Track this repair
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-5">
      <Honeypot />
      <ContactFields defaults={defaults} state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Guitar brand" name="guitar_brand" required maxLength={60} state={state} />
        <TextField label="Model (optional)" name="guitar_model" maxLength={100} state={state} />
        <SelectField label="Type of guitar" name="category_id" placeholder="Choose…" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} state={state} />
      </div>
      <fieldset>
        <legend className="label">
          Work requested <span className="text-danger">*</span>
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {REPAIR_SERVICES.map((s) => (
            <label key={s.id} className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm hover:border-gold">
              <input type="checkbox" name="services" value={s.id} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-walnut)]" />
              <span>
                <span className="font-semibold text-walnut">{s.name}</span>
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.services && <p className="field-error mt-1">{state.fieldErrors.services}</p>}
      </fieldset>
      <TextArea label="Describe the problem" name="problem_description" required minLength={10} maxLength={3000} rows={5} state={state} hint="What's happening, when it started, and anything you've already tried." />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Preferred date (optional)" name="preferred_date" type="date" min={minDate} state={state} hint="A request only — we'll confirm a date with you. Closed on Saturdays." />
      </div>
      <TextArea label="Additional notes (optional)" name="notes" maxLength={2000} rows={3} state={state} />
      <PhotoUploader userId={userId} max={6} onBusyChange={setUploading} />
      <p className="notice text-sm">
        Repair bookings are requests. Guitarz4U assesses every job and provides a quote — your appointment is not confirmed and no
        work starts until it has been approved.
      </p>
      <FormMessage state={state} />
      <SubmitButton pendingText="Submitting…" disabled={uploading}>
        {uploading ? "Waiting for photos to upload…" : "Request repair booking"}
      </SubmitButton>
    </form>
  );
}
