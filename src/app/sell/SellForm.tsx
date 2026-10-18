"use client";
import Link from "next/link";
import { useState } from "react";
import { Field, FormStatus, SpamTrap, inputProps, useSubmit } from "@/components/forms";
import { ImagePicker } from "@/components/ImagePicker";
import { CONDITIONS, WORKS_OPTIONS } from "@/lib/format";

export function SellForm({ categories, defaults }: { categories: { id: number; name: string }[]; defaults?: { name?: string; email?: string } }) {
  const { pending, error, fieldErrors: fe, submit } = useSubmit<{ reference: string }>("/api/seller-submissions");
  const [photos, setPhotos] = useState<File[]>([]);
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div className="card stack" role="status" data-testid="seller-success">
        <h2>Thank you — submission received</h2>
        <p>Your reference number is <strong>{done}</strong>. Guitarz4U will review your guitar personally and contact you. This is not an offer or a promise to buy.</p>
        <div className="row">
          <Link className="btn btn-primary" href={`/track?ref=${done}`}>Track this submission</Link>
          <Link className="btn btn-outline" href="/shop">Browse the shop</Link>
        </div>
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
      <h2 style={{ marginBottom: 0 }}>Tell us about your guitar</h2>
      <FormStatus error={error} />
      <fieldset>
        <legend className="label">Your details</legend>
        <div className="form-grid">
          <Field label="Your name" name="name" required error={fe.name}>
            <input type="text" {...inputProps("name", fe)} required autoComplete="name" defaultValue={defaults?.name} maxLength={120} />
          </Field>
          <Field label="Contact number" name="phone" required error={fe.phone}>
            <input type="tel" {...inputProps("phone", fe)} required autoComplete="tel" maxLength={30} placeholder="e.g. 082 123 4567" />
          </Field>
          <Field label="Email address (optional)" name="email" error={fe.email} full>
            <input type="email" {...inputProps("email", fe)} autoComplete="email" defaultValue={defaults?.email} maxLength={200} />
          </Field>
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">The guitar</legend>
        <div className="form-grid">
          <Field label="Brand" name="brand" required error={fe.brand}>
            <input type="text" {...inputProps("brand", fe)} required maxLength={80} placeholder="e.g. Fender" />
          </Field>
          <Field label="Model" name="model" error={fe.model}>
            <input type="text" {...inputProps("model", fe)} maxLength={120} placeholder="e.g. Player Stratocaster" />
          </Field>
          <Field label="Type of guitar" name="categoryId" required error={fe.categoryId}>
            <select {...inputProps("categoryId", fe)} required defaultValue="">
              <option value="" disabled>Choose…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Overall condition" name="condition" required error={fe.condition}>
            <select {...inputProps("condition", fe)} required defaultValue="">
              <option value="" disabled>Choose…</option>
              {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Does it work?" name="works" required error={fe.works}>
            <select {...inputProps("works", fe)} required defaultValue="">
              <option value="" disabled>Choose…</option>
              {Object.entries(WORKS_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Asking price in rand (optional)" name="askingPrice" error={fe.askingPrice} hint="Leave blank if you would like an offer.">
            <input type="text" inputMode="decimal" {...inputProps("askingPrice", fe, true)} maxLength={20} placeholder="e.g. 4500" />
          </Field>
          <Field label="Faults, damage or missing parts" name="faults" error={fe.faults} full>
            <textarea {...inputProps("faults", fe)} maxLength={4000} rows={4} placeholder="e.g. crackling volume pot, chip on the headstock, missing tremolo arm" />
          </Field>
          <Field label="Anything else? (optional)" name="notes" error={fe.notes} full>
            <textarea {...inputProps("notes", fe)} maxLength={4000} rows={3} placeholder="History, upgrades, case included, etc." />
          </Field>
        </div>
      </fieldset>
      <ImagePicker onChange={setPhotos} max={8} error={fe.photos} label="Photos of the guitar (recommended)" />
      <label className="check">
        <input type="checkbox" name="notLoosePart" required />
        <span>This is a complete guitar or a repairable/incomplete guitar — not loose parts on their own.</span>
      </label>
      {fe.notLoosePart && <span className="field-error" role="alert">{fe.notLoosePart}</span>}
      <label className="check">
        <input type="checkbox" name="privacyAck" required />
        <span>I agree that Guitarz4U may store these details and photos to assess my guitar and contact me, as described in the <Link href="/privacy" target="_blank">privacy policy</Link>.</span>
      </label>
      {fe.privacyAck && <span className="field-error" role="alert">{fe.privacyAck}</span>}
      <SpamTrap />
      <button className="btn btn-primary" disabled={pending} data-testid="seller-submit">{pending ? "Uploading…" : "Submit my guitar"}</button>
    </form>
  );
}
