"use client";
/* eslint-disable @next/next/no-img-element */
import { useFormAction } from "@/components/forms/useFormAction";
import { useState, useTransition } from "react";
import { saveSettings } from "@/app/actions/admin";
import { Field, TextArea } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/client";
import { compressImage, publicImageUrl, randomFileName } from "@/lib/images";
import { REPAIR_SERVICES } from "@/lib/constants";

type Text = { key: string; label: string; value: string | null; placeholder: string; rows?: number; hint?: string };

/** One form per group of settings; empty = use the built-in default text. */
export function SettingsTextForm({ fields, title, description }: { fields: Text[]; title: string; description?: string }) {
  const { state, onSubmit, pending: submitting } = useFormAction(saveSettings);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div>
        <h2 className="text-xl">{title}</h2>
        {description && <p className="text-sm text-tan">{description}</p>}
      </div>
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      {fields.map((f) =>
        f.rows ? (
          <TextArea key={f.key} label={f.label} name={f.key} rows={f.rows} defaultValue={f.value ?? ""} placeholder={f.placeholder} hint={f.hint} error={e[f.key]} />
        ) : (
          <Field key={f.key} label={f.label} name={f.key} defaultValue={f.value ?? ""} placeholder={f.placeholder} hint={f.hint} error={e[f.key]} />
        ),
      )}
      <SubmitButton pending={submitting} pendingText="Saving…">Save</SubmitButton>
    </form>
  );
}

export function HeroImageForm({ current }: { current: string | null }) {
  const [path, setPath] = useState(current ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { state, onSubmit, pending: submitting } = useFormAction(saveSettings);
  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="text-xl">Home page photo</h2>
      <p className="text-sm text-tan">Upload a guitar photo you own or have permission to use. Without one, an illustration is shown.</p>
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      <img src={publicImageUrl(path, "site-assets") ?? "/hero-guitar.svg"} alt="Current home page image" className="h-56 w-44 rounded-md object-cover" />
      <input type="hidden" name="hero_image_path" value={path} />
      <div className="flex flex-wrap gap-2">
        <label className="btn btn-outline btn-sm cursor-pointer">
          {pending ? "Uploading…" : "Choose photo"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              start(async () => {
                try {
                  const { blob, type } = await compressImage(file, 1800, 0.85);
                  const p = `hero/${randomFileName(type)}`;
                  const { error } = await createClient().storage.from("site-assets").upload(p, blob, { contentType: type, cacheControl: "31536000" });
                  if (error) throw new Error(error.message);
                  setPath(p);
                  setMsg("Uploaded — click Save to use it.");
                } catch (err) {
                  setMsg((err as Error).message);
                }
              });
            }}
          />
        </label>
        {path && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPath("")}>Use illustration instead</button>}
        <SubmitButton pending={submitting} className="btn btn-primary btn-sm" pendingText="Saving…">Save</SubmitButton>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}

export function RepairPricesForm({ prices }: { prices: { service: string; price: string; note?: string }[] }) {
  const [rows, setRows] = useState(prices);
  const { state, onSubmit, pending: submitting } = useFormAction(saveSettings);
  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="text-xl">Repair prices (optional)</h2>
      <p className="text-sm text-tan">Leave empty to show “Quoted after assessment”. Anything you add is shown publicly — use wording like “From R350”.</p>
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      <input type="hidden" name="repair_prices_json" value={JSON.stringify(rows)} />
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
          <select aria-label="Service" className="select" value={r.service} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)))}>
            {REPAIR_SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input aria-label="Price" className="input" value={r.price} placeholder="From R350" maxLength={60} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
          <input aria-label="Note" className="input" value={r.note ?? ""} placeholder="Note (optional)" maxLength={200} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setRows([...rows, { service: "strings", price: "" }])}>Add price</button>
        <SubmitButton pending={submitting} className="btn btn-primary btn-sm" pendingText="Saving…">Save prices</SubmitButton>
      </div>
    </form>
  );
}
