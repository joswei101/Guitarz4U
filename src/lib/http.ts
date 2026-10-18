import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "./env";
import { UserError } from "./errors";
import { logger } from "./logger";

/** Best-effort client IP (behind Vercel/most proxies the first X-Forwarded-For entry is the client). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function ipFromRequest(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * CSRF protection for state-changing route handlers: the request must originate from this site.
 * (Server Actions get the equivalent check from Next.js automatically.)
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const allowed = new Set<string>([new URL(env().APP_URL).host]);
  if (host) allowed.add(host);
  if (!origin) throw new UserError("Missing request origin.", 403);
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new UserError("Invalid request origin.", 403);
  }
  if (!allowed.has(originHost)) throw new UserError("Cross-site request blocked.", 403);
}

/** Converts thrown errors into safe JSON responses for route handlers. */
export function jsonError(err: unknown): NextResponse {
  if (err instanceof UserError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
  logger.error("Unhandled route error", { err });
  return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
}
