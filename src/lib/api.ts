import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, isSameOrigin, jsonError } from "./http";
import { rateLimit } from "./rate-limit";
import { fieldErrors, looksLikeSpam } from "./validation";
import { UploadError } from "./images";

/** Converts FormData into a plain object; repeated keys become arrays. */
export function formToObject(fd: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (v instanceof File) continue;
    if (arrays.includes(k)) {
      (out[k] = (out[k] as string[]) ?? []);
      (out[k] as string[]).push(v);
    } else out[k] = v;
  }
  for (const a of arrays) out[a] ??= [];
  return out;
}

/**
 * Shared guard for public form endpoints: same-origin check (CSRF), per-client
 * rate limit, honeypot spam check, and consistent error responses.
 */
export async function publicFormHandler(
  req: Request,
  opts: { bucket: string; limit: number; windowSeconds: number },
  handler: (form: FormData) => Promise<Response>,
): Promise<Response> {
  if (!isSameOrigin(req)) return jsonError("Invalid request origin.", 403);
  if (!(await rateLimit(`${opts.bucket}:${await clientKey()}`, opts.limit, opts.windowSeconds))) {
    return jsonError("Too many attempts. Please wait a few minutes and try again, or contact us on WhatsApp.", 429);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("The form could not be read. If you attached photos, try fewer or smaller ones.", 400);
  }
  if (looksLikeSpam(form)) return jsonError("Your submission could not be accepted. Please try again.", 400);
  try {
    return await handler(form);
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError("Please check the highlighted fields.", 422, fieldErrors(err));
    if (err instanceof UploadError) return jsonError(err.message, 422, { photos: err.message });
    if (err instanceof UserError) return jsonError(err.message, err.status);
    console.error(`[${opts.bucket}]`, err);
    return jsonError("Something went wrong on our side. Please try again, or contact us on WhatsApp.", 500);
  }
}

export class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...data });
