"use client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { createRepairBooking } from "@/app/actions/requests";
import { GUITAR_TYPES, REPAIR_SERVICES } from "@/lib/constants";
import { ContactFields, type ContactDefaults } from "./ContactFields";
import { Checkbox, Field, Honeypot, Select, TextArea } from "./Field";
import { PhotoPicker } from "./PhotoPicker";
import { useRecordWithPhotos } from "./useRecordWithPhotos";
import { Alert } from "@/components/ui/Alert";

export function RepairForm({ userId, defaults, preselect }: { userId: string; defaults: ContactDefaults; preselect?: string }) {
  const f = useRecordWithPhotos({
    action: createRepairBooking,
    bucket: "repair-images",
    table: "repair_images",
    fkColumn: "repair_id",
    userId,
    statusPath: (id) => `/account/repairs/${id}`,
  });
  const e = f.errors;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={f.submit} className="space-y-8" noValidate>
      <Honeypot />
      {f.error && <Alert tone="error">{f.error}</Alert>}
      <ContactFields defaults={defaults} errors={e} />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-lg">Your guitar</legend>
        <Select label="Guitar type" name="guitar_type" required options={GUITAR_TYPES} defaultValue="electric" error={e.guitar_type} />
        <Field label="Brand" name="brand" maxLength={80} error={e.brand} />
        <Field label="Model" name="model" maxLength={120} error={e.model} />
      </fieldset>
      <fieldset>
        <legend className="label">
          What do you need? <span className="text-danger" aria-hidden>*</span>
        </legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {REPAIR_SERVICES.map((s) => (
            <li key={s.value} className="flex items-start gap-2 rounded-md border border-gold/30 bg-white p-3">
              <input
                id={`svc-${s.value}`}
                type="checkbox"
                name="requested_services"
                value={s.value}
                className="checkbox"
                defaultChecked={preselect === s.value}
              />
              <label htmlFor={`svc-${s.value}`} className="text-sm">
                <span className="font-semibold">{s.label}</span>
                <span className="block text-tan">{s.description}</span>
              </label>
            </li>
          ))}
        </ul>
        {e.requested_services && <p className="field-error">{e.requested_services}</p>}
      </fieldset>
      <TextArea
        label="Describe the problem"
        name="problem_description"
        required
        minLength={10}
        maxLength={4000}
        rows={5}
        error={e.problem_description}
        hint="What's happening, when it started, and anything you've already tried."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Preferred drop-off / appointment date (optional)"
          name="preferred_date"
          type="date"
          min={today}
          error={e.preferred_date}
          hint="A preference only — we'll confirm a date with you. We're closed on Saturdays."
        />
      </div>
      <TextArea label="Additional notes" name="notes" maxLength={4000} rows={3} error={e.notes} />
      <PhotoPicker files={f.files} onChange={f.setFiles} label="Photos (optional)" hint="Photos of the problem area help us assess it. Up to 12 photos." />
      <Checkbox
        name="privacy_consent"
        error={e.privacy_consent}
        label={
          <>
            I agree that Guitarz4U may use these details to assess my repair and contact me (
            <Link href="/policies/privacy" className="link" target="_blank">
              privacy policy
            </Link>
            ).
          </>
        }
      />
      <Alert tone="info">
        This is a booking request. Nothing is confirmed until we&apos;ve reviewed it and you&apos;ve approved a
        quotation. No repair work starts without your approval.
      </Alert>
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={f.pending} aria-busy={f.pending}>
        {f.pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {f.progress ?? "Sending…"}
          </>
        ) : (
          "Send repair request"
        )}
      </button>
    </form>
  );
}
