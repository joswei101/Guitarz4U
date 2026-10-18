"use client";

import Link from "next/link";
import { UploadForm } from "./upload-form";
import { FileInput } from "./file-input";
import { Checkbox, Field, Input, Select, Textarea } from "../ui/form";
import { Alert } from "../ui/misc";
import { ButtonLink } from "../ui/button";

export function SellForm({ types, defaults }: { types: string[]; defaults?: { name?: string; email?: string; phone?: string } }) {
  return (
    <UploadForm
      endpoint="/api/enquiries"
      submitLabel="Submit for an offer"
      success={(ref) => (
        <div className="space-y-5">
          <Alert tone="ok" title="Submission received — thank you!">
            Your reference is <strong>{ref}</strong>. The owner reviews every submission personally and will contact you with an offer or questions. A confirmation email is on its way (if email is configured). There&apos;s no obligation to accept any offer.
          </Alert>
          <div className="flex gap-3"><ButtonLink href="/shop">Browse the shop</ButtonLink><ButtonLink href="/" variant="outline">Home</ButtonLink></div>
        </div>
      )}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl uppercase tracking-wide">Your details</legend>
        <Field label="Full name" htmlFor="name" required><Input id="name" name="name" required autoComplete="name" defaultValue={defaults?.name} /></Field>
        <Field label="Email" htmlFor="email" required><Input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaults?.email} /></Field>
        <Field label="WhatsApp or phone number" htmlFor="phone" required><Input id="phone" name="phone" type="tel" required autoComplete="tel" defaultValue={defaults?.phone} /></Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl uppercase tracking-wide">The item</legend>
        <Field label="Instrument or equipment type" htmlFor="instrumentType" required>
          <Select id="instrumentType" name="instrumentType" required defaultValue="">
            <option value="" disabled>Choose a type…</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Overall condition" htmlFor="condition" required>
          <Select id="condition" name="condition" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {["Excellent — barely used", "Good — normal wear", "Fair — heavy wear or minor faults", "Broken / not working", "Incomplete — missing parts"].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Brand (if known)" htmlFor="brand"><Input id="brand" name="brand" maxLength={80} /></Field>
        <Field label="Model (if known)" htmlFor="model"><Input id="model" name="model" maxLength={120} /></Field>
        <Field label="Damage or faults" htmlFor="faults" className="sm:col-span-2" hint="Cracks, electronics issues, missing parts, repairs, modifications…"><Textarea id="faults" name="faults" maxLength={3000} /></Field>
        <Field label="Anything else we should know?" htmlFor="details" className="sm:col-span-2" hint="Age, accessories (case, cables), history. You don't need to name a price."><Textarea id="details" name="details" maxLength={3000} /></Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl uppercase tracking-wide">Photos & video</legend>
        <FileInput id="photos" name="photos" label="Photos (required, up to 8)" accept="image/jpeg,image/png,image/webp" multiple maxFiles={8} hint="JPEG, PNG or WebP, up to 10 MB each. Front, back, headstock, serial number and any damage." />
        <FileInput id="video" name="video" label="Video (optional)" accept="video/mp4,video/quicktime,video/webm" hint="One MP4, MOV or WebM video up to 50 MB — e.g. a short clip of it being played." />
      </fieldset>
      <Checkbox id="privacy" name="privacy" required label={<>I confirm I own this item, and I agree to the <Link href="/policies/sell-terms" className="link" target="_blank">purchase enquiry terms</Link> and <Link href="/policies/privacy" className="link" target="_blank">privacy notice</Link>. My photos are stored privately and used only to assess this item.</>} />
    </UploadForm>
  );
}
