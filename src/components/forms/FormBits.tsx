"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions";

export function SubmitButton({
  children,
  pendingText = "Please wait…",
  className = "btn btn-primary",
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} name={name} value={value}>
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={`rounded-lg px-4 py-3 text-sm ${state.ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}
    >
      {state.message}
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  state?: ActionState;
  hint?: string;
  required?: boolean;
  className?: string;
};

function describedBy(name: string, hint?: string, error?: string) {
  return [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
}

export function TextField({
  label,
  name,
  state,
  hint,
  required,
  className = "",
  ...input
}: FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  const error = state?.fieldErrors?.[name];
  return (
    <div className={`field ${className}`}>
      <label htmlFor={input.id ?? name} className="label">
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <input
        id={input.id ?? name}
        name={name}
        required={required}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        {...input}
      />
      {hint && (
        <p id={`${name}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  name,
  state,
  hint,
  required,
  className = "",
  ...input
}: FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const error = state?.fieldErrors?.[name];
  return (
    <div className={`field ${className}`}>
      <label htmlFor={input.id ?? name} className="label">
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={input.id ?? name}
        name={name}
        required={required}
        className="textarea"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        {...input}
      />
      {hint && (
        <p id={`${name}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  state,
  hint,
  required,
  className = "",
  options,
  placeholder,
  ...input
}: FieldProps & {
  options: { value: string; label: string }[];
  placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  const error = state?.fieldErrors?.[name];
  return (
    <div className={`field ${className}`}>
      <label htmlFor={input.id ?? name} className="label">
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <select
        id={input.id ?? name}
        name={name}
        required={required}
        className="select"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        {...input}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${name}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  state,
  required,
  ...input
}: { label: React.ReactNode; name: string; state?: ActionState; required?: boolean } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "type"
>) {
  const error = state?.fieldErrors?.[name];
  return (
    <div className="field">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name={name}
          required={required}
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-walnut)]"
          aria-invalid={error ? true : undefined}
          {...input}
        />
        <span>{label}</span>
      </label>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/** Invisible honeypot field for basic bot protection. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
