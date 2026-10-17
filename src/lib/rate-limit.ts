import { prisma } from "./db";
import { UserError } from "./errors";

/**
 * Fixed-window rate limiter stored in PostgreSQL, so limits hold across server instances
 * and serverless invocations. Returns false when the limit is exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowEnds = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowEnds")
    VALUES (${key}, 1, ${windowEnds})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowEnds" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowEnds" = CASE WHEN "RateLimit"."windowEnds" < ${now} THEN ${windowEnds} ELSE "RateLimit"."windowEnds" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= limit;
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  if (!(await rateLimit(key, limit, windowSeconds))) {
    throw new UserError("Too many attempts. Please wait a few minutes and try again.", 429);
  }
}

export const limits = {
  login: { limit: 10, window: 15 * 60 },
  register: { limit: 5, window: 60 * 60 },
  passwordReset: { limit: 5, window: 60 * 60 },
  form: { limit: 8, window: 60 * 60 },
  upload: { limit: 20, window: 60 * 60 },
  review: { limit: 5, window: 24 * 60 * 60 },
  tracking: { limit: 20, window: 15 * 60 },
  checkout: { limit: 10, window: 15 * 60 },
} as const;

export async function cleanupRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimit.deleteMany({ where: { windowEnds: { lt: new Date() } } });
  return count;
}
