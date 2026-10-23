import type { ZodError } from "zod";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Optional data returned on success (e.g. a reference number). */
  data?: Record<string, string>;
  /** Changes on every submission so client components can react to repeats. */
  ts?: number;
};

export const initialState: ActionState = { ok: false };

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors, ts: Date.now() };
}

export function success(message?: string, data?: Record<string, string>): ActionState {
  return { ok: true, message, data, ts: Date.now() };
}

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Reads FormData into a plain object (multi-value keys become arrays). */
export function formToObject(formData: FormData, arrayKeys: string[] = []) {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).filter((v) => typeof v === "string") as string[];
    obj[key] = arrayKeys.includes(key) ? values : values[0];
  }
  for (const key of arrayKeys) if (!(key in obj)) obj[key] = [];
  return obj;
}

/** Honeypot check: bots tend to fill every field, humans never see this one. */
export function isBot(formData: FormData) {
  const trap = formData.get("company_website");
  return typeof trap === "string" && trap.trim().length > 0;
}
