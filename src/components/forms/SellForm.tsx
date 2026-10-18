"use client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { createSellerSubmission } from "@/app/actions/requests";
import { CONDITIONS } from "@/lib/constants";
import { ContactFields, type ContactDefaults } from "./ContactFields";
import { Checkbox, Field, Honeypot, Select, TextArea } from "./Field";
import { PhotoPicker } from "./PhotoPicker";
import { useRecordWithPhotos } from "./useRecordWithPhotos";
import { Alert } from "@/components/ui/Alert";

export function SellForm({
  userId,
  defaults,
  categories,
}: {
  userId: string;
  defaults: ContactDefaults;
  categories: { id: number; name: string }[];
}) {
  const f = useRecordWithPhotos({
    action: createSellerSubmission,
    bucket: "submission-images",
    table: "seller_submission_images",
    fkColumn: "submission_id",
    userId,
    statusPath: (id) => `/account/submissions/${id}`,
  });
  const e = f.errors;
  return (
    <form action={f.submit} className="space-y-8" noValidate>
      <Honeypot />
      {f.error && <Alert tone="error">{f.error}</Alert>}
      <ContactFields defaults={defaults} errors={e} />
      <Field label="Your area (town / suburb)" name="location" maxLength={120} autoComplete="address-level2" error={e.location} hint="Helps us plan an inspection. We don't need your street address." />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-lg">About the guitar</legend>
        <Field label="Brand" name="brand" required maxLength={80} error={e.brand} placeholder="e.g. Fender" />
        <Field label="Model" name="model" required maxLength={120} error={e.model} placeholder="e.g. Player Stratocaster" />
        <Select
          label="Guitar type"
          name="category_id"
          required
          placeholder="Choose…"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          error={e.category_id}
        />
        <Select label="Condition" name="condition" required options={CONDITIONS} defaultValue="good" error={e.condition} />
        <fieldset className="sm:col-span-2">
          <legend className="label">
            Is it in working order? <span className="text-danger" aria-hidden>*</span>
          </legend>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="radio" name="is_working" value="yes" className="checkbox" /> Yes, it works
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="is_working" value="no" className="checkbox" /> No, it&apos;s broken
            </label>
          </div>
          {e.is_working && <p className="field-error">{e.is_working}</p>}
        </fieldset>
        <TextArea
          className="sm:col-span-2"
          label="Defects or damage"
          name="defects"
          maxLength={4000}
          rows={4}
          error={e.defects}
          hint="Cracks, scratches, electrical faults, repairs or modifications — honesty helps us make a fair offer."
        />
        <Field
          label="Asking price (R, optional)"
          name="asking_price"
          type="number"
          min={0}
          step={50}
          inputMode="numeric"
          error={e.asking_price}
        />
        <TextArea className="sm:col-span-2" label="Additional notes" name="notes" maxLength={4000} rows={3} error={e.notes} hint="Year, accessories (case, gig bag), history, upgrades…" />
      </fieldset>

      <PhotoPicker files={f.files} onChange={f.setFiles} label="Photos of the guitar (recommended)" hint="Front, back, headstock and any damage. Up to 12 photos." />

      <div className="space-y-3">
        <Checkbox
          name="not_loose_parts"
          error={e.not_loose_parts}
          label="This is a complete guitar (working or broken) — not loose parts. Guitarz4U does not buy loose parts."
        />
        <Checkbox
          name="privacy_consent"
          error={e.privacy_consent}
          label={
            <>
              I agree that Guitarz4U may use these details and photos to assess my guitar and contact me, as described in
              the{" "}
              <Link href="/policies/privacy" className="link" target="_blank">
                privacy policy
              </Link>
              .
            </>
          }
        />
      </div>

      <Alert tone="info">
        Submitting does not commit you or Guitarz4U to a sale. We review every guitar personally and will only make an
        offer after assessing it.
      </Alert>

      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={f.pending} aria-busy={f.pending}>
        {f.pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {f.progress ?? "Sending…"}
          </>
        ) : (
          "Submit my guitar"
        )}
      </button>
    </form>
  );
}
