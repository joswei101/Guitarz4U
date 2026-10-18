"use client";
import Link from "next/link";
import { useState } from "react";
import { Field, FormStatus, SpamTrap, inputProps, useSubmit } from "@/components/forms";
import { ImagePicker } from "@/components/ImagePicker";
import { REPAIR_SERVICES } from "@/lib/format";

export function RepairForm({ categories, defaults }: { categories: { id: number; name: string }[]; defaults?: { name?: string; email?: string } }) {
  const { pending, error, fieldErrors: fe, submit } = useSubmit<{ reference: string }>("/api/repairs");
  const [photos, setPhotos] = useState<File[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (done) {
    return (
      <div className="card stack" role="status" data-testid="repair-success">
        <h2>Repair booking received</h2>
        <p>Your reference number is <strong>{done}</strong>. This is not a confirmed appointment yet — Guitarz4U will assess the work, send a quote and confirm a date with you personally.</p>
        <Link className="btn btn-primary" href={`/track?ref=${done}`}>Track this repair</Link>
      </div>
    );
  }

  return (
    <form
      className="card form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        photos.forEach((p) => fd.append("photos", p));
        const res = await submit(fd);
        if (res) setDone(res.reference);
      }}
    >
      <h2 style={{ marginBottom: 0 }}>Book a repair</h2>
      <FormStatus error={error} />
      <div className="form-grid">
        <Field label="Your name" name="name" required error={fe.name}>
          <input type="text" {...inputProps("name", fe)} required autoComplete="name" defaultValue={defaults?.name} maxLength={120} />
        </Field>
        <Field label="Contact number" name="phone" required error={fe.phone}>
          <input type="tel" {...inputProps("phone", fe)} required autoComplete="tel" maxLength={30} />
        </Field>
        <Field label="Email address" name="email" error={fe.email}>
          <input type="email" {...inputProps("email", fe)} autoComplete="email" defaultValue={defaults?.email} maxLength={200} />
        </Field>
        <Field label="Preferred contact" name="preferredContact" required error={fe.preferredContact}>
          <select {...inputProps("preferredContact", fe)} defaultValue="whatsapp">
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone call</option>
            <option value="email">Email</option>
          </select>
        </Field>
        <Field label="Guitar brand" name="brand" required error={fe.brand}>
          <input type="text" {...inputProps("brand", fe)} required maxLength={80} />
        </Field>
        <Field label="Guitar model" name="model" error={fe.model}>
          <input type="text" {...inputProps("model", fe)} maxLength={120} />
        </Field>
        <Field label="Type of guitar" name="categoryId" required error={fe.categoryId}>
          <select {...inputProps("categoryId", fe)} required defaultValue="">
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Preferred drop-off date" name="preferredDate" error={fe.preferredDate} hint="A request only — we confirm the date with you. Closed on Saturdays.">
          <input type="date" {...inputProps("preferredDate", fe, true)} min={today} />
        </Field>
      </div>
      <fieldset>
        <legend className="label">Work requested</legend>
        <div className="checks">
          {Object.entries(REPAIR_SERVICES).map(([k, v]) => (
            <label key={k} className="check"><input type="checkbox" name="services" value={k} /> {v}</label>
          ))}
        </div>
      </fieldset>
      <Field label="Describe the problem" name="problem" required error={fe.problem} full>
        <textarea {...inputProps("problem", fe)} required minLength={10} maxLength={4000} rows={5} placeholder="e.g. Buzzing on the low E string from the 5th fret, and the input jack cuts out." />
      </Field>
      <Field label="Additional notes (optional)" name="notes" error={fe.notes} full>
        <textarea {...inputProps("notes", fe)} maxLength={4000} rows={3} placeholder="String gauge preference, tuning, deadlines, etc." />
      </Field>
      <ImagePicker onChange={setPhotos} max={6} error={fe.photos} label="Photos of the problem (optional)" />
      <label className="check">
        <input type="checkbox" name="privacyAck" required />
        <span>I agree that Guitarz4U may store these details and photos to assess the repair and contact me, as described in the <Link href="/privacy" target="_blank">privacy policy</Link>.</span>
      </label>
      {fe.privacyAck && <span className="field-error" role="alert">{fe.privacyAck}</span>}
      <SpamTrap />
      <button className="btn btn-primary" disabled={pending} data-testid="repair-submit">{pending ? "Sending…" : "Send repair booking"}</button>
    </form>
  );
}
