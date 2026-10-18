"use client";
import { useEffect, useId, useRef, useState } from "react";

export type SubmitState = {
  pending: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
};

/** Posts FormData (or JSON) to an API route and exposes pending/error state. */
export function useSubmit<T = Record<string, unknown>>(url: string, method = "POST") {
  const [state, setState] = useState<SubmitState>({ pending: false, error: null, fieldErrors: {} });
  async function submit(body: FormData | Record<string, unknown>): Promise<(T & { ok: true }) | null> {
    setState({ pending: true, error: null, fieldErrors: {} });
    try {
      const res = await fetch(url, {
        method,
        body: body instanceof FormData ? body : JSON.stringify(body),
        headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
      });
      const data = await res.json().catch(() => ({ ok: false, error: "Unexpected response from the server." }));
      if (!res.ok || !data.ok) {
        setState({ pending: false, error: data.error || "Something went wrong. Please try again.", fieldErrors: data.fieldErrors || {} });
        return null;
      }
      setState({ pending: false, error: null, fieldErrors: {} });
      return data;
    } catch {
      setState({ pending: false, error: "We could not reach the server. Please check your connection and try again.", fieldErrors: {} });
      return null;
    }
  }
  return { ...state, submit, setState };
}

export function Field({
  label,
  name,
  error,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`field${full ? " field-full" : ""}`}>
      <label htmlFor={name}>
        {label} {required && <span className="req" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <span className="hint" id={`${name}-hint`}>{hint}</span>}
      {error && <span className="field-error" id={`${name}-error`} role="alert">{error}</span>}
    </div>
  );
}

/** Props that wire an input to its label, hint and error message. */
export function inputProps(name: string, errors: Record<string, string>, hint?: boolean) {
  const described = [hint ? `${name}-hint` : "", errors[name] ? `${name}-error` : ""].filter(Boolean).join(" ");
  return {
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": described || undefined,
  } as const;
}

/** Honeypot field + timer used for basic spam protection on public forms. */
export function SpamTrap() {
  const [started, setStarted] = useState("");
  const id = useId();
  useEffect(() => setStarted(String(Date.now())), []);
  return (
    <>
      <div className="hp" aria-hidden="true">
        <label htmlFor={id}>Leave this field empty</label>
        <input id={id} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="startedAt" value={started} />
    </>
  );
}

export function FormStatus({ error }: { error: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div ref={ref} tabIndex={-1} className="form-status error" role="alert">
      {error}
    </div>
  );
}

export type ContactDefaults = { name?: string; email?: string; phone?: string; preferredContact?: string };

export function ContactFields({ errors, defaults, emailRequired = true }: { errors: Record<string, string>; defaults?: ContactDefaults; emailRequired?: boolean }) {
  return (
    <div className="form-grid">
      <Field label="Your name" name="name" required error={errors.name}>
        <input type="text" {...inputProps("name", errors)} required autoComplete="name" defaultValue={defaults?.name} maxLength={120} />
      </Field>
      <Field label="Email address" name="email" required={emailRequired} error={errors.email}>
        <input type="email" {...inputProps("email", errors)} required={emailRequired} autoComplete="email" defaultValue={defaults?.email} maxLength={200} />
      </Field>
      <Field label="Phone / WhatsApp number" name="phone" error={errors.phone} hint="Needed if you prefer WhatsApp or a call.">
        <input type="tel" {...inputProps("phone", errors, true)} autoComplete="tel" defaultValue={defaults?.phone} maxLength={30} placeholder="e.g. 082 123 4567" />
      </Field>
      <Field label="How should we contact you?" name="preferredContact" required error={errors.preferredContact}>
        <select {...inputProps("preferredContact", errors)} defaultValue={defaults?.preferredContact || "whatsapp"}>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="phone">Phone call</option>
        </select>
      </Field>
    </div>
  );
}
