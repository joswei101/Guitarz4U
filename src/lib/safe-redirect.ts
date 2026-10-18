/** Only allow redirects to paths on this site (prevents open-redirect attacks). */
export function safeNext(next: unknown, fallback = "/account") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next.slice(0, 300);
}
