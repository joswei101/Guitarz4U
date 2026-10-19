"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { submitSellerAction } from "@/app/(site)/sell/actions";
import { initialState } from "@/lib/actions";
import { CONDITION_LABELS, WORKING_LABELS } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics-client";
import { CheckboxField, FormMessage, Honeypot, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms/FormBits";
import { PhotoUploader } from "@/components/forms/PhotoUploader";

type Props = {
  userId: string;
  categories: { id: number; name: string }[];
  defaults: { name?: string | null; phone?: string | null; email?: string | null };
};

export function SellForm({ userId, categories, defaults }: Props) {
  const [state, action] = useActionState(submitSellerAction, initialState);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (state.ok) trackEvent("seller_submission");
  }, [state.ok, state.ts]);

  if (state.ok) {
    return (
      <div role="status" className="rounded-lg bg-success-bg p-6 text-success">
        <p className="text-lg font-semibold">Submission {state.data?.reference} received</p>
        <p className="mt-2">{state.message}</p>
        <Link href={`/account/selling/${state.data?.id}`} className="btn btn-primary mt-4">
          Track this submission
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="relative grid gap-5 sm:grid-cols-2">
      <Honeypot />
      <TextField label="Your name" name="seller_name" required maxLength={120} defaultValue={defaults.name ?? ""} autoComplete="name" state={state} />
      <TextField label="Contact number" name="contact_number" type="tel" required maxLength={30} defaultValue={defaults.phone ?? ""} autoComplete="tel" state={state} />
      <TextField label="Email (optional)" name="email" type="email" maxLength={200} defaultValue={defaults.email ?? ""} autoComplete="email" state={state} className="sm:col-span-2" />
      <TextField label="Guitar brand" name="brand" required maxLength={60} placeholder="e.g. Fender, Yamaha, unknown" state={state} />
      <TextField label="Model" name="model" required maxLength={100} placeholder="e.g. Stratocaster, F310" state={state} />
      <SelectField label="Category" name="category_id" required placeholder="Choose…" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} state={state} />
      <SelectField
        label="Condition"
        name="condition"
        required
        placeholder="Choose…"
        options={Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))}
        state={state}
      />
      <SelectField
        label="Does it work?"
        name="is_working"
        required
        placeholder="Choose…"
        options={Object.entries(WORKING_LABELS).map(([value, label]) => ({ value, label }))}
        state={state}
      />
      <TextField label="Asking price in rand (optional)" name="asking_price" inputMode="decimal" placeholder="e.g. 2500" maxLength={12} state={state} />
      <TextArea label="Faults or damage" name="fault_description" maxLength={3000} rows={4} className="sm:col-span-2" hint="Cracks, electronics problems, missing parts, repairs — the more honest, the better." state={state} />
      <TextArea label="Additional notes (optional)" name="notes" maxLength={3000} rows={3} className="sm:col-span-2" hint="Case included? Modifications? History?" state={state} />
      <div className="sm:col-span-2">
        <PhotoUploader userId={userId} max={8} onBusyChange={setUploading} />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <CheckboxField name="not_loose_parts" required state={state} label="This is a guitar (working, broken or incomplete) — not loose parts on their own." />
        <CheckboxField
          name="privacy_ack"
          required
          state={state}
          label={
            <>
              I agree that Guitarz4U may use these details and photographs to assess my guitar and contact me, as described in the{" "}
              <Link href="/privacy" className="underline" target="_blank">
                privacy policy
              </Link>
              . I understand that submitting is not an agreement to buy.
            </>
          }
        />
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Submitting…" disabled={uploading}>
          {uploading ? "Waiting for photos to upload…" : "Submit my guitar"}
        </SubmitButton>
      </div>
    </form>
  );
}
