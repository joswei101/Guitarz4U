import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { expireStaleReservations } from "@/lib/shop/inventory";
import { cleanupRateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Periodic housekeeping (call every 5–10 minutes from a scheduler):
 * expires checkout reservations, removes expired sessions/tokens and old rate-limit rows.
 * Requires "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: Request) {
  const secret = env().CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new NextResponse("Unauthorized", { status: 401 });
  const now = new Date();
  const [expired, limits, sessions, tokens] = await Promise.all([
    expireStaleReservations(now),
    cleanupRateLimits(),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }).then((r) => r.count),
    prisma.authToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86400000) } } }).then((r) => r.count),
  ]);
  logger.info("Maintenance run", { expired, limits, sessions, tokens });
  return NextResponse.json({ ok: true, expiredReservations: expired, rateLimitRows: limits, sessions, tokens });
}

export const POST = GET;
