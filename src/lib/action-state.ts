import type { z } from 'zod';

/** Result returned by server actions to the forms that called them. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  data?: Record<string, unknown>;
};

export const initialState: ActionState = {};

/** Converts form data to plain strings so the form can be re-filled after an error. */
export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string' && !k.startsWith('$') && k !== 'website' && k !== 'cf-turnstile-response') {
      out[k] = out[k] ? `${out[k]},${v}` : v;
    }
  }
  return out;
}

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(fd: FormData, error: z.ZodError): ActionState {
  return {
    error: 'Please correct the highlighted fields.',
    fieldErrors: zodFieldErrors(error),
    values: formValues(fd),
  };
}

/** Turns a database error into a safe, friendly message (no internal details). */
export function friendlyDbError(err: { message?: string; code?: string } | null | undefined, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  // P0001 = our own business-rule messages, written for customers.
  if (err.code === 'P0001' && err.message) return err.message.slice(0, 300);
  if (err.code === '23505') return 'That has already been recorded.';
  if (err.code === '42501') return 'You do not have permission to do that.';
  console.error('Database error', err.code, err.message);
  return fallback;
}
