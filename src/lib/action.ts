import { ZodError } from "zod";
import { AuthError, UserError, type ActionResult } from "./errors";
import { fieldErrors } from "./validation";
import { logger } from "./logger";

/** Wraps a server action body: converts known errors to user-safe results and logs the rest. */
export async function runAction<T>(fn: () => Promise<ActionResult<T> | void>): Promise<ActionResult<T>> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(err) };
    if (err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof UserError) return { ok: false, error: err.message };
    // Let Next.js redirects/notFound propagate.
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_")) throw err;
    logger.error("Server action failed", { err });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}
