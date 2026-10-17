"use client";

import Link from "next/link";
import { UploadForm } from "./upload-form";
import { FileInput } from "./file-input";
import { Checkbox, Field, Input, Select, Textarea } from "../ui/form";
import { Alert } from "../ui/misc";
import { ButtonLink } from "../ui/button";

export function RepairForm({ instruments, services, defaults, preselect }: { instruments: readonly string[]; services: readonly string[]; defaults?: { name?: string; email?: string; phone?: string }; preselect?: string }) {
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return (
    <UploadForm
      endpoint="/api/repairs"
      submitLabel="Submit repair request"
      success={(ref) => (
        <div className="space-y-5">
          <Alert tone="ok" title="Repair request received">
            Your reference is <strong>{ref}</strong>. The owner will review your request and let you know whether it can be accepted for assessment. No payment is due now — you&apos;ll receive a quote to approve before any work starts.
          </Alert>
          <div className="flex flex-wrap gap-3"><ButtonLink href={`/repairs/track?ref=${ref}`}>Track this repair</ButtonLink><ButtonLink href="/account/repairs" variant="outline">My repairs</ButtonLink></div>
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
        <legend className="mb-2 font-display text-xl uppercase tracking-wide">The instrument</legend>
        <Field label="Instrument type" htmlFor="instrumentType" required>
          <Select id="instrumentType" name="instrumentType" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {instruments.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Brand" htmlFor="brand"><Input id="brand" name="brand" maxLength={80} /></Field>
        <Field label="Model" htmlFor="model"><Input id="model" name="model" maxLength={120} /></Field>
        <Field label="Describe the problem" htmlFor="problem" required className="sm:col-span-2" hint="What's wrong, when it started, anything you've already tried."><Textarea id="problem" name="problem" required minLength={10} maxLength={4000} /></Field>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-display text-xl uppercase tracking-wide">Requested service(s) <span className="text-amp">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s, i) => (
            <label key={s} htmlFor={`svc-${i}`} className="flex items-center gap-3 rounded-md border border-ink-500 px-3 py-2 text-sm text-bone-muted hover:border-amp">
              <input id={`svc-${i}`} type="checkbox" name="services" value={s} defaultChecked={s === preselect} className="h-4 w-4 accent-amp" /> {s}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-xl uppercase tracking-wide">Photos, video & timing</legend>
        <FileInput id="photos" name="photos" label="Photos (recommended, up to 8)" accept="image/jpeg,image/png,image/webp" multiple maxFiles={8} hint="JPEG, PNG or WebP, up to 10 MB each." />
        <FileInput id="video" name="video" label="Video (optional)" accept="video/mp4,video/quicktime,video/webm" hint="e.g. the buzz or crackle you're hearing. Max 50 MB." />
        <Field label="Preferred drop-off date (optional)" htmlFor="preferredDate" hint="We're closed on Saturdays. We'll confirm arrangements privately."><Input id="preferredDate" name="preferredDate" type="date" min={minDate} /></Field>
        <Field label="Preferred time / availability (optional)" htmlFor="preferredTimeNote"><Input id="preferredTimeNote" name="preferredTimeNote" maxLength={200} placeholder="e.g. weekday mornings" /></Field>
        <Field label="Other notes" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" maxLength={3000} className="min-h-20" /></Field>
      </fieldset>
      <Checkbox id="privacy" name="privacy" required label={<>I agree to the <Link href="/policies/repair-terms" className="link" target="_blank">repair terms</Link> and <Link href="/policies/privacy" className="link" target="_blank">privacy notice</Link>. I understand the owner must approve the job, that work only starts after I accept a quote, and that I pay for replacement parts listed on the quote.</>} />
    </UploadForm>
  );
}
