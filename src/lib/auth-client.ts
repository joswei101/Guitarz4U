"use client";
import { createAuthClient } from "better-auth/react";

// Same-origin client; the server URL comes from the browser location.
export const authClient = createAuthClient();

/** Only allow redirects to paths on this site (prevents open-redirect abuse). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
