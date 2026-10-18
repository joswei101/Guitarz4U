import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

/** Rejects cross-site form posts (CSRF protection for JSON/FormData API routes). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(message: string, status = 400, fieldErrors?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: message, fieldErrors }, { status });
}

/** A hashed client identifier for rate limiting — raw IP addresses are never stored. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-nf-client-connection-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(ip + (process.env.BETTER_AUTH_SECRET || "")).digest("hex").slice(0, 24);
}
