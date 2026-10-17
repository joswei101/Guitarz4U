import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

const control =
  "rounded-md border border-ink-400 bg-ink-800 px-3 py-2.5 text-bone placeholder:text-bone-dim focus:border-amp focus:outline-none focus:ring-2 focus:ring-amp/40 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Field({ label, htmlFor, hint, error, required, children, className }: { label: string; htmlFor: string; hint?: ReactNode; error?: string | string[]; required?: boolean; children: ReactNode; className?: string }) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-bone">
        {label}
        {required && <span className="ml-0.5 text-amp" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !msg && <p id={`${htmlFor}-hint`} className="text-xs text-bone-dim">{hint}</p>}
      {msg && <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">{msg}</p>}
    </div>
  );
}

/** Controls are full-width unless the caller sets an explicit width class. */
const width = (className?: string) => (className && /(^|\s)(sm:|md:)?w-/.test(className) ? "" : "w-full");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, width(className), className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, width(className), "min-h-28", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, width(className), "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23B5B5B5%22><path d=%22M5 7l5 6 5-6z%22/></svg>')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, id, className, ...props }: ComponentProps<"input"> & { label: ReactNode; id: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input id={id} type="checkbox" className="mt-1 h-4 w-4 shrink-0 rounded border-ink-400 bg-ink-800 accent-amp" {...props} />
      <label htmlFor={id} className="text-sm text-bone-muted">{label}</label>
    </div>
  );
}
