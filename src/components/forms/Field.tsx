import { useId } from "react";

type Common = { label: string; name: string; error?: string; hint?: string; required?: boolean; className?: string };

export function Field({
  label,
  name,
  error,
  hint,
  required,
  className = "",
  ...props
}: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {required && <span aria-hidden className="text-danger">*</span>}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className="input"
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  name,
  error,
  hint,
  required,
  className = "",
  ...props
}: Common & React.ComponentProps<"textarea">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {required && <span aria-hidden className="text-danger">*</span>}
      </label>
      <textarea
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className="textarea"
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  name,
  error,
  hint,
  required,
  className = "",
  options,
  placeholder,
  ...props
}: Common & {
  options: readonly { value: string | number; label: string }[];
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label} {required && <span aria-hidden className="text-danger">*</span>}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className="select"
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  label,
  name,
  error,
  className = "",
  ...props
}: { label: React.ReactNode; name: string; error?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input id={id} type="checkbox" name={name} className="checkbox" aria-invalid={error ? true : undefined} {...props} />
        <label htmlFor={id} className="text-sm leading-relaxed">
          {label}
        </label>
      </div>
      {error && <p className="field-error ml-8">{error}</p>}
    </div>
  );
}

/** Hidden field that bots tend to fill in; submissions with a value are rejected. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
